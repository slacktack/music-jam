package app.jam.music

import androidx.compose.ui.graphics.Color
import org.json.JSONObject
import java.time.LocalDate
import java.time.temporal.ChronoUnit

enum class Kind { RADIO, SONG }

data class Track(
    val id: String, // radio: station uuid, song: "yt:<videoId>"
    val kind: Kind,
    val title: String,
    val subtitle: String,
    val url: String, // radio: https stream, song: video id
    val art: String,
    val duration: Long = 0,
    val live: Boolean = false,
    val hls: Boolean = false,
    val video: Boolean = false, // full YouTube video, not just audio
    val subtitle2: String = "",
) {
    fun json(): JSONObject = JSONObject()
        .put("id", id).put("kind", if (kind == Kind.SONG) "song" else "radio").put("title", title)
        .put("subtitle", subtitle).put("url", url).put("art", art).put("duration", duration)
        .put("live", live).put("hls", hls).put("video", video)

    companion object {
        private fun s(o: JSONObject, k: String, max: Int) =
            o.optString(k, "").replace(Regex("[\\u0000-\\u001f\\u007f]"), " ").trim().take(max)

        // Validates anything that came off the network (floor events) or disk.
        fun from(o: JSONObject?): Track? {
            o ?: return null
            val kind = when (o.optString("kind")) { "song" -> Kind.SONG; "radio" -> Kind.RADIO; else -> return null }
            val url = s(o, "url", 500)
            if (kind == Kind.SONG && !Regex("^[\\w-]{11}$").matches(url)) return null
            if (kind == Kind.RADIO && !url.startsWith("https://", true)) return null
            val art = s(o, "art", 500)
            val dur = o.optDouble("duration", 0.0).let { if (it.isFinite()) it.toLong().coerceIn(0, 36000) else 0 }
            return Track(
                id = if (kind == Kind.SONG) "yt:$url" else s(o, "id", 64).ifEmpty { url },
                kind = kind,
                title = s(o, "title", 90).ifEmpty { "Untitled" },
                subtitle = s(o, "subtitle", 90),
                url = url,
                art = if (art.startsWith("https://", true)) art else "",
                duration = dur,
                live = o.optBoolean("live"),
                hls = o.optBoolean("hls"),
                video = o.optBoolean("video"),
            )
        }
    }
}

object P {
    val saffron = Color(0xFFFF8A00); val marigold = Color(0xFFFFC300); val red = Color(0xFFE10600)
    val phosphor = Color(0xFF2BD94A); val lime = Color(0xFFD7FF3A); val indigo = Color(0xFF5B5BFF)
    val violet = Color(0xFF9B5CFF); val magenta = Color(0xFFFF2D95); val cyan = Color(0xFF00D1FF)
    val teal = Color(0xFF00E0B0)
    val all = listOf(saffron, marigold, red, phosphor, lime, indigo, violet, magenta, cyan, teal)
    val pairs = listOf(
        saffron to red, marigold to magenta, phosphor to lime, indigo to cyan, magenta to violet,
        red to indigo, cyan to phosphor, violet to saffron, teal to indigo, lime to saffron,
    )
}

fun hash(s: String): Long {
    var h = 2166136261L
    for (c in s) { h = h xor c.code.toLong(); h = (h * 16777619L) and 0xFFFFFFFFL }
    return h
}

fun colorsFor(seed: String) = P.pairs[(hash(seed) % P.pairs.size).toInt()]

fun Color.hex(): String = String.format("#%06X", (value shr 32).toInt() and 0xFFFFFF)
fun parseHex(s: String?): Color? =
    if (s != null && Regex("^#[0-9a-fA-F]{6}$").matches(s)) Color(0xFF000000 or s.substring(1).toLong(16)) else null

enum class Pattern { WAVES, ZIGZAG, RINGS, RAYS, CONTOUR, GRID }

typealias Query = Map<String, String>

private fun top(vararg p: Pair<String, String>): Query = mapOf("order" to "clickcount", "reverse" to "true") + p

// A vibe, artist, festival or radio tab: anything that opens a collection page.
data class Vibe(
    val id: String, val label: String, val sub: String, val colors: Pair<Color, Color>, val pattern: Pattern,
    val radio: List<Query>, val songs: String, val desi: Boolean = false,
    val dates: List<String> = emptyList(), val before: Int = 3, val after: Int = 1, val aliases: List<String> = emptyList(),
    val type: String = "vibe",
)

object Catalog {
    private val Y = LocalDate.now().year
    private fun lang(id: String, label: String, sub: String, c: Pair<Color, Color>, p: Pattern) =
        Vibe(id, label, sub, c, p, listOf(top("language" to id), top("tag" to id)), "$label hit songs $Y", true)

    val vibes = listOf(
        Vibe("hindi", "Hindi", "हिंदी · the new hits", P.saffron to P.red, Pattern.WAVES, listOf(top("language" to "hindi"), top("tag" to "hindi")), "new hindi songs $Y", true),
        Vibe("punjabi", "Punjabi", "ਪੰਜਾਬੀ · Diljit to Shubh", P.phosphor to P.lime, Pattern.ZIGZAG, listOf(top("language" to "punjabi"), top("tag" to "punjabi"), top("name" to "punjabi")), "new punjabi songs $Y", true),
        Vibe(
            "retro-hindi", "Retro Hindi", "Kishore · Lata · Rafi · RD", P.marigold to P.magenta, Pattern.RINGS,
            listOf(
                top("countrycode" to "IN", "name" to "retro"), top("language" to "hindi", "name" to "90"), top("language" to "hindi", "name" to "gold"),
                top("language" to "hindi", "tag" to "retro"), top("name" to "kishore"), top("countrycode" to "IN", "name" to "rafi"),
                top("countrycode" to "IN", "name" to "lata"), top("language" to "hindi", "tag" to "90s"), top("name" to "vividh"), top("tag" to "bollywood", "name" to "nostalgi"),
            ),
            "kishore kumar hit songs||lata mangeshkar hit songs||mohammed rafi hit songs||r d burman songs||asha bhosle hit songs", true,
        ),
        Vibe("bollywood", "Bollywood", "Filmi, all day", P.magenta to P.violet, Pattern.CONTOUR, listOf(top("tag" to "bollywood")), "bollywood hit songs $Y", true),
        Vibe("bhakti", "Bhakti", "Bhajan · aarti · kirtan", P.marigold to P.saffron, Pattern.RAYS, listOf(top("tag" to "bhajan"), top("tag" to "devotional", "countrycode" to "IN"), top("name" to "bhakti")), "bhakti songs bhajan", true),
        Vibe("bhojpuri", "Bhojpuri", "Purvanchal bangers", P.saffron to P.magenta, Pattern.ZIGZAG, listOf(top("language" to "bhojpuri"), top("name" to "bhojpuri"), top("tag" to "bhojpuri")), "bhojpuri songs $Y", true),
        Vibe("sufi", "Sufi & Ghazal", "Qawwali, ghazal, sufi", P.teal to P.indigo, Pattern.WAVES, listOf(top("tag" to "ghazal"), top("tag" to "sufi"), top("tag" to "qawwali")), "sufi songs ghazal qawwali", true),
        Vibe("desi-hiphop", "Desi Hip-hop", "Gully to the charts", P.red to P.indigo, Pattern.GRID, listOf(top("tag" to "desi"), top("countrycode" to "IN", "tag" to "hip hop")), "desi hip hop songs $Y", true),
        Vibe("hindi-lofi", "Hindi Lo-fi", "Slowed + reverb", P.violet to P.cyan, Pattern.CONTOUR, listOf(top("tag" to "lofi", "countrycode" to "IN"), top("name" to "lofi", "language" to "hindi"), top("tag" to "lofi")), "hindi lofi songs slowed reverb", true),
        Vibe("haryanvi", "Haryanvi", "Desi thumka", P.lime to P.saffron, Pattern.GRID, listOf(top("language" to "haryanvi"), top("name" to "haryanvi")), "haryanvi songs $Y", true),
        lang("tamil", "Tamil", "தமிழ் · Anirudh & co", P.red to P.marigold, Pattern.RAYS),
        lang("telugu", "Telugu", "తెలుగు · Tollywood", P.cyan to P.magenta, Pattern.ZIGZAG),
        lang("malayalam", "Malayalam", "മലയാളം", P.phosphor to P.teal, Pattern.WAVES),
        lang("kannada", "Kannada", "ಕನ್ನಡ", P.marigold to P.red, Pattern.RINGS),
        lang("marathi", "Marathi", "मराठी", P.saffron to P.violet, Pattern.CONTOUR),
        lang("bengali", "Bengali", "বাংলা", P.red to P.teal, Pattern.WAVES),
        lang("gujarati", "Gujarati", "ગુજરાતી · garba ready", P.magenta to P.marigold, Pattern.RINGS),
        Vibe("english", "English Hits", "Top 40 worldwide", P.indigo to P.magenta, Pattern.WAVES, listOf(top("language" to "english", "tag" to "hits"), top("language" to "english", "tag" to "pop"), top("language" to "english", "tag" to "top 40")), "top english songs $Y"),
        Vibe("hiphop", "Hip-hop", "Rap & R&B", P.red to P.marigold, Pattern.GRID, listOf(top("tag" to "hip hop"), top("tag" to "hiphop"), top("tag" to "rap")), "hip hop songs $Y"),
        Vibe("lofi", "Lo-fi", "Beats to study to", P.violet to P.indigo, Pattern.CONTOUR, listOf(top("tag" to "lofi"), top("tag" to "lo-fi"), top("tag" to "chillhop")), "lofi hip hop"),
        Vibe("electronic", "Electronic", "EDM & more", P.cyan to P.indigo, Pattern.ZIGZAG, listOf(top("tag" to "electronic")), "edm songs $Y"),
        Vibe("house", "House", "Four on the floor", P.indigo to P.phosphor, Pattern.GRID, listOf(top("tag" to "house")), "house music mix"),
        Vibe("techno", "Techno", "Warehouse hours", P.phosphor to P.cyan, Pattern.ZIGZAG, listOf(top("tag" to "techno")), "techno"),
        Vibe("rock", "Rock", "Guitars up", P.red to P.violet, Pattern.RAYS, listOf(top("tag" to "rock")), "rock songs"),
        Vibe("jazz", "Jazz", "Smoke & brass", P.marigold to P.indigo, Pattern.WAVES, listOf(top("tag" to "jazz")), "jazz classics"),
        Vibe("chill", "Chill", "Ambient & downtempo", P.teal to P.violet, Pattern.CONTOUR, listOf(top("tag" to "chillout"), top("tag" to "ambient")), "chill songs"),
        Vibe("kpop", "K-pop", "Seoul to you", P.magenta to P.cyan, Pattern.RINGS, listOf(top("tag" to "kpop"), top("tag" to "k-pop")), "kpop songs $Y"),
        Vibe("latin", "Latin", "Reggaeton & more", P.saffron to P.magenta, Pattern.ZIGZAG, listOf(top("tag" to "latin"), top("tag" to "reggaeton")), "reggaeton hits $Y"),
        Vibe("90s", "90s", "Throwbacks", P.magenta to P.marigold, Pattern.GRID, listOf(top("tag" to "90s")), "90s hits"),
        Vibe("classical", "Classical", "Strings & keys", P.indigo to P.marigold, Pattern.RINGS, listOf(top("tag" to "classical")), "classical music"),
        Vibe("metal", "Metal", "Heavy", P.red to P.phosphor, Pattern.RAYS, listOf(top("tag" to "metal")), "metal songs"),
    )

    private fun fest(
        id: String, label: String, sub: String, dates: List<String>, c: Pair<Color, Color>, p: Pattern, songs: String,
        radio: List<Query>, aliases: List<String>, before: Int = 3, after: Int = 1,
    ) = Vibe(id, label, sub, c, p, radio, songs, true, dates, before, after, aliases, "fest")

    val festivals = listOf(
        fest("chhath", "Chhath Puja", "Sharda Sinha, the ghat, the setting sun", listOf("2026-11-15", "2027-11-04"), P.saffron to P.red, Pattern.RAYS, "chhath puja songs sharda sinha", listOf(top("language" to "bhojpuri"), top("name" to "bhojpuri")), listOf("chhath", "chath", "chhat", "chhathi maiya", "chhath puja"), before = 4),
        fest("diwali", "Diwali", "Diyas, rangoli, Lakshmi aarti", listOf("2026-11-08", "2027-10-29"), P.marigold to P.magenta, Pattern.GRID, "diwali songs hindi", listOf(top("tag" to "bhajan")), listOf("diwali", "deepawali", "divali", "dipawali"), before = 5, after = 2),
        fest("gurpurab", "Gurpurab", "Shabad kirtan, Waheguru", listOf("2026-11-24", "2027-11-14"), P.marigold to P.indigo, Pattern.RINGS, "gurbani shabad kirtan", listOf(top("name" to "gurbani"), top("tag" to "gurbani"), top("tag" to "kirtan")), listOf("gurpurab", "guru nanak jayanti", "gurbani", "kirtan", "shabad"), before = 2),
        fest("shaadi", "Shaadi Season", "Sangeet, baraat, mehendi", listOf("2026-11-20", "2027-11-20"), P.magenta to P.saffron, Pattern.CONTOUR, "shaadi songs wedding dance bollywood", listOf(top("tag" to "bollywood")), listOf("shaadi", "shadi", "wedding", "sangeet", "baraat", "mehendi", "mehndi"), before = 6, after = 85),
        fest("christmas", "Christmas", "Jingle all the way", listOf("2026-12-25", "2027-12-25"), P.red to P.phosphor, Pattern.GRID, "christmas songs", listOf(top("tag" to "christmas")), listOf("christmas", "xmas", "carol"), before = 10),
        fest("newyear", "New Year Party", "Countdown bangers", listOf("2026-12-31", "2027-12-31"), P.indigo to P.magenta, Pattern.RAYS, "new year party songs bollywood", listOf(top("tag" to "party")), listOf("new year", "nye", "party")),
        fest("lohri", "Lohri", "Bonfire, rewri, bhangra", listOf("2026-01-13", "2027-01-13"), P.saffron to P.marigold, Pattern.RAYS, "lohri songs punjabi", listOf(top("language" to "punjabi")), listOf("lohri", "lohdi")),
        fest("sankranti", "Sankranti & Pongal", "Kites up", listOf("2026-01-14", "2027-01-14"), P.marigold to P.cyan, Pattern.ZIGZAG, "makar sankranti songs pongal songs", listOf(top("language" to "tamil")), listOf("sankranti", "pongal", "uttarayan", "kite")),
        fest("holi", "Holi", "Rang barse", listOf("2026-03-04", "2027-03-22"), P.magenta to P.phosphor, Pattern.CONTOUR, "holi songs bollywood", listOf(top("tag" to "bollywood")), listOf("holi", "rang"), before = 5),
        fest("eid", "Eid", "Chand raat to qawwali", listOf("2026-03-20", "2027-03-10"), P.phosphor to P.cyan, Pattern.RINGS, "eid mubarak songs qawwali", listOf(top("tag" to "qawwali")), listOf("eid", "ramzan", "ramadan", "chand raat"), after = 2),
        fest("baisakhi", "Baisakhi", "Harvest bhangra", listOf("2026-04-14", "2027-04-14"), P.lime to P.saffron, Pattern.ZIGZAG, "baisakhi bhangra songs", listOf(top("language" to "punjabi")), listOf("baisakhi", "vaisakhi")),
        fest("rakhi", "Raksha Bandhan", "For the siblings", listOf("2026-08-28", "2027-08-17"), P.magenta to P.marigold, Pattern.WAVES, "raksha bandhan songs", listOf(top("tag" to "bollywood")), listOf("rakhi", "raksha bandhan")),
        fest("janmashtami", "Janmashtami", "Krishna bhajans, dahi handi", listOf("2026-09-04", "2027-08-25"), P.indigo to P.cyan, Pattern.WAVES, "krishna bhajan janmashtami songs", listOf(top("tag" to "bhajan")), listOf("janmashtami", "krishna", "dahi handi")),
        fest("ganesh", "Ganesh Chaturthi", "Ganpati bappa morya", listOf("2026-09-14", "2027-09-04"), P.saffron to P.red, Pattern.RINGS, "ganpati songs ganesh chaturthi", listOf(top("language" to "marathi")), listOf("ganesh", "ganpati", "ganeshotsav", "ganesh chaturthi"), before = 2, after = 10),
        fest("navratri", "Navratri & Garba", "Dandiya nights", listOf("2026-10-11", "2027-09-30"), P.red to P.marigold, Pattern.RINGS, "navratri garba songs", listOf(top("language" to "gujarati")), listOf("navratri", "garba", "dandiya", "dussehra"), before = 1, after = 9),
        fest("durga", "Durga Puja", "Dhak, pandals, pujo", listOf("2026-10-17", "2027-10-06"), P.red to P.saffron, Pattern.RAYS, "durga puja songs dhak", listOf(top("language" to "bengali")), listOf("durga", "pujo", "durga puja"), before = 1, after = 4),
        fest("karva", "Karva Chauth", "Waiting for the moon", listOf("2026-10-29", "2027-10-18"), P.red to P.magenta, Pattern.RINGS, "karva chauth songs", listOf(top("tag" to "bollywood")), listOf("karva chauth", "karwa chauth", "karva"), before = 2, after = 0),
        fest("gym", "Gym Mode", "Desi pump-up, no skips", emptyList(), P.red to P.lime, Pattern.ZIGZAG, "gym workout songs hindi punjabi", listOf(top("tag" to "workout"), top("tag" to "fitness")), listOf("gym", "workout", "running", "fitness")),
        fest("barish", "Barish", "Monsoon & chai", emptyList(), P.cyan to P.indigo, Pattern.WAVES, "barish songs hindi monsoon", listOf(top("tag" to "romantic", "language" to "hindi")), listOf("barish", "baarish", "rain", "monsoon")),
        fest("roadtrip", "Road Trip", "Windows down", emptyList(), P.marigold to P.teal, Pattern.CONTOUR, "road trip songs bollywood", listOf(top("tag" to "hits", "language" to "hindi")), listOf("road trip", "drive", "travel")),
        fest("latenight", "Late Night", "2am feelings", emptyList(), P.violet to P.indigo, Pattern.CONTOUR, "late night hindi songs sad", listOf(top("tag" to "lofi")), listOf("late night", "sad", "night")),
    )

    enum class FestState { NOW, SOON, MOOD, LATER }

    fun festState(f: Vibe, today: LocalDate = LocalDate.now()): Pair<FestState, Int> {
        if (f.dates.isEmpty()) return FestState.MOOD to 0
        var best = Int.MAX_VALUE
        for (d in f.dates) {
            val diff = ChronoUnit.DAYS.between(today, LocalDate.parse(d)).toInt()
            if (diff <= f.before && diff >= -f.after) return FestState.NOW to 0
            if (diff in 1 until best) best = diff
        }
        if (best == Int.MAX_VALUE) return FestState.LATER to 9999
        return (if (best - f.before <= 30) FestState.SOON else FestState.LATER) to best - f.before
    }

    fun sortedFestivals() = festivals.map { it to festState(it) }
        .sortedWith(compareBy({ it.second.first.ordinal }, { it.second.second }))

    private val nineties = listOf(top("language" to "hindi", "name" to "90"), top("tag" to "bollywood", "name" to "90"))
    private val classic = listOf(top("countrycode" to "IN", "name" to "retro"), top("language" to "hindi", "name" to "gold"))
    private val now = listOf(top("language" to "hindi"), top("tag" to "bollywood"))
    private val punjab = listOf(top("language" to "punjabi"))
    private fun artist(id: String, label: String, sub: String, c: Pair<Color, Color>, p: Pattern, station: String?, fallback: List<Query>) =
        Vibe(id, label, sub, c, p, (station?.let { listOf(top("countrycode" to "IN", "name" to it)) } ?: emptyList()) + fallback, "$label hit songs", true, type = "artist")

    val artists = listOf(
        artist("kishore-kumar", "Kishore Kumar", "Yodel-ay-ee-oo", P.marigold to P.red, Pattern.RINGS, "kishore", classic),
        artist("lata-mangeshkar", "Lata Mangeshkar", "Nightingale of India", P.magenta to P.marigold, Pattern.WAVES, "lata", classic),
        artist("mohammed-rafi", "Mohammed Rafi", "Gold-era magic", P.cyan to P.indigo, Pattern.CONTOUR, "rafi", classic),
        artist("asha-bhosle", "Asha Bhosle", "Cabaret to ghazal", P.red to P.magenta, Pattern.ZIGZAG, null, classic),
        artist("mukesh", "Mukesh", "Soulful classics", P.teal to P.indigo, Pattern.WAVES, "mukesh", classic),
        artist("rd-burman", "R.D. Burman", "Pancham da", P.saffron to P.violet, Pattern.GRID, null, classic),
        artist("kumar-sanu", "Kumar Sanu", "90s king of romance", P.saffron to P.magenta, Pattern.RINGS, "kumar sanu", nineties),
        artist("udit-narayan", "Udit Narayan", "Papa kehte hain", P.marigold to P.phosphor, Pattern.WAVES, null, nineties),
        artist("alka-yagnik", "Alka Yagnik", "Queen of the 90s", P.magenta to P.violet, Pattern.CONTOUR, "alka yagnik", nineties),
        artist("abhijeet", "Abhijeet", "SRK's 90s voice", P.indigo to P.saffron, Pattern.ZIGZAG, null, nineties),
        artist("sonu-nigam", "Sonu Nigam", "Range for days", P.cyan to P.magenta, Pattern.RAYS, "sonu nigam", nineties),
        artist("kk", "KK", "Pal, yaaron", P.red to P.indigo, Pattern.WAVES, null, nineties),
        artist("shaan", "Shaan", "Chand sifarish", P.lime to P.cyan, Pattern.GRID, null, nineties),
        artist("lucky-ali", "Lucky Ali", "O sanam", P.teal to P.marigold, Pattern.CONTOUR, null, nineties),
        artist("sunidhi-chauhan", "Sunidhi Chauhan", "Dance-floor queen", P.red to P.marigold, Pattern.ZIGZAG, null, now),
        artist("shreya-ghoshal", "Shreya Ghoshal", "Melody queen", P.violet to P.magenta, Pattern.WAVES, "shreya", now),
        artist("arijit-singh", "Arijit Singh", "Heartbreak HQ", P.indigo to P.violet, Pattern.CONTOUR, "arijit", now),
        artist("atif-aslam", "Atif Aslam", "Tere bin", P.phosphor to P.teal, Pattern.RINGS, null, now),
        artist("ar-rahman", "A.R. Rahman", "Mozart of Madras", P.saffron to P.cyan, Pattern.RAYS, null, now),
        artist("jagjit-singh", "Jagjit Singh", "Ghazal maestro", P.teal to P.indigo, Pattern.WAVES, null, listOf(top("tag" to "ghazal"))),
        artist("nusrat", "Nusrat Fateh Ali Khan", "Qawwali legend", P.marigold to P.teal, Pattern.RAYS, null, listOf(top("tag" to "qawwali"), top("tag" to "sufi"))),
        artist("diljit", "Diljit Dosanjh", "Born to shine", P.phosphor to P.marigold, Pattern.ZIGZAG, null, punjab),
        artist("sidhu", "Sidhu Moose Wala", "Legend", P.red to P.saffron, Pattern.GRID, null, punjab),
        artist("karan-aujla", "Karan Aujla", "Geetan di machine", P.lime to P.red, Pattern.ZIGZAG, null, punjab),
        artist("ap-dhillon", "AP Dhillon", "Brown munde", P.indigo to P.cyan, Pattern.CONTOUR, null, punjab),
    )

    private fun vt(id: String, vibeId: String, label: String, sub: String) =
        vibes.first { it.id == vibeId }.copy(id = id, label = label, sub = sub, type = "tab")

    val radioTabs = listOf(
        Vibe("india", "Top India", "Most played", P.saffron to P.phosphor, Pattern.WAVES, listOf(top("countrycode" to "IN")), "", type = "tab"),
        Vibe(
            "fm", "FM channels", "Mirchi · BIG · AIR", P.red to P.marigold, Pattern.RAYS,
            listOf(
                top("countrycode" to "IN", "name" to "mirchi"), top("countrycode" to "IN", "name" to "big"), top("countrycode" to "IN", "name" to "vividh"),
                top("countrycode" to "IN", "name" to "air "), top("name" to "red fm"), top("countrycode" to "IN", "name" to "radio city"),
                top("countrycode" to "IN", "name" to "fever"), top("countrycode" to "IN", "name" to " fm"),
            ), "", type = "tab",
        ),
        vt("hindi", "hindi", "Hindi", "हिंदी"),
        vt("punjabi", "punjabi", "Punjabi", "ਪੰਜਾਬੀ"),
        vt("retro", "retro-hindi", "Retro", "Old is gold"),
        vt("bollywood", "bollywood", "Bollywood", "Filmi"),
        vt("bhakti", "bhakti", "Bhakti", "Bhajan · aarti"),
        vt("bhojpuri", "bhojpuri", "Bhojpuri", "Purvanchal"),
        vt("sufi", "sufi", "Sufi", "Ghazal · qawwali"),
        Vibe("south", "South", "Tamil · Telugu · more", P.red to P.cyan, Pattern.ZIGZAG, listOf(top("language" to "tamil"), top("language" to "telugu"), top("language" to "malayalam"), top("language" to "kannada")), "", type = "tab"),
        Vibe("world", "World", "Everywhere else", P.indigo to P.cyan, Pattern.CONTOUR, listOf(top()), "", type = "tab"),
    )

    fun find(type: String, id: String) = when (type) {
        "artist" -> artists; "fest" -> festivals; "tab" -> radioTabs; else -> vibes
    }.firstOrNull { it.id == id }

    fun findFestival(q: String): Vibe? {
        val t = q.lowercase().trim()
        if (t.length < 3) return null
        return festivals.firstOrNull { f -> f.aliases.any { it.startsWith(t) || t.contains(it) } }
    }

    fun findVibe(q: String): Vibe? {
        val t = q.lowercase().trim()
        if (t.length < 3) return null
        return vibes.firstOrNull { it.label.lowercase().startsWith(t) || it.id.startsWith(t) }
    }

    fun findArtist(q: String): Vibe? {
        val t = q.lowercase().trim()
        if (t.length < 3) return null
        return artists.firstOrNull { it.label.lowercase().contains(t) || t.contains(it.label.lowercase()) }
    }

    private fun themeFor(context: String): Pair<Color, Color>? {
        val c = context.replace(Regex(" radio$", RegexOption.IGNORE_CASE), "").trim().lowercase()
        if (c.isEmpty()) return null
        return (vibes + artists + festivals + radioTabs).firstOrNull { it.label.lowercase() == c }?.colors
    }

    // Per-song colours flavoured by the genre: changes every song, keeps the genre's mood.
    fun trackColors(trackId: String, context: String): Pair<Color, Color> {
        val song = colorsFor(trackId)
        val g = themeFor(context) ?: return song
        val i = (hash(trackId) % 2).toInt()
        val base = if (i == 0) g.first else g.second
        return base to (if (song.first == base) song.second else song.first)
    }
}
