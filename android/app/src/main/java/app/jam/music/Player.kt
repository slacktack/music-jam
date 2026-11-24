package app.jam.music

import android.app.Application
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.ForwardingPlayer
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.source.MergingMediaSource
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class JamApp : Application() {
    override fun onCreate() {
        super.onCreate()
        YouTube.init()
        Likes.init(this)
        Jam.init(this)
        Floor.start(this)
    }
}

enum class Status { IDLE, LOADING, PLAYING, PAUSED, ERROR }

data class PState(
    val track: Track? = null,
    val queue: List<Track> = emptyList(),
    val context: String = "",
    val status: Status = Status.IDLE,
    val at: Long = 0, // songs: epoch ms of position 0, shared on the floor for synced joins
) {
    val live get() = status == Status.PLAYING || status == Status.LOADING
}

object Toasts {
    val msg = MutableStateFlow<Pair<Long, String>?>(null)
    fun show(s: String) { msg.value = System.nanoTime() to s }
}

object Jam {
    lateinit var exo: ExoPlayer
    private val _s = MutableStateFlow(PState())
    val state = _s.asStateFlow()
    private val scope = MainScope()
    private var token = 0
    private var songErrors = 0
    private var retried = ""
    private var pausedAt = 0L
    private lateinit var progressive: ProgressiveMediaSource.Factory

    fun init(app: Application) {
        val http = DefaultHttpDataSource.Factory().setUserAgent(UA).setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(10_000).setReadTimeoutMs(20_000)
        progressive = ProgressiveMediaSource.Factory(http)
        exo = ExoPlayer.Builder(app)
            .setMediaSourceFactory(DefaultMediaSourceFactory(app).setDataSourceFactory(http))
            .setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(), true)
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(C.WAKE_MODE_NETWORK)
            .build()
        exo.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                if (isPlaying) { songErrors = 0; set(Status.PLAYING) }
                else if (!exo.playWhenReady && _s.value.status != Status.ERROR && _s.value.status != Status.IDLE) set(Status.PAUSED)
            }

            override fun onPlaybackStateChanged(st: Int) {
                when (st) {
                    Player.STATE_BUFFERING -> if (exo.playWhenReady) set(Status.LOADING)
                    Player.STATE_ENDED -> if (_s.value.track?.kind == Kind.SONG) skip(1) else fail("went off air")
                    else -> {}
                }
            }

            override fun onPlayerError(error: PlaybackException) {
                val t = _s.value.track ?: return
                if (t.kind == Kind.SONG && retried != t.id) {
                    // Stream URLs expire; resolve once more before giving up.
                    retried = t.id
                    YouTube.forget(t.url)
                    play(t, at = System.currentTimeMillis() - exo.currentPosition)
                    return
                }
                if (t.kind == Kind.SONG && ++songErrors < 4 && _s.value.queue.size > 1) {
                    Toasts.show("${t.title} won't play. Skipping."); skip(1)
                } else fail(if (t.kind == Kind.RADIO) "is off air right now. Try another station." else "couldn't play.")
            }
        })
    }

    private fun set(st: Status) { if (_s.value.status != st) _s.value = _s.value.copy(status = st) }

    private fun fail(why: String) {
        if (_s.value.status == Status.ERROR) return
        set(Status.ERROR)
        _s.value.track?.let { Toasts.show("${it.title} $why") }
    }

    private fun item(t: Track, uri: String, hls: Boolean): MediaItem {
        val art = if (t.kind == Kind.SONG) YouTube.thumb(t.url, "hq") else t.art
        val md = MediaMetadata.Builder().setTitle(t.title).setArtist(t.subtitle).setAlbumTitle(_s.value.context.ifEmpty { "Jam" })
            .apply { if (art.isNotEmpty()) setArtworkUri(Uri.parse(art)) }.build()
        return MediaItem.Builder().setUri(uri).setMediaId(t.id).setMediaMetadata(md)
            .apply { if (hls) setMimeType(MimeTypes.APPLICATION_M3U8) }.build()
    }

    fun play(track: Track, queue: List<Track>? = null, context: String? = null, at: Long = 0) {
        val my = ++token
        if (retried != track.id) retried = ""
        _s.value = _s.value.copy(track = track, status = Status.LOADING, queue = queue ?: _s.value.queue, context = context ?: _s.value.context, at = 0)
        exo.stop()
        if (track.kind == Kind.RADIO) {
            scope.launch { Radio.reportClick(track.id) }
            exo.setMediaItem(item(track, track.url, track.hls || Regex("\\.m3u8(\\?|$)", RegexOption.IGNORE_CASE).containsMatchIn(track.url)))
            exo.prepare(); exo.play()
            return
        }
        scope.launch {
            val s = runCatching { YouTube.stream(track.url) }.getOrElse {
                if (my != token) return@launch
                if (++songErrors < 4 && _s.value.queue.size > 1) { Toasts.show("${track.title} won't play. Skipping."); skip(1) }
                else fail("couldn't load. Check your connection.")
                return@launch
            }
            if (my != token) return@launch
            val dur = if (s.duration > 0) s.duration else track.duration
            val max = dur - 8
            val start = if (at > 0 && max > 0) ((System.currentTimeMillis() - at) / 1000).coerceIn(0, max) else 0
            val it = item(track, s.url, s.hls)
            if (track.video && s.video != null && !s.hls) {
                val v = progressive.createMediaSource(it.buildUpon().setUri(s.video).build())
                exo.setMediaSource(if (s.muxed) v else MergingMediaSource(v, progressive.createMediaSource(it)), start * 1000)
            } else exo.setMediaItem(it, start * 1000)
            exo.prepare(); exo.play()
            _s.value = _s.value.copy(at = System.currentTimeMillis() - start * 1000)
        }
    }

    fun toggle() {
        val s = _s.value
        val t = s.track ?: return
        when {
            s.status == Status.ERROR || s.status == Status.IDLE -> play(t)
            exo.playWhenReady -> { exo.pause(); pausedAt = System.currentTimeMillis(); set(Status.PAUSED) }
            else -> {
                // Live radio: jump back to the live edge instead of playing stale buffer.
                if (t.kind == Kind.RADIO && System.currentTimeMillis() - pausedAt > 20_000) { play(t); return }
                exo.play(); set(Status.LOADING)
            }
        }
    }

    fun skip(dir: Int) {
        val s = _s.value
        if (s.queue.isEmpty()) return
        val i = s.track?.let { t -> s.queue.indexOfFirst { it.id == t.id } } ?: -1
        play(s.queue[Math.floorMod(i + dir, s.queue.size)])
    }

    fun seek(ms: Long) {
        if (_s.value.track?.kind != Kind.SONG) return
        exo.seekTo(ms)
        _s.value = _s.value.copy(at = System.currentTimeMillis() - ms)
    }

    // What the notification and lock screen drive: skip goes through our queue.
    fun sessionPlayer(): Player = object : ForwardingPlayer(exo) {
        private val extra = listOf(COMMAND_SEEK_TO_NEXT, COMMAND_SEEK_TO_PREVIOUS, COMMAND_SEEK_TO_NEXT_MEDIA_ITEM, COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM)
        override fun getAvailableCommands(): Player.Commands = super.getAvailableCommands().buildUpon().addAll(*extra.toIntArray()).build()
        override fun isCommandAvailable(command: Int) = command in extra || super.isCommandAvailable(command)
        override fun seekToNext() = skip(1)
        override fun seekToNextMediaItem() = skip(1)
        override fun seekToPrevious() = skip(-1)
        override fun seekToPreviousMediaItem() = skip(-1)
        override fun play() { if (_s.value.status == Status.ERROR || _s.value.status == Status.PAUSED) toggle() else super.play() }
        override fun pause() { if (exo.playWhenReady) toggle() }
    }
}

class PlaybackService : MediaSessionService() {
    private var session: MediaSession? = null

    override fun onCreate() {
        super.onCreate()
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        session = MediaSession.Builder(this, Jam.sessionPlayer()).setSessionActivity(open).build().also { addSession(it) }
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo) = session

    override fun onTaskRemoved(rootIntent: Intent?) {
        if (!Jam.exo.playWhenReady) stopSelf()
    }

    override fun onDestroy() {
        session?.release()
        session = null
        super.onDestroy()
    }
}
