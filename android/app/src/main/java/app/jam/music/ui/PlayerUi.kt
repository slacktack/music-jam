package app.jam.music.ui

import android.app.Activity
import android.content.Intent
import android.content.pm.ActivityInfo
import android.view.ViewGroup
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.Fullscreen
import androidx.compose.material.icons.rounded.FullscreenExit
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material.icons.rounded.SkipPrevious
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import app.jam.music.Catalog
import app.jam.music.Floor
import app.jam.music.Jam
import app.jam.music.Kind
import app.jam.music.Likes
import app.jam.music.Pattern
import app.jam.music.Status
import app.jam.music.Track
import app.jam.music.hash
import kotlinx.coroutines.delay

// Polled position (ms) and duration (ms) of the current item.
@Composable
fun rememberProgress(): Pair<Long, Long> {
    var pos by remember { mutableLongStateOf(0L) }
    var dur by remember { mutableLongStateOf(0L) }
    LaunchedEffect(Unit) {
        while (true) {
            pos = Jam.exo.currentPosition.coerceAtLeast(0)
            dur = Jam.exo.duration.let { if (it > 0) it else (Jam.state.value.track?.duration ?: 0) * 1000 }
            delay(400)
        }
    }
    return pos to dur
}

@Composable
fun accentFor(t: Track?, context: String): Pair<Color, Color> {
    val c = if (t == null) Color(0xFFFF8A00) to Color(0xFFFF2D95) else Catalog.trackColors(t.id, context)
    val a by animateColorAsState(c.first, tween(1400), label = "a1")
    val b by animateColorAsState(c.second, tween(1400), label = "a2")
    return a to b
}

@Composable
fun MiniPlayer(onOpen: () -> Unit) {
    val p by Jam.state.collectAsState()
    val t = p.track ?: return
    val (a, b) = accentFor(t, p.context)
    val (pos, dur) = rememberProgress()
    Box(Modifier.padding(horizontal = 10.dp, vertical = 6.dp).fillMaxWidth().shadow(20.dp, RoundedCornerShape(20.dp), spotColor = a).clip(RoundedCornerShape(20.dp)).background(C.s2).clickable(onClick = onOpen)) {
        Box(Modifier.matchParentSize().background(Brush.horizontalGradient(listOf(a.copy(alpha = 0.28f), b.copy(alpha = 0.10f)))))
        Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Cover(t, Modifier.size(46.dp))
            Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                T(t.title, 15.sp, weight = FontWeight.Bold)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (p.status == Status.PLAYING && t.live) { LiveDot(); Gap(w = 6.dp) }
                    T(when (p.status) { Status.LOADING -> "Tuning in…"; Status.ERROR -> "Couldn't play · tap to retry"; else -> t.subtitle }, 12.5.sp, if (p.status == Status.ERROR) Color(0xFFFF6B6B) else C.mute)
                }
            }
            PlayButton(p.status, 44, Color.White, Color.Black)
            Icon(Icons.Rounded.SkipNext, "Next", Modifier.clip(CircleShape).clickable { Jam.skip(1) }.padding(8.dp).size(26.dp), tint = C.text)
        }
        if (t.kind == Kind.SONG && !t.live && dur > 0) Box(Modifier.align(Alignment.BottomStart).fillMaxWidth(pos.toFloat() / dur).height(2.dp).background(Brush.horizontalGradient(listOf(a, b))))
    }
}

@Composable
fun PlayButton(st: Status, size: Int, bg: Color, fg: Color) {
    Box(Modifier.size(size.dp).clip(CircleShape).background(bg).clickable { Jam.toggle() }, Alignment.Center) {
        when (st) {
            Status.LOADING -> CircularProgressIndicator(Modifier.size((size * 0.45).dp), color = fg, strokeWidth = 2.5.dp)
            Status.PLAYING -> Icon(Icons.Rounded.Pause, "Pause", tint = fg, modifier = Modifier.size((size * 0.55).dp))
            Status.ERROR -> Icon(Icons.Rounded.Refresh, "Retry", tint = fg, modifier = Modifier.size((size * 0.5).dp))
            else -> Icon(Icons.Rounded.PlayArrow, "Play", tint = fg, modifier = Modifier.size((size * 0.6).dp))
        }
    }
}

@Composable
fun VideoSurface(modifier: Modifier) {
    AndroidView(
        factory = { ctx ->
            PlayerView(ctx).apply {
                layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                setShowNextButton(false); setShowPreviousButton(false)
                setShutterBackgroundColor(android.graphics.Color.BLACK)
                player = Jam.exo
            }
        },
        modifier = modifier,
        onRelease = { it.player = null },
    )
}

@Composable
fun NowPlaying(onClose: () -> Unit) {
    val p by Jam.state.collectAsState()
    val f by Floor.state.collectAsState()
    val likes by Likes.list.collectAsState()
    val t = p.track ?: return
    val (a, b) = accentFor(t, p.context)
    val (pos, dur) = rememberProgress()
    var full by remember { mutableStateOf(false) }
    val act = LocalContext.current as Activity
    DisposableEffect(full) {
        act.requestedOrientation = if (full) ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE else ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        onDispose { act.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED }
    }
    if (full && t.video) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            VideoSurface(Modifier.fillMaxSize())
            Icon(Icons.Rounded.FullscreenExit, "Exit full screen", Modifier.align(Alignment.TopEnd).padding(16.dp).clip(CircleShape).background(Color(0x66000000)).clickable { full = false }.padding(10.dp), tint = Color.White)
        }
        return
    }
    val listeners = f.spots.firstOrNull { it.track.id == t.id }?.users?.filter { !it.me }.orEmpty()
    Box(Modifier.fillMaxSize().background(C.bg)) {
        FlowArt(Pattern.entries[(hash(t.id) % 6).toInt()], a to b, t.id, Modifier.fillMaxSize(), animate = p.status == Status.PLAYING)
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(C.bg.copy(alpha = 0.55f), C.bg.copy(alpha = 0.82f), C.bg))))
        Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().verticalScroll(rememberScrollState())) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.KeyboardArrowDown, "Close", Modifier.clip(CircleShape).clickable(onClick = onClose).padding(10.dp).size(28.dp), tint = C.text)
                Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                    Label(if (t.kind == Kind.RADIO) "Live radio" else if (t.video) "YouTube" else "Song", a)
                    T(p.context.ifEmpty { "Jam" }, 13.sp, C.mute)
                }
                Icon(Icons.Rounded.Share, "Share", Modifier.clip(CircleShape).clickable { share(act, t) }.padding(12.dp).size(22.dp), tint = C.text)
            }
            Gap(10.dp)
            if (t.video) {
                Box(Modifier.padding(horizontal = 12.dp).fillMaxWidth().aspectRatio(16 / 9f).clip(RoundedCornerShape(18.dp)).background(Color.Black)) {
                    VideoSurface(Modifier.fillMaxSize())
                    Icon(Icons.Rounded.Fullscreen, "Full screen", Modifier.align(Alignment.TopEnd).padding(8.dp).clip(CircleShape).background(Color(0x66000000)).clickable { full = true }.padding(8.dp), tint = Color.White)
                }
            } else {
                Box(Modifier.padding(horizontal = 34.dp).fillMaxWidth().aspectRatio(1f).shadow(40.dp, RoundedCornerShape(28.dp), spotColor = a, ambientColor = b)) {
                    Cover(t, Modifier.fillMaxSize(), RoundedCornerShape(28.dp), hq = true)
                    if (t.live && t.kind == Kind.RADIO) Row(Modifier.align(Alignment.TopStart).padding(14.dp).clip(RoundedCornerShape(50)).background(Color(0x99000000)).padding(horizontal = 10.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                        LiveDot(); Gap(w = 6.dp); Label("On air", Color.White)
                    }
                }
            }
            Gap(24.dp)
            Row(Modifier.padding(horizontal = 24.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    T(t.title, 26.sp, family = Display, weight = FontWeight.SemiBold, lines = 2, lineHeight = 30.sp)
                    T(t.subtitle, 15.sp, C.mute)
                }
                val liked = likes.any { it.id == t.id }
                Icon(if (liked) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder, "Like", Modifier.clip(CircleShape).clickable { Likes.toggle(t) }.padding(10.dp).size(28.dp), tint = if (liked) a else C.text)
            }
            Gap(14.dp)
            if (t.kind == Kind.SONG && !t.live && dur > 0) {
                var drag by remember { mutableFloatStateOf(-1f) }
                Slider(
                    value = if (drag >= 0) drag else (pos.toFloat() / dur).coerceIn(0f, 1f),
                    onValueChange = { drag = it }, onValueChangeFinished = { Jam.seek((drag * dur).toLong()); drag = -1f },
                    modifier = Modifier.padding(horizontal = 18.dp),
                    colors = SliderDefaults.colors(thumbColor = Color.White, activeTrackColor = a, inactiveTrackColor = Color(0x22FFFFFF)),
                )
                Row(Modifier.padding(horizontal = 24.dp)) {
                    Label(fmt(((if (drag >= 0) drag * dur else pos.toFloat()) / 1000).toLong()), C.mute); Box(Modifier.weight(1f)); Label(fmt(dur / 1000), C.mute)
                }
            } else Row(Modifier.padding(horizontal = 24.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                if (p.status == Status.PLAYING) LiveDot() else Box(Modifier.size(7.dp).clip(CircleShape).background(C.faint))
                Gap(w = 10.dp)
                DotWord(when (p.status) { Status.PLAYING -> "LIVE"; Status.LOADING -> "TUNING"; Status.ERROR -> "OFF AIR"; else -> "PAUSED" }, 14.dp, if (p.status == Status.PLAYING) Color(0xFF2BD94A) else C.mute, glow = p.status == Status.PLAYING)
                Gap(w = 10.dp)
                DotWord(if (t.kind == Kind.RADIO) "RADIO" else "STREAM", 14.dp, C.faint)
                Box(Modifier.weight(1f)); Eq(a, p.status == Status.PLAYING)
            }
            Gap(10.dp)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.SkipPrevious, "Previous", Modifier.clip(CircleShape).clickable { Jam.skip(-1) }.padding(12.dp).size(38.dp), tint = C.text)
                Box(Modifier.size(124.dp), Alignment.Center) {
                    PlayOrbit(a, p.status == Status.PLAYING, 124.dp)
                    Box(Modifier.shadow(30.dp, CircleShape, spotColor = a)) { PlayButton(p.status, 84, Color.White, Color.Black) }
                }
                Icon(Icons.Rounded.SkipNext, "Next", Modifier.clip(CircleShape).clickable { Jam.skip(1) }.padding(12.dp).size(38.dp), tint = C.text)
            }
            Gap(22.dp)
            Row(Modifier.padding(horizontal = 18.dp).fillMaxWidth().glass(RoundedCornerShape(26.dp)).padding(horizontal = 6.dp, vertical = 4.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                Floor.REACTIONS.forEach { (g, c) -> Box(Modifier.clip(CircleShape).clickable { Floor.react(g) }.padding(12.dp)) { DotGlyph(g, c, 26.dp, pulse = p.status == Status.PLAYING) } }
            }
            if (listeners.isNotEmpty()) {
                Gap(14.dp)
                Row(Modifier.padding(horizontal = 24.dp), verticalAlignment = Alignment.CenterVertically) {
                    listeners.take(5).forEach { Box(Modifier.padding(end = 4.dp)) { Avatar(it.id, it.color, 26) } }
                    Gap(w = 6.dp)
                    T(if (listeners.size == 1) "${listeners[0].name} is listening with you" else "${listeners.size} listening with you", 13.sp, C.mute)
                }
            }
            val q = p.queue
            val i = q.indexOfFirst { it.id == t.id }
            if (q.size > 1) {
                Gap(22.dp)
                SectionHead(null, "Up next")
                val next = (1..minOf(8, q.size - 1)).map { q[(i + it).mod(q.size)] }
                next.forEach { TrackRow(it, q, p.context) }
            }
            Gap(30.dp)
        }
    }
}

private fun share(act: Activity, t: Track) {
    val text = if (t.kind == Kind.SONG) "${t.title} · ${t.subtitle}\nhttps://youtu.be/${t.url}" else "${t.title} live on Jam radio\n${t.url}"
    act.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text), "Share"))
}
