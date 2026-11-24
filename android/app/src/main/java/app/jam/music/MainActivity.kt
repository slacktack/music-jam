package app.jam.music

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Forum
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Radio
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.SmartDisplay
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.jam.music.ui.C
import app.jam.music.ui.Collection
import app.jam.music.ui.DotGlyph
import app.jam.music.ui.FloorScreen
import app.jam.music.ui.Home
import app.jam.music.ui.LikesScreen
import app.jam.music.ui.MiniPlayer
import app.jam.music.ui.Nav
import app.jam.music.ui.NowPlaying
import app.jam.music.ui.RadioHub
import app.jam.music.ui.Search
import app.jam.music.ui.T
import app.jam.music.ui.Tube
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge(SystemBarStyle.dark(android.graphics.Color.TRANSPARENT), SystemBarStyle.dark(android.graphics.Color.TRANSPARENT))
        super.onCreate(savedInstanceState)
        startService(Intent(this, PlaybackService::class.java))
        askBackgroundAccess()
        setContent { App() }
    }

    // Lock-screen controls need notifications; vivo/Xiaomi-style battery savers kill background audio without the exemption.
    @SuppressLint("BatteryLife")
    private fun askBackgroundAccess() {
        if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        val prefs = getSharedPreferences("jam", 0)
        val pm = getSystemService(PowerManager::class.java)
        if (!pm.isIgnoringBatteryOptimizations(packageName) && !prefs.getBoolean("asked_battery", false)) {
            prefs.edit().putBoolean("asked_battery", true).apply()
            runCatching { startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName"))) }
        }
    }

    override fun onDestroy() {
        if (isFinishing && !Jam.exo.playWhenReady) Floor.goodbye()
        super.onDestroy()
    }
}

private val TABS = listOf(
    Triple("home", "Home", Icons.Rounded.Home),
    Triple("radio", "Radio", Icons.Rounded.Radio),
    Triple("search", "Search", Icons.Rounded.Search),
    Triple("youtube", "YouTube", Icons.Rounded.SmartDisplay),
    Triple("floor", "Floor", Icons.Rounded.Forum),
)

@Composable
fun App() {
    var tab by rememberSaveable { mutableStateOf("home") }
    var tabArg by rememberSaveable { mutableStateOf("") }
    val stack = rememberSaveable(saver = androidx.compose.runtime.saveable.listSaver({ it.toList() }, { mutableStateListOf(*it.toTypedArray()) })) { mutableStateListOf<String>() }
    var playerOpen by rememberSaveable { mutableStateOf(false) }
    val p by Jam.state.collectAsState()
    val activity = androidx.compose.ui.platform.LocalContext.current as ComponentActivity

    val nav = remember {
        object : Nav {
            override fun open(v: Vibe) { stack += "${v.type}:${v.id}"; playerOpen = false }
            override fun tab(name: String, arg: String) { tab = name; tabArg = arg; stack.clear() }
            override fun likes() { stack += "likes" }
            override fun player() { playerOpen = true }
            override fun back() { if (stack.isNotEmpty()) stack.removeAt(stack.lastIndex) }
        }
    }
    BackHandler {
        when {
            playerOpen -> playerOpen = false
            stack.isNotEmpty() -> stack.removeAt(stack.lastIndex)
            tab != "home" -> tab = "home"
            else -> activity.moveTaskToBack(true) // keep the app (and music) alive
        }
    }

    val bottom = PaddingValues(bottom = if (p.track != null) 170.dp else 100.dp)
    androidx.compose.runtime.CompositionLocalProvider(app.jam.music.ui.LocalAccent provides app.jam.music.ui.accentFor(p.track, p.context)) {
    Box(Modifier.fillMaxSize().background(C.bg)) {
        val route = stack.lastOrNull() ?: "tab:$tab"
        AnimatedContent(route, transitionSpec = { fadeIn(tween(220)) togetherWith fadeOut(tween(160)) }, label = "route") { r ->
            when {
                r == "likes" -> LikesScreen(nav, bottom)
                r.startsWith("tab:") -> when (r.removePrefix("tab:")) {
                    "radio" -> RadioHub(nav, bottom, tabArg)
                    "search" -> Search(nav, bottom)
                    "youtube" -> Tube(nav, bottom)
                    "floor" -> FloorScreen(bottom)
                    else -> Home(nav, bottom)
                }
                else -> {
                    val (type, id) = r.split(":", limit = 2)
                    Catalog.find(type, id)?.let { Collection(it, nav, bottom) }
                }
            }
        }

        Column(Modifier.align(Alignment.BottomCenter).fillMaxWidth()) {
            Box(Modifier.fillMaxWidth().background(Brush.verticalGradient(0f to Color.Transparent, 0.35f to C.bg.copy(alpha = 0.9f), 1f to C.bg))) {
                Column(Modifier.navigationBarsPadding()) {
                    MiniPlayer { playerOpen = true }
                    Box(Modifier.fillMaxWidth().background(C.bg.copy(alpha = 0.97f))) { TabBar(tab, stack.isEmpty()) { nav.tab(it) } }
                }
            }
        }

        AnimatedVisibility(playerOpen && p.track != null, enter = slideInVertically(tween(320)) { it }, exit = slideOutVertically(tween(260)) { it }) {
            Box(Modifier.fillMaxSize().clickable(remember { MutableInteractionSource() }, null) {}) { NowPlaying { playerOpen = false } }
        }
        Reactions()
        ToastHost()
    }
    }
}

@Composable
private fun TabBar(tab: String, onRoot: Boolean, go: (String) -> Unit) {
    val f by Floor.state.collectAsState()
    Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp)) {
        TABS.forEach { (id, label, icon) ->
            val on = id == tab && onRoot
            Column(
                Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).clickable { go(id) }.padding(vertical = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box {
                    TabIcon(icon, on)
                    if (id == "floor" && f.unread > 0) Box(Modifier.align(Alignment.TopEnd).offset(6.dp, (-2).dp).size(9.dp).clip(CircleShape).background(P.red))
                }
                T(label, 11.sp, if (on) C.text else C.faint, weight = if (on) FontWeight.Bold else FontWeight.Medium)
            }
        }
    }
}

@Composable
private fun TabIcon(icon: ImageVector, on: Boolean) {
    Box(Modifier.clip(RoundedCornerShape(50)).background(if (on) Brush.linearGradient(listOf(P.saffron, P.magenta)) else Brush.linearGradient(listOf(Color.Transparent, Color.Transparent))).padding(horizontal = 16.dp, vertical = 4.dp)) {
        Icon(icon, null, Modifier.size(22.dp), tint = if (on) Color.Black else C.mute)
    }
}

@Composable
private fun Reactions() {
    val f by Floor.state.collectAsState()
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val h = maxHeight
        val w = maxWidth
        f.reactions.forEach { r ->
            androidx.compose.runtime.key(r.key) {
                val y = remember { Animatable(0f) }
                LaunchedEffect(Unit) { y.animateTo(1f, tween(3400, easing = LinearEasing)) }
                DotGlyph(
                    r.glyph, r.color, 38.dp,
                    Modifier.offset(w * r.x, h * (0.82f - 0.7f * y.value)).alpha((1f - y.value).coerceIn(0f, 1f) * 1.4f),
                )
            }
        }
    }
}

@Composable
private fun ToastHost() {
    val m by Toasts.msg.collectAsState()
    var shown by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(m) { val v = m ?: return@LaunchedEffect; shown = v.second; delay(3200); shown = null }
    Box(Modifier.fillMaxSize().padding(top = 60.dp), Alignment.TopCenter) {
        AnimatedVisibility(shown != null, enter = fadeIn() + slideInVertically { -it }, exit = fadeOut()) {
            Box(Modifier.padding(horizontal = 24.dp).clip(RoundedCornerShape(16.dp)).background(C.s3).padding(horizontal = 16.dp, vertical = 12.dp)) {
                T(shown ?: "", 14.sp, lines = 3)
            }
        }
    }
}

