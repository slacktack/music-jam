package app.jam.music

import android.content.Context
import androidx.compose.ui.graphics.Color
import fr.acinq.secp256k1.Secp256k1
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChangedBy
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.concurrent.ConcurrentHashMap

data class Ident(val name: String, val color: Color)
data class FloorUser(val id: String, val name: String, val color: Color, val track: Track?, val at: Long, val me: Boolean = false)
data class Spot(val track: Track, val at: Long, val users: List<FloorUser>)
data class ChatMsg(val id: String, val user: FloorUser, val text: String, val on: String, val ts: Long, val sys: Boolean = false)
data class Reaction(val key: Long, val glyph: String, val x: Float, val color: Color)

data class FloorState(
    val status: String = "connecting", val relaysUp: Int = 0, val me: Ident = Ident("", P.indigo),
    val users: List<FloorUser> = emptyList(), val spots: List<Spot> = emptyList(),
    val messages: List<ChatMsg> = emptyList(), val reactions: List<Reaction> = emptyList(), val unread: Int = 0,
)

// The floor: one global space shared with the web app over public Nostr relays.
object Floor {
    private val RELAYS = listOf("wss://relay.damus.io", "wss://nos.lol", "wss://relay.primal.net", "wss://nostr.mom")
    private const val ROOM = "jam-floor-v2"
    private const val K_PRESENCE = 30778
    private const val K_CHAT = 4778
    private const val K_REACT = 24778
    private const val STALE_MS = 75_000L
    private val ADJ = listOf("Neon", "Velvet", "Static", "Lunar", "Turbo", "Hazy", "Cosmic", "Chrome", "Desi", "Midnight", "Solar", "Masala", "Wavy", "Filmi", "Lofi", "Analog")
    private val NOUN = listOf("Tiger", "Koel", "Mango", "Comet", "Peacock", "Panda", "Dhol", "Sitar", "Lynx", "Chai", "Falcon", "Tabla", "Mor", "Phantom", "Baaz", "Synth")
    val REACTIONS = listOf("fire" to P.saffron, "heart" to P.red, "bolt" to P.lime, "star" to P.marigold, "note" to P.phosphor, "wave" to P.indigo)

    private val _s = MutableStateFlow(FloorState())
    val state = _s.asStateFlow()
    private val scope = MainScope()
    private lateinit var prefs: android.content.SharedPreferences
    private lateinit var sk: ByteArray
    lateinit var myId: String; private set
    private val sockets = ConcurrentHashMap<String, WebSocket>()
    private val others = HashMap<String, Triple<FloorUser, Long, Long>>() // user, seen ms, created_at
    private val seen = HashSet<String>()
    private val bootAt = System.currentTimeMillis() / 1000
    private var lastPresenceTs = 0L
    private var lastChat = 0L
    private var lastReact = 0L
    private var reactKey = 0L
    private var sysN = 0
    private var lastOk = 0L
    var chatOpen = false

    fun start(ctx: Context) {
        prefs = ctx.getSharedPreferences("jam", 0)
        val hex = prefs.getString("sk", null)?.takeIf { Regex("^[0-9a-f]{64}$").matches(it) && Secp256k1.secKeyVerify(it.hex()) }
        sk = hex?.hex() ?: ByteArray(32).also { do SecureRandom().nextBytes(it) while (!Secp256k1.secKeyVerify(it)); prefs.edit().putString("sk", it.toHex()).apply() }
        myId = Secp256k1.pubkeyCreate(sk).copyOfRange(1, 33).toHex()
        val me = Ident(
            prefs.getString("name", null) ?: "${ADJ.random()}${NOUN.random()}${(10..99).random()}".also { prefs.edit().putString("name", it).apply() },
            parseHex(prefs.getString("color", null)) ?: P.all.random().also { prefs.edit().putString("color", it.hex()).apply() },
        )
        _s.value = _s.value.copy(me = me)
        RELAYS.forEach { connect(it, 0) }
        recompute()
        scope.launch {
            delay(800)
            while (true) { sendPresence(); delay(25_000) }
        }
        scope.launch {
            while (true) {
                delay(2000)
                val cutoff = System.currentTimeMillis() - STALE_MS
                if (others.entries.removeIf { it.value.second < cutoff }) recompute()
                val up = sockets.size
                val status = if (up > 0 || System.currentTimeMillis() - lastOk < 60_000) "live" else if (System.currentTimeMillis() / 1000 - bootAt > 12) "offline" else "connecting"
                if (_s.value.status != status || _s.value.relaysUp != up) _s.value = _s.value.copy(status = status, relaysUp = up)
            }
        }
        scope.launch {
            Jam.state.distinctUntilChangedBy { s -> "${if (s.live) s.track?.id else ""}|${s.at / 3000}" }.collect {
                recompute(); delay(900); sendPresence()
            }
        }
    }

    private fun connect(url: String, attempt: Int) {
        val req = okhttp3.Request.Builder().url(url).build()
        Net.http.newWebSocket(req, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                sockets[url] = ws
                val now = System.currentTimeMillis() / 1000
                ws.send("""["REQ","h",{"kinds":[$K_CHAT],"#t":["$ROOM"],"since":${now - 12 * 3600},"limit":120}]""")
                ws.send("""["REQ","l",{"kinds":[$K_PRESENCE,$K_REACT,$K_CHAT],"#t":["$ROOM"],"since":${now - 120}}]""")
                scope.launch { sendPresence() }
            }

            override fun onMessage(ws: WebSocket, text: String) {
                lastOk = System.currentTimeMillis()
                val a = runCatching { JSONArray(text) }.getOrNull() ?: return
                if (a.optString(0) != "EVENT") return
                val ev = a.optJSONObject(2) ?: return
                if (!verify(ev)) return
                scope.launch { onEvent(ev) }
            }

            override fun onClosed(ws: WebSocket, code: Int, reason: String) = retry()
            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) = retry()
            private fun retry() {
                sockets.remove(url)
                scope.launch { delay((3000L shl attempt.coerceAtMost(4))); connect(url, attempt + 1) }
            }
        })
    }

    // NIP-01 canonical JSON: id = sha256([0,pubkey,created_at,kind,tags,content]).
    private fun esc(s: String) = buildString {
        append('"')
        for (c in s) when (c) {
            '"' -> append("\\\""); '\\' -> append("\\\\"); '\n' -> append("\\n"); '\r' -> append("\\r")
            '\t' -> append("\\t"); '\b' -> append("\\b"); '\u000C' -> append("\\f")
            else -> if (c < ' ') append(String.format("\\u%04x", c.code)) else append(c)
        }
        append('"')
    }

    private fun tagsJson(tags: List<List<String>>) = tags.joinToString(",", "[", "]") { t -> t.joinToString(",", "[", "]") { esc(it) } }
    private fun idOf(pub: String, at: Long, kind: Int, tags: List<List<String>>, content: String) =
        sha256("[0,${esc(pub)},$at,$kind,${tagsJson(tags)},${esc(content)}]")

    private fun verify(ev: JSONObject): Boolean = runCatching {
        val tags = ev.getJSONArray("tags").let { a -> (0 until a.length()).map { i -> a.getJSONArray(i).let { t -> (0 until t.length()).map { t.getString(it) } } } }
        val id = idOf(ev.getString("pubkey"), ev.getLong("created_at"), ev.getInt("kind"), tags, ev.getString("content"))
        id.toHex() == ev.getString("id") && Secp256k1.verifySchnorr(ev.getString("sig").hex(), id, ev.getString("pubkey").hex())
    }.getOrDefault(false)

    private fun sign(kind: Int, content: String): Pair<String, String> {
        val now = System.currentTimeMillis() / 1000
        // Replaceable events need strictly increasing timestamps or relays keep the old one.
        val at = if (kind == K_PRESENCE) maxOf(now, lastPresenceTs + 1).also { lastPresenceTs = it } else now
        val tags = if (kind == K_PRESENCE) listOf(listOf("d", ROOM), listOf("t", ROOM)) else listOf(listOf("t", ROOM))
        val id = idOf(myId, at, kind, tags, content)
        val aux = ByteArray(32).also { SecureRandom().nextBytes(it) }
        val sig = Secp256k1.signSchnorr(id, sk, aux)
        val idHex = id.toHex()
        return idHex to """{"id":"$idHex","pubkey":"$myId","created_at":$at,"kind":$kind,"tags":${tagsJson(tags)},"content":${esc(content)},"sig":"${sig.toHex()}"}"""
    }

    private suspend fun publish(ev: String): Boolean = withContext(Dispatchers.IO) {
        val msg = "[\"EVENT\",$ev]"
        sockets.values.count { it.send(msg) } > 0
    }

    private fun myTrack(): Pair<Track?, Long> = Jam.state.value.let { if (it.live && it.track != null) it.track to it.at else null to 0L }

    private suspend fun sendPresence() {
        val me = _s.value.me
        val (t, at) = myTrack()
        publish(sign(K_PRESENCE, JSONObject().put("name", me.name).put("color", me.color.hex()).put("track", t?.json() ?: JSONObject.NULL).put("at", at).toString()).second)
    }

    fun goodbye() = scope.launch {
        val me = _s.value.me
        publish(sign(K_PRESENCE, JSONObject().put("name", me.name).put("color", me.color.hex()).put("track", JSONObject.NULL).put("gone", true).toString()).second)
    }

    fun setIdentity(name: String? = null, color: Color? = null) {
        val me = _s.value.me.let { Ident(name?.trim()?.take(24)?.ifEmpty { null } ?: it.name, color ?: it.color) }
        prefs.edit().putString("name", me.name).putString("color", me.color.hex()).apply()
        _s.value = _s.value.copy(me = me)
        recompute()
        scope.launch { delay(200); sendPresence() }
    }

    fun sendChat(text: String): Boolean {
        val t = text.replace(Regex("[\\u0000-\\u001f\\u007f]"), " ").trim().take(280)
        if (t.isEmpty()) return false
        if (System.currentTimeMillis() - lastChat < 1200) { Toasts.show("Easy, one message a second."); return false }
        lastChat = System.currentTimeMillis()
        val me = _s.value.me
        val (id, ev) = sign(K_CHAT, JSONObject().put("text", t).put("name", me.name).put("color", me.color.hex()).put("on", myTrack().first?.title ?: "").toString())
        addChat(id, myId, System.currentTimeMillis() / 1000, JSONObject().put("text", t).put("name", me.name).put("color", me.color.hex()), false)
        scope.launch { if (!publish(ev)) Toasts.show("Message didn't reach the floor. Check your connection.") }
        return true
    }

    fun react(g: String) {
        if (System.currentTimeMillis() - lastReact < 350) return
        lastReact = System.currentTimeMillis()
        val (id, ev) = sign(K_REACT, JSONObject().put("g", g).put("c", _s.value.me.color.hex()).toString())
        seen += id
        addReaction(g, _s.value.me.color)
        scope.launch { publish(ev) }
    }

    fun clearUnread() { _s.value = _s.value.copy(unread = 0) }

    private fun str(o: JSONObject?, k: String, max: Int) = (o?.opt(k) as? String)?.replace(Regex("[\\u0000-\\u001f\\u007f]"), " ")?.trim()?.take(max) ?: ""

    private fun addReaction(g: String, c: Color) {
        val r = Reaction(++reactKey, g, 0.1f + Math.random().toFloat() * 0.8f, c)
        _s.value = _s.value.copy(reactions = (_s.value.reactions + r).takeLast(24))
        scope.launch { delay(3400); _s.value = _s.value.copy(reactions = _s.value.reactions.filter { it.key != r.key }) }
    }

    private fun addChat(id: String, pub: String, at: Long, c: JSONObject, countUnread: Boolean) {
        val text = str(c, "text", 280).ifEmpty { return }
        val u = FloorUser(pub, str(c, "name", 24).ifEmpty { "anon" }, parseHex(c.optString("color")) ?: P.indigo, null, 0)
        val msg = ChatMsg(id, u, text, str(c, "on", 90), at * 1000)
        val s = _s.value
        if (s.messages.any { it.id == id }) return
        _s.value = s.copy(
            messages = (s.messages + msg).sortedBy { it.ts }.takeLast(150),
            unread = if (countUnread && pub != myId && !chatOpen) s.unread + 1 else s.unread,
        )
    }

    private fun onEvent(ev: JSONObject) {
        val tags = ev.optJSONArray("tags") ?: return
        if ((0 until tags.length()).none { tags.optJSONArray(it)?.let { t -> t.optString(0) == "t" && t.optString(1) == ROOM } == true }) return
        val id = ev.getString("id"); val pub = ev.getString("pubkey"); val at = ev.getLong("created_at"); val kind = ev.getInt("kind")
        if (!seen.add(id)) return
        if (seen.size > 5000) seen.clear()
        val c = runCatching { JSONObject(ev.getString("content")) }.getOrNull() ?: return
        val now = System.currentTimeMillis() / 1000
        when (kind) {
            K_CHAT -> addChat(id, pub, at, c, at >= bootAt)
            K_PRESENCE -> {
                if (pub == myId || at < now - 120) return
                val prev = others[pub]
                if (prev != null && prev.third > at) return
                val user = FloorUser(pub, str(c, "name", 24).ifEmpty { "anon" }, parseHex(c.optString("color")) ?: P.indigo, Track.from(c.optJSONObject("track")), c.optLong("at"))
                if (!c.optBoolean("gone") && now - bootAt > 6) {
                    if (prev == null) sys(user, user.track?.let { "joined, playing ${it.title}" } ?: "joined the floor")
                    else if (user.track != null && user.track.id != prev.first.track?.id) sys(user, "tuned into ${user.track.title}")
                }
                if (c.optBoolean("gone")) others.remove(pub) else others[pub] = Triple(user, System.currentTimeMillis(), at)
                recompute()
            }
            K_REACT -> {
                val g = str(c, "g", 10)
                if (pub == myId || at < now - 20 || REACTIONS.none { it.first == g }) return
                addReaction(g, others[pub]?.first?.color ?: parseHex(c.optString("c")) ?: P.indigo)
            }
        }
    }

    private fun sys(u: FloorUser, text: String) {
        val msg = ChatMsg("sys-${++sysN}", u, text, "", System.currentTimeMillis(), true)
        _s.value = _s.value.copy(messages = (_s.value.messages + msg).takeLast(150))
    }

    private fun recompute() {
        val me = _s.value.me
        val (t, at) = myTrack()
        val users = listOf(FloorUser(myId, me.name, me.color, t, at, true)) +
            others.values.map { it.first }.sortedWith(compareBy({ if (it.track != null) 0 else 1 }, { it.name }))
        val spots = users.filter { it.track != null }.groupBy { it.track!!.id }
            .map { (_, us) -> Spot(us.first().track!!, us.first().at, us) }.sortedByDescending { it.users.size }
        _s.value = _s.value.copy(users = users, spots = spots)
    }
}

fun ByteArray.toHex() = joinToString("") { "%02x".format(it) }
fun String.hex() = chunked(2).map { it.toInt(16).toByte() }.toByteArray()
fun sha256(s: String): ByteArray = MessageDigest.getInstance("SHA-256").digest(s.toByteArray())
