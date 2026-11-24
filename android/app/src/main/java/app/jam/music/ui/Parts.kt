package app.jam.music.ui

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.jam.music.Catalog
import app.jam.music.Jam
import app.jam.music.Kind
import app.jam.music.Likes
import app.jam.music.Status
import app.jam.music.Track
import app.jam.music.Vibe
import app.jam.music.colorsFor

sealed interface Load<out T> {
    data object Loading : Load<Nothing>
    data class Ok<T>(val v: T) : Load<T>
    data class Err(val msg: String) : Load<Nothing>
}

class Loader<T>(val state: Load<T>, val retry: () -> Unit)

@Composable
fun <T> rememberLoad(vararg keys: Any?, block: suspend () -> T): Loader<T> {
    var n by remember { mutableIntStateOf(0) }
    var s by remember(*keys) { mutableStateOf<Load<T>>(Load.Loading) }
    LaunchedEffect(*keys, n) {
        s = Load.Loading
        s = runCatching { block() }.fold({ Load.Ok(it) }, { Load.Err(it.message ?: "error") })
    }
    return Loader(s) { n++ }
}

@Composable
fun SectionHead(kicker: String?, title: String, modifier: Modifier = Modifier, action: String? = null, onAction: (() -> Unit)? = null) {
    Column(modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 6.dp)) {
        Row(verticalAlignment = Alignment.Bottom) {
            Column(Modifier.weight(1f)) {
                if (kicker != null) Label(kicker, size = 12.sp)
                T(title, 26.sp, family = Display, weight = FontWeight.SemiBold, spacing = (-0.3).sp)
            }
            if (onAction != null) Row(Modifier.clip(RoundedCornerShape(50)).clickable(onClick = onAction).padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                T(action ?: "See all", 13.sp, C.mute, weight = FontWeight.Bold)
                Icon(Icons.AutoMirrored.Rounded.ArrowForward, null, Modifier.size(14.dp).padding(start = 2.dp), tint = C.mute)
            } else if (action != null) Label(action, C.faint, Modifier.padding(8.dp))
        }
        Gap(10.dp)
        DotRule(LocalAccent.current.first)
        Gap(4.dp)
    }
}

@Composable
fun TrackRow(t: Track, list: List<Track>, context: String, modifier: Modifier = Modifier) {
    val p by Jam.state.collectAsState()
    val likes by Likes.list.collectAsState()
    val on = p.track?.id == t.id
    val c = colorsFor(t.id)
    Row(
        modifier.fillMaxWidth().clickable { if (on && p.status != Status.ERROR) Jam.toggle() else Jam.play(t, list, context) }
            .background(if (on) Brush.horizontalGradient(listOf(c.first.copy(alpha = 0.16f), Color.Transparent)) else Brush.horizontalGradient(listOf(Color.Transparent, Color.Transparent)))
            .padding(horizontal = 18.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box {
            Cover(t, Modifier.size(54.dp))
            if (on) Box(Modifier.size(54.dp).clip(RoundedCornerShape(12.dp)).background(Color(0x99000000)), Alignment.Center) { Eq(c.first, p.status == Status.PLAYING) }
        }
        Column(Modifier.weight(1f).padding(horizontal = 14.dp)) {
            T(t.title, 16.sp, if (on) c.first else C.text, weight = FontWeight.Bold)
            Gap(2.dp)
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (t.live) { LiveDot(if (t.kind == Kind.RADIO) Color(0xFF2BD94A) else C.mute.copy(alpha = 1f)); Gap(w = 6.dp) }
                T(t.subtitle.ifEmpty { if (t.kind == Kind.RADIO) "Live radio" else "YouTube" }, 13.sp, C.mute)
            }
        }
        if (t.duration > 0) Label(fmt(t.duration), C.faint, Modifier.padding(end = 6.dp))
        else if (t.kind == Kind.RADIO) DotWord("LIVE", 9.dp, Color(0xFF2BD94A), Modifier.padding(end = 8.dp), glow = true)
        val liked = likes.any { it.id == t.id }
        Icon(
            if (liked) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder, "Like",
            Modifier.clip(CircleShape).clickable { Likes.toggle(t) }.padding(8.dp).size(20.dp),
            tint = if (liked) c.first else C.faint,
        )
    }
}

@Composable
fun VideoCard(t: Track, list: List<Track>, context: String, onOpen: () -> Unit) {
    val p by Jam.state.collectAsState()
    val on = p.track?.id == t.id
    Column(Modifier.fillMaxWidth().clickable { if (!on) Jam.play(t, list, context); onOpen() }.padding(horizontal = 14.dp, vertical = 8.dp)) {
        Box(Modifier.fillMaxWidth().aspectRatio(16 / 9f).clip(RoundedCornerShape(18.dp))) {
            Cover(t, Modifier.fillMaxSize(), RoundedCornerShape(18.dp), hq = true)
            Box(Modifier.align(Alignment.BottomEnd).padding(10.dp).clip(RoundedCornerShape(6.dp)).background(if (t.live) Color(0xFFE10600) else Color(0xCC000000)).padding(horizontal = 7.dp, vertical = 3.dp)) {
                Label(if (t.live) "Live" else fmt(t.duration), Color.White, size = 11.sp)
            }
            if (on) Box(Modifier.fillMaxSize().background(Color(0x88000000)), Alignment.Center) {
                Row(verticalAlignment = Alignment.CenterVertically) { Eq(colorsFor(t.id).first, p.status == Status.PLAYING); Gap(w = 8.dp); Label("Now playing", Color.White) }
            }
        }
        Gap(10.dp)
        Row {
            Box(Modifier.size(34.dp).clip(CircleShape).background(Brush.linearGradient(colorsFor(t.subtitle).toList())), Alignment.Center) {
                T(t.subtitle.take(1).uppercase(), 15.sp, Color.White, Display, FontWeight.SemiBold)
            }
            Column(Modifier.padding(start = 12.dp)) {
                T(t.title, 15.sp, weight = FontWeight.Bold, lines = 2, lineHeight = 19.sp)
                Gap(3.dp)
                T(listOf(t.subtitle, t.subtitle2).filter { it.isNotEmpty() }.joinToString(" · "), 12.5.sp, C.mute)
            }
        }
    }
}

@Composable
fun VibeTile(v: Vibe, modifier: Modifier = Modifier, height: Int = 96, onClick: () -> Unit) {
    Box(modifier.height(height.dp).clip(RoundedCornerShape(22.dp)).background(Color(0xFF08080B)).border(1.dp, C.line, RoundedCornerShape(22.dp)).clickable(onClick = onClick)) {
        Box(Modifier.fillMaxSize().padding(start = 0.dp)) {
            FlowArt(v.pattern, v.colors, v.id, Modifier.fillMaxSize(), density = 0.8f)
        }
        Box(Modifier.fillMaxSize().background(Brush.horizontalGradient(0.25f to Color(0xFF08080B), 1f to Color(0x2208080B))))
        Column(Modifier.align(Alignment.CenterStart).padding(horizontal = 16.dp)) {
            T(v.label, 19.sp, Color.White, Display, FontWeight.SemiBold)
            T(v.sub, 11.5.sp, Color.White.copy(alpha = 0.78f))
        }
    }
}

// Tall 3:4 tile with a play button, for the headline vibes.
@Composable
fun BigTile(v: Vibe, modifier: Modifier = Modifier, onPlay: () -> Unit, onClick: () -> Unit) {
    Box(modifier.aspectRatio(3 / 4f).clip(RoundedCornerShape(28.dp)).clickable(onClick = onClick)) {
        FlowArt(v.pattern, v.colors, v.id, Modifier.fillMaxSize(), animate = true, energy = 0.7f)
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0.45f to Color.Transparent, 1f to Color(0xE6050507))))
        Column(Modifier.align(Alignment.BottomStart).padding(18.dp)) {
            Label(if (v.desi) "Desi" else "Genre", v.colors.first)
            T(v.label, 38.sp, Color.White, Display, FontWeight.SemiBold, lineHeight = 40.sp, spacing = (-0.5).sp)
            T(v.sub, 13.sp, Color.White.copy(alpha = 0.8f))
        }
        Box(Modifier.align(Alignment.TopEnd).padding(14.dp).size(46.dp).clip(CircleShape).background(Color.White).clickable(onClick = onPlay), Alignment.Center) {
            Icon(androidx.compose.material.icons.Icons.Rounded.PlayArrow, "Play", tint = Color.Black, modifier = Modifier.size(26.dp))
        }
    }
}

@Composable
fun ArtistBubble(v: Vibe, onClick: () -> Unit) {
    Column(Modifier.width(92.dp).clickable(onClick = onClick), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(82.dp).clip(CircleShape).border(2.dp, Brush.linearGradient(v.colors.toList()), CircleShape).padding(4.dp).clip(CircleShape), Alignment.Center) {
            FlowArt(v.pattern, v.colors, v.id, Modifier.fillMaxSize(), density = 0.7f)
            Box(Modifier.fillMaxSize().background(Color(0x66050507)))
            DotWord(v.label.split(" ").take(2).joinToString("") { it.take(1) }, 20.dp, Color.White)
        }
        Gap(6.dp)
        T(v.label, 12.5.sp, C.text, weight = FontWeight.Medium)
    }
}

@Composable
fun FestCard(v: Vibe, onClick: () -> Unit) {
    val (st, days) = Catalog.festState(v)
    Box(Modifier.width(220.dp).height(150.dp).clip(RoundedCornerShape(22.dp)).clickable(onClick = onClick)) {
        FlowArt(v.pattern, v.colors, v.id, Modifier.fillMaxSize(), animate = st == Catalog.FestState.NOW)
        Box(Modifier.padding(12.dp).clip(RoundedCornerShape(50)).background(Color(0x99000000)).padding(horizontal = 9.dp, vertical = 4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (st == Catalog.FestState.NOW) { LiveDot(); Gap(w = 6.dp) }
                Label(when (st) { Catalog.FestState.NOW -> "Happening now"; Catalog.FestState.SOON -> "In $days days"; Catalog.FestState.MOOD -> "Mood"; else -> "Later" }, Color.White)
            }
        }
        Column(Modifier.align(Alignment.BottomStart).padding(14.dp)) {
            T(v.label, 22.sp, Color.White, Display, FontWeight.SemiBold)
            T(v.sub, 12.sp, Color.White.copy(alpha = 0.8f))
        }
    }
}

@Composable
fun Chip(label: String, on: Boolean, colors: Pair<Color, Color>? = null, onClick: () -> Unit) {
    val shape = RoundedCornerShape(50)
    Box(
        Modifier.clip(shape)
            .background(if (on) Brush.linearGradient((colors ?: (C.text to C.text)).toList()) else Brush.linearGradient(listOf(Color(0x0FFFFFFF), Color(0x0FFFFFFF))))
            .border(1.dp, if (on) Color.Transparent else C.line2, shape).clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 9.dp),
    ) { T(label, 14.sp, if (on) Color.Black else C.text, weight = FontWeight.Bold) }
}

@Composable
fun Skeleton(n: Int = 6, video: Boolean = false) {
    val a by rememberInfiniteTransition(label = "sk").animateFloat(0.04f, 0.1f, infiniteRepeatable(tween(800), RepeatMode.Reverse), label = "a")
    Column {
        repeat(n) {
            if (video) Column(Modifier.padding(horizontal = 14.dp, vertical = 8.dp)) {
                Box(Modifier.fillMaxWidth().aspectRatio(16 / 9f).clip(RoundedCornerShape(18.dp)).background(Color.White.copy(alpha = a)))
                Gap(10.dp); Box(Modifier.fillMaxWidth(0.8f).height(14.dp).clip(RoundedCornerShape(4.dp)).background(Color.White.copy(alpha = a)))
            } else Row(Modifier.padding(horizontal = 18.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(54.dp).clip(RoundedCornerShape(12.dp)).background(Color.White.copy(alpha = a)))
                Column(Modifier.padding(start = 14.dp)) {
                    Box(Modifier.width(170.dp).height(13.dp).clip(RoundedCornerShape(4.dp)).background(Color.White.copy(alpha = a)))
                    Gap(8.dp); Box(Modifier.width(110.dp).height(10.dp).clip(RoundedCornerShape(4.dp)).background(Color.White.copy(alpha = a)))
                }
            }
        }
    }
}

@Composable
fun Empty(glyph: String, title: String, sub: String, color: Color = C.mute, action: String? = null, onAction: (() -> Unit)? = null) {
    Column(Modifier.fillMaxWidth().padding(36.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        DotGlyph(glyph, color, 56.dp, pulse = true)
        Gap(16.dp)
        T(title, 20.sp, family = Display, weight = FontWeight.SemiBold)
        Gap(4.dp)
        T(sub, 14.sp, C.mute, lines = 3)
        if (onAction != null) { Gap(16.dp); Chip(action ?: "Retry", false, onClick = onAction) }
    }
}

@Composable
fun <T> LoadView(l: Loader<T>, video: Boolean = false, empty: @Composable () -> Unit = {}, content: @Composable (T) -> Unit) {
    when (val s = l.state) {
        Load.Loading -> DotLoader(if (video) "Loading videos" else "Tuning in", LocalAccent.current.first)
        is Load.Err -> Empty("sad", "Couldn't load", "Check your connection and try again.", action = "Retry", onAction = l.retry)
        is Load.Ok -> if (s.v is List<*> && (s.v as List<*>).isEmpty()) empty() else content(s.v)
    }
}

