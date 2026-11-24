package app.jam.music.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.jam.music.Kind
import app.jam.music.Pattern
import app.jam.music.R
import app.jam.music.Track
import app.jam.music.YouTube
import app.jam.music.colorsFor
import app.jam.music.hash
import coil.compose.SubcomposeAsyncImage
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

val LocalAccent = androidx.compose.runtime.compositionLocalOf { Color(0xFFFF8A00) to Color(0xFFFF2D95) }

object C {
    val bg = Color(0xFF050507); val s1 = Color(0xFF0C0C10); val s2 = Color(0xFF131318); val s3 = Color(0xFF1B1B22)
    val text = Color(0xFFF6F6F8); val mute = Color(0x99F6F6F8); val faint = Color(0x57F6F6F8)
    val line = Color(0x14FFFFFF); val line2 = Color(0x24FFFFFF)
}

val Display = FontFamily(Font(R.font.clash_semibold, FontWeight.SemiBold), Font(R.font.clash_medium, FontWeight.Medium))
val Sans = FontFamily(Font(R.font.satoshi_regular, FontWeight.Normal), Font(R.font.satoshi_medium, FontWeight.Medium), Font(R.font.satoshi_bold, FontWeight.Bold))
val Mono = FontFamily(Font(R.font.jetbrains_mono, FontWeight.Normal), Font(R.font.jetbrains_mono, FontWeight.Bold))

@Composable
fun T(
    s: String, size: TextUnit = 15.sp, color: Color = C.text, family: FontFamily = Sans, weight: FontWeight = FontWeight.Normal,
    modifier: Modifier = Modifier, lines: Int = 1, spacing: TextUnit = TextUnit.Unspecified, lineHeight: TextUnit = TextUnit.Unspecified,
) = Text(
    s, modifier, color = color, maxLines = lines, overflow = TextOverflow.Ellipsis,
    style = TextStyle(fontFamily = family, fontSize = size, fontWeight = weight, letterSpacing = spacing, lineHeight = lineHeight),
)

// Small dot-matrix label: the app's signature type.
@Composable
fun Label(s: String, color: Color = C.faint, modifier: Modifier = Modifier, size: TextUnit = 10.sp) =
    T(s.uppercase(), size, color, Mono, FontWeight.Bold, modifier, spacing = 1.6.sp)

fun Modifier.glass(shape: Shape = RoundedCornerShape(20.dp), fill: Color = Color(0x0DFFFFFF)) =
    clip(shape).background(fill).border(1.dp, C.line, shape)

// Generative line art in the track's colours (port of the web's flow.ts).
@Composable
fun FlowArt(pattern: Pattern, colors: Pair<Color, Color>, seed: String, modifier: Modifier = Modifier, animate: Boolean = false, energy: Float = 1f, density: Float = 1f) {
    val base = remember(seed) { rng(seed)() * 20 }
    val t = clock(animate, 24)
    Canvas(modifier) { drawFlow(seed, colors, pattern, base + t, energy, density) }
}

private val GLYPHS = mapOf(
    "heart" to listOf(".XX.XX.", "XXXXXXX", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."),
    "fire" to listOf("...X...", "..XX...", "..XXX.X", ".XXXXXX", "XXX.XXX", "XX...XX", ".XXXXX."),
    "bolt" to listOf("....XX.", "...XX..", "..XX...", ".XXXXX.", "...XX..", "..XX...", ".XX...."),
    "star" to listOf("...X...", "...X...", "XXXXXXX", ".XXXXX.", "..XXX..", ".XX.XX.", "X.....X"),
    "note" to listOf("...XXXX", "...X..X", "...X..X", "...X..X", ".XXX.XX", "XXXXXXX", ".XX..XX"),
    "wave" to listOf(".......", "X.....X", "XX...XX", ".XX.XX.", "..XXX..", "...X...", "......."),
    "sad" to listOf(".XXXXX.", "X.....X", "X.X.X.X", "X.....X", "X.XXX.X", "XX...XX", ".XXXXX."),
    "radio" to listOf("......X", "....XX.", "XXXXXXX", "X.....X", "X.XX..X", "X.XX..X", "XXXXXXX"),
)

@Composable
fun DotGlyph(id: String, color: Color, size: Dp, modifier: Modifier = Modifier, pulse: Boolean = false) {
    val rows = GLYPHS[id] ?: return
    val t = clock(pulse, 30)
    Canvas(modifier.size(size)) {
        val cell = this.size.width / 7
        rows.forEachIndexed { y, row -> row.forEachIndexed { x, ch ->
            if (ch == 'X') {
                val k = if (pulse) 0.5f + 0.5f * cos((t / 1.8f - (x + y) * 0.045f) * 2 * PI.toFloat()) else 1f
                drawCircle(color, cell * 0.42f * (0.55f + 0.45f * k), Offset(x * cell + cell / 2, y * cell + cell / 2), alpha = 0.45f + 0.55f * k)
            }
        } }
    }
}

// Cover: real artwork when there is one, generated art otherwise (and behind it while loading).
@Composable
fun Cover(t: Track, modifier: Modifier = Modifier, shape: Shape = RoundedCornerShape(12.dp), hq: Boolean = false) {
    val colors = colorsFor(t.id)
    val pattern = patternFor(t.id)
    Box(modifier.clip(shape)) {
        FlowArt(pattern, colors, t.id, Modifier.fillMaxSize())
        val src = if (t.kind == Kind.SONG) YouTube.thumb(t.url, if (hq) "hq" else "mq") else t.art
        if (t.kind == Kind.SONG) SubcomposeAsyncImage(src, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop, error = {}, loading = {})
        else Box(Modifier.align(Alignment.Center).fillMaxSize(0.56f).clip(RoundedCornerShape(22)).background(Color(0xB3050507)), Alignment.Center) {
            if (src.isNotEmpty()) SubcomposeAsyncImage(src, null, Modifier.fillMaxSize().padding(6.dp).clip(RoundedCornerShape(16)), contentScale = ContentScale.Crop, error = { DotGlyph("radio", Color.White, 22.dp) }, loading = { DotGlyph("radio", Color.White, 22.dp) })
            else DotGlyph("radio", Color.White, 22.dp)
        }
    }
}


// Equaliser bars for the playing row.
@Composable
fun Eq(color: Color, playing: Boolean, modifier: Modifier = Modifier) {
    val tr = rememberInfiniteTransition(label = "eq")
    Row(modifier.height(14.dp), horizontalArrangement = Arrangement.spacedBy(2.dp), verticalAlignment = Alignment.Bottom) {
        listOf(420, 300, 520, 360).forEachIndexed { i, ms ->
            val v by tr.animateFloat(0.25f, 1f, infiniteRepeatable(tween(ms), RepeatMode.Reverse), label = "b$i")
            Box(Modifier.width(3.dp).fillMaxHeight(if (playing) v else 0.3f).clip(RoundedCornerShape(2.dp)).background(color))
        }
    }
}

@Composable
fun LiveDot(color: Color = Color(0xFF2BD94A)) {
    val a by rememberInfiniteTransition(label = "live").animateFloat(0.35f, 1f, infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "a")
    Box(Modifier.size(7.dp).clip(RoundedCornerShape(50)).background(color.copy(alpha = a)))
}

@Composable
fun Gap(h: Dp = 0.dp, w: Dp = 0.dp) = Spacer(Modifier.height(h).width(w))

fun fmt(sec: Long): String = if (sec <= 0) "0:00" else if (sec >= 3600) "%d:%02d:%02d".format(sec / 3600, sec / 60 % 60, sec % 60) else "%d:%02d".format(sec / 60, sec % 60)

