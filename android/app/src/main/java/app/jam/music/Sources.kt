package app.jam.music

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException
import org.schabi.newpipe.extractor.localization.ContentCountry
import org.schabi.newpipe.extractor.localization.Localization
import org.schabi.newpipe.extractor.services.youtube.linkHandler.YoutubeSearchQueryHandlerFactory
import org.schabi.newpipe.extractor.stream.StreamInfo
import org.schabi.newpipe.extractor.stream.StreamInfoItem
import org.schabi.newpipe.extractor.stream.StreamType
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

const val UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0"

object Net {
    val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS).readTimeout(15, TimeUnit.SECONDS)
        .pingInterval(30, TimeUnit.SECONDS).build()
}

object Radio {
    private val hosts = listOf("de1.api.radio-browser.info", "de2.api.radio-browser.info", "all.api.radio-browser.info")
    @Volatile private var good: String? = null
    private val cache = ConcurrentHashMap<String, List<Track>>()
    private val playable = Regex("^(mp3|aac|aac\\+|ogg|opus|flac)", RegexOption.IGNORE_CASE)
    private val base = mapOf("hidebroken" to "true", "is_https" to "true", "limit" to "50")

    private fun api(path: String, params: Map<String, String>): JSONArray {
        val order = good?.let { g -> listOf(g) + hosts.filter { it != g } } ?: hosts
        var last: Exception? = null
        for (host in order) {
            try {
                val url = "https://$host$path".toHttpUrl().newBuilder().apply { params.forEach { (k, v) -> addQueryParameter(k, v) } }.build()
                Net.http.newCall(okhttp3.Request.Builder().url(url).header("User-Agent", "Jam/1.0").build()).execute().use { r ->
                    if (!r.isSuccessful) throw Exception("HTTP ${r.code}")
                    good = host
                    return JSONArray(r.body!!.string())
                }
            } catch (e: Exception) { last = e }
        }
        throw last ?: Exception("radio")
    }

    private fun toTrack(r: org.json.JSONObject): Track? {
        val url = r.optString("url_resolved").ifEmpty { r.optString("url") }
        // Names are user-submitted and often padded with junk like "# - ---> ".
        val title = r.optString("name").replace(Regex("^[^\\p{L}\\p{N}]+"), "").replace(Regex("\\s+"), " ").trim().take(80)
        val hls = r.optInt("hls") == 1
        val codec = r.optString("codec")
        if (!url.startsWith("https://") || title.isEmpty()) return null
        if (!hls && codec.isNotEmpty() && !playable.containsMatchIn(codec)) return null
        val tags = r.optString("tags").split(",").map { it.trim() }.filter { it.isNotEmpty() }.take(3).joinToString(" · ")
        val fav = r.optString("favicon")
        return Track(
            r.optString("stationuuid"), Kind.RADIO, title, tags.ifEmpty { r.optString("country").ifEmpty { "Live radio" } },
            url, if (fav.startsWith("https://")) fav else "", live = true, hls = hls,
        )
    }

    suspend fun stations(queries: List<Query>): List<Track> = withContext(Dispatchers.IO) {
        val key = queries.toString()
        cache[key]?.let { return@withContext it }
        val lists = coroutineScope { queries.map { q -> async { runCatching { api("/json/stations/search", base + q) } } }.awaitAll() }
        val ok = lists.mapNotNull { it.getOrNull() }
        if (ok.isEmpty()) throw lists.first().exceptionOrNull()!!
        // Interleave so every query gets a fair share at the top, and de-dupe.
        val out = mutableListOf<Track>()
        val seen = HashSet<String>()
        for (i in 0 until ok.maxOf { it.length() }) for (l in ok) {
            if (i >= l.length()) continue
            val s = toTrack(l.getJSONObject(i)) ?: continue
            val k = s.title.lowercase().replace(Regex("[^\\p{L}\\p{N}]"), "")
            if (s.id in seen || k in seen || s.url in seen) continue
            seen += s.id; seen += k; seen += s.url
            out += s
        }
        out.take(90).also { cache[key] = it }
    }

    suspend fun search(term: String): List<Track> {
        val t = term.lowercase()
        val top = mapOf("order" to "clickcount", "reverse" to "true")
        return stations(listOf(top + ("name" to term), top + ("tag" to t), top + ("language" to t)))
    }

    // Directory etiquette: report a play (feeds their trending data).
    suspend fun reportClick(id: String) = withContext(Dispatchers.IO) {
        if (Regex("^[0-9a-f-]{36}$").matches(id)) runCatching { api("/json/url/$id", emptyMap()) }
    }
}

private object PipeDownloader : Downloader() {
    override fun execute(request: Request): Response {
        val method = request.httpMethod()
        val body = request.dataToSend()?.toRequestBody() ?: if (method == "POST") ByteArray(0).toRequestBody() else null
        val b = okhttp3.Request.Builder().url(request.url()).method(method, body).header("User-Agent", UA)
        request.headers().forEach { (k, vs) -> b.removeHeader(k); vs.forEach { b.addHeader(k, it) } }
        Net.http.newCall(b.build()).execute().use { r ->
            if (r.code == 429) throw ReCaptchaException("rate limited", request.url())
            return Response(r.code, r.message, r.headers.toMultimap(), r.body?.string(), r.request.url.toString())
        }
    }
}

object YouTube {
    private val cache = ConcurrentHashMap<String, List<Track>>()
    private val streams = ConcurrentHashMap<String, Pair<Long, Stream>>()

    data class Stream(val url: String, val hls: Boolean, val duration: Long, val video: String? = null, val muxed: Boolean = false)

    fun forget(id: String) { streams.remove(id) }

    fun init() = NewPipe.init(PipeDownloader, Localization("en", "IN"), ContentCountry("IN"))

    private val emoji = Regex("[\\p{So}\\p{Cn}\\u200d\\ufe0f\\u20e3]|[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF]")
    fun noEmoji(t: String) = t.replace(emoji, "").replace(Regex("\\s+"), " ").trim()

    // "Kesariya - Full Song | Brahmastra | Arijit Singh" -> "Kesariya"
    fun cleanTitle(t: String): String {
        val s = noEmoji(t)
            .replace(Regex("\\[[^\\]]*\\]|\\((?:official|full|lyric|lyrical|video|audio|hd|4k|song)[^)]*\\)", RegexOption.IGNORE_CASE), "")
            .replace(Regex("#\\S+"), "")
            .replace(Regex("\\b(official\\s+(music\\s+)?video|full\\s+(video\\s+)?song|lyrical(\\s+video)?|full\\s+video|video\\s+song|audio\\s+song|official\\s+audio)\\b", RegexOption.IGNORE_CASE), "")
            .split(Regex("\\s[|｜]\\s|\\s[-–—]\\s")).map { it.trim() }.firstOrNull { it.isNotEmpty() }
        return (s ?: t).replace(Regex("\\s+"), " ").trim('\'', '"', '“', '”', ' ').take(90)
    }

    fun thumb(id: String, q: String = "hq") = "https://i.ytimg.com/vi/$id/${q}default.jpg"

    private fun idOf(url: String) = Regex("[?&]v=([\\w-]{11})").find(url)?.groupValues?.get(1)
        ?: Regex("/(?:shorts|live)/([\\w-]{11})").find(url)?.groupValues?.get(1)

    private fun searchOne(q: String, music: Boolean = true): List<Track> {
        val key = "$music:" + q.lowercase().trim()
        cache[key]?.let { return it }
        val ex = ServiceList.YouTube.getSearchExtractor(q, listOf(YoutubeSearchQueryHandlerFactory.VIDEOS), "")
        ex.fetchPage()
        val items = ex.initialPage.items.filterIsInstance<StreamInfoItem>().toMutableList()
        if (items.size < 15 && ex.initialPage.hasNextPage()) runCatching { items += ex.getPage(ex.initialPage.nextPage).items.filterIsInstance<StreamInfoItem>() }
        val list = items.mapNotNull { v ->
            val id = idOf(v.url) ?: return@mapNotNull null
            val live = v.streamType == StreamType.LIVE_STREAM
            // Skip shorts and multi-hour compilations; keep live streams.
            if (music && !live && (v.duration < 60 || v.duration > 60 * 20)) return@mapNotNull null
            if (!music && !live && v.duration in 1..59) return@mapNotNull null
            Track(
                "yt:$id", Kind.SONG, if (music) cleanTitle(v.name) else noEmoji(v.name).take(120), noEmoji(v.uploaderName ?: ""), id,
                thumb(id, if (music) "mq" else "hq"), if (live) 0 else v.duration, live, video = !music,
                subtitle2 = if (music) "" else listOfNotNull(v.viewCount.takeIf { it > 0 }?.let(::views), v.textualUploadDate).joinToString(" · "),
            )
        }.distinctBy { it.id }.take(if (music) 40 else 60)
        if (list.isNotEmpty()) cache[key] = list
        return list
    }

    // A query can be several searches joined with "||"; results are interleaved.
    suspend fun search(q: String): List<Track> = withContext(Dispatchers.IO) {
        val parts = q.split("||").map { it.trim() }.filter { it.isNotEmpty() }
        if (parts.size < 2) return@withContext searchOne(q)
        val lists = coroutineScope { parts.map { p -> async { runCatching { searchOne(p) }.getOrDefault(emptyList()) } }.awaitAll() }
        val out = mutableListOf<Track>()
        val seen = HashSet<String>()
        for (i in 0 until (lists.maxOfOrNull { it.size } ?: 0)) for (l in lists) l.getOrNull(i)?.let { if (seen.add(it.id)) out += it }
        out
    }

    suspend fun videos(q: String): List<Track> = withContext(Dispatchers.IO) { searchOne(q, music = false) }

    private fun views(n: Long) = when {
        n >= 10_000_000 -> "${n / 1_000_000}M views"; n >= 1_000_000 -> "%.1fM views".format(n / 1e6)
        n >= 1000 -> "${n / 1000}K views"; else -> "$n views"
    }

    // Best audio-only stream for a video; HLS manifest for live streams.
    suspend fun stream(id: String): Stream = withContext(Dispatchers.IO) {
        streams[id]?.let { (t, s) -> if (System.currentTimeMillis() - t < 2 * 3600_000) return@withContext s }
        val info = StreamInfo.getInfo(ServiceList.YouTube, "https://www.youtube.com/watch?v=$id")
        val s = if (info.streamType == StreamType.LIVE_STREAM && !info.hlsUrl.isNullOrEmpty()) {
            Stream(info.hlsUrl, true, 0)
        } else {
            val a = info.audioStreams.filter { it.isUrl && it.content.isNotEmpty() }
                .maxByOrNull { (if (it.format?.name == "M4A") 1000 else 0) + it.averageBitrate.coerceAtMost(999) }
                ?: throw Exception("no audio stream")
            // Video-only track up to 720p (mp4 preferred), merged with the audio at play time.
            val v = info.videoOnlyStreams.filter { it.isUrl && it.content.isNotEmpty() && it.height in 1..720 }
                .maxByOrNull { it.height * 10 + (if (it.format?.name == "MPEG_4") 1 else 0) }
            val muxed = info.videoStreams.filter { it.isUrl && it.content.isNotEmpty() }.maxByOrNull { it.height }
            Stream(a.content, false, info.duration, v?.content ?: muxed?.content, v == null && muxed != null)
        }
        streams[id] = System.currentTimeMillis() to s
        s
    }
}

object Likes {
    private const val KEY = "likes.v2"
    private lateinit var ctx: Context
    private val _list = MutableStateFlow<List<Track>>(emptyList())
    val list = _list.asStateFlow()

    fun init(c: Context) {
        ctx = c
        val raw = c.getSharedPreferences("jam", 0).getString(KEY, "[]")
        _list.value = runCatching { JSONArray(raw).let { a -> (0 until a.length()).mapNotNull { Track.from(a.optJSONObject(it)) } } }.getOrDefault(emptyList())
    }

    fun has(id: String) = _list.value.any { it.id == id }

    fun toggle(t: Track) {
        val l = if (has(t.id)) _list.value.filter { it.id != t.id } else listOf(t) + _list.value
        _list.value = l
        ctx.getSharedPreferences("jam", 0).edit().putString(KEY, JSONArray(l.map { it.json() }).toString()).apply()
    }
}
