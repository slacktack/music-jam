package app.jam.music.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameMillis
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.jam.music.Pattern
import app.jam.music.hash
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

private const val TAU = (PI * 2).toFloat()

// Same xorshift as the web's color.ts, so every seed draws the same art on both.
fun rng(seed: String): () -> Float {
    var s = hash(seed).toInt().let { if (it == 0) 1 else it }
    return {
        s = s xor (s shl 13); s = s xor (s ushr 17); s = s xor (s shl 5)
        ((s.toLong() and 0xFFFFFFFFL) % 100000).toFloat() / 100000f
    }
}

private val PATTERNS = listOf(Pattern.WAVES, Pattern.ZIGZAG, Pattern.RINGS, Pattern.CONTOUR, Pattern.GRID, Pattern.RAYS)
fun patternFor(seed: String) = PATTERNS[floor(rng(seed + "p")() * PATTERNS.size).toInt()]

// Seconds since composition, ticking only while `on`.
@Composable
fun clock(on: Boolean, fps: Int = 30): Float {
    var t by remember { mutableFloatStateOf(0f) }
    if (on) LaunchedEffect(Unit) {
        val start = withFrameMillis { it }
        var last = 0L
        while (true) withFrameMillis { now -> if (now - last >= 1000 / fps) { last = now; t = (now - start) / 1000f } }
    }
    return t
}

// Port of the web's drawFlow: thick gradient line art per pattern.
fun DrawScope.drawFlow(seed: String, colors: Pair<Color, Color>, pattern: Pattern, t: Float, e: Float = 1f, d: Float = 1f, bg: Color? = Color(0xFF060608)) {
    val r = rng(seed + pattern.name.lowercase())
    val w = size.width; val h = size.height
    if (bg != null) drawRect(bg)
    val ang = r() * TAU
    val brush = Brush.linearGradient(
        0.15f to colors.first, 0.85f to colors.second,
        start = Offset(w / 2 - cos(ang) * w, h / 2 - sin(ang) * h), end = Offset(w / 2 + cos(ang) * w, h / 2 + sin(ang) * h),
    )
    val ph = r() * 100
    fun line(p: Path, width: Float, alpha: Float = 1f) = drawPath(p, brush, alpha, Stroke(width, cap = StrokeCap.Round, join = StrokeJoin.Round))
    when (pattern) {
        Pattern.WAVES -> {
            val n = (12 * d).roundToInt(); val gap = w / n
            val f1 = 1.2f + r() * 1.6f; val f2 = 3 + r() * 3
            for (i in -1..n) {
                val x0 = (i + 0.5f) * gap; val p = Path(); var y = -10f
                while (y <= h + 10) {
                    val u = y / h
                    val x = x0 + sin(u * f1 * PI.toFloat() + t * 0.9f + i * 0.32f + ph) * gap * 0.55f * e + sin(u * f2 * PI.toFloat() - t * 1.4f + i * 0.9f) * gap * 0.18f * e
                    if (y == -10f) p.moveTo(x, y) else p.lineTo(x, y); y += 5
                }
                line(p, gap * 0.34f)
            }
        }
        Pattern.ZIGZAG -> {
            val n = (15 * d).roundToInt(); val gap = h / n; val cx = w * (0.3f + r() * 0.4f); val steps = 12
            for (i in -1..n) {
                val y0 = (i + 0.5f) * gap; val p = Path()
                for (k in 0..steps) {
                    val x = k.toFloat() / steps * (w + 40) - 20
                    val fall = exp(-((x - cx) / (w * 0.32f)).let { it * it })
                    val amp = gap * 1.25f * e * fall * (0.55f + 0.45f * sin(t * 1.6f + i * 0.45f + k * 0.6f + ph))
                    val y = y0 + if (k % 2 == 1) amp else -amp * 0.4f
                    if (k == 0) p.moveTo(x, y) else p.lineTo(x, y)
                }
                line(p, gap * 0.3f)
            }
        }
        Pattern.RINGS -> {
            val cx = w * (0.4f + r() * 0.2f); val cy = h * (0.4f + r() * 0.2f)
            val maxR = hypot(max(cx, w - cx), max(cy, h - cy)); val step = min(w, h) / (9 * d)
            val lobes = 3 + floor(r() * 4).toInt()
            var i = 1; var rad = step
            while (rad < maxR + step) {
                val p = Path(); var a = 0f
                while (a <= TAU + 0.01f) {
                    val rr = rad + sin(a * lobes + t * 1.1f - i * 0.5f + ph) * step * 0.42f * e * min(1f, i / 3f)
                    val x = cx + cos(a) * rr; val y = cy + sin(a) * rr
                    if (a == 0f) p.moveTo(x, y) else p.lineTo(x, y); a += TAU / 72
                }
                p.close(); line(p, step * 0.36f); i++; rad += step
            }
        }
        Pattern.RAYS -> {
            val cx = w / 2; val cy = h * 0.52f; val m = min(w, h)
            val R = m * (0.16f + 0.02f * sin(t * 2) * e)
            drawCircle(brush, R, Offset(cx, cy))
            for (j in 0 until 40) {
                val a = j / 40f * TAU + t * 0.08f
                val len = m * (0.12f + 0.2f * (0.5f + 0.5f * sin(t * 2.2f * e + j * 1.7f + ph)))
                val r0 = R * 1.35f
                drawLine(brush, Offset(cx + cos(a) * r0, cy + sin(a) * r0), Offset(cx + cos(a) * (r0 + len), cy + sin(a) * (r0 + len)), max(1.5f, m * 0.012f), StrokeCap.Round)
            }
            for (i in 0 until 6) {
                val y0 = h * 0.8f + i * h * 0.035f; val p = Path(); var x = -10f
                while (x <= w + 10) { val y = y0 + sin(x * 0.03f + t * 2 + i) * h * 0.008f * (1 + e); if (x == -10f) p.moveTo(x, y) else p.lineTo(x, y); x += 6 }
                line(p, max(2f, h * 0.018f), 1 - i / 7f)
            }
        }
        Pattern.CONTOUR -> {
            val n = (16 * d).roundToInt(); val gap = h / n; val f1 = 1 + r() * 2; val bx = w * r()
            for (i in -1..n) {
                val y0 = (i + 0.5f) * gap; val p = Path(); var x = -10f
                while (x <= w + 10) {
                    val bump = exp(-((x - bx) / (w * 0.25f)).let { it * it }) * gap * 2.2f * e * sin(t * 0.8f + i * 0.25f)
                    val y = y0 + sin(x / w * f1 * TAU + t * 0.7f + i * 0.2f + ph) * gap * 0.45f * e + bump
                    if (x == -10f) p.moveTo(x, y) else p.lineTo(x, y); x += 6
                }
                line(p, gap * 0.32f)
            }
        }
        Pattern.GRID -> {
            val step = min(w, h) / (11 * d); val cx = w * (0.3f + r() * 0.4f); val cy = h * (0.3f + r() * 0.4f)
            var y = step / 2
            while (y < h) {
                var x = step / 2
                while (x < w) {
                    val s = 0.5f + 0.5f * sin(hypot(x - cx, y - cy) / step * 0.9f - t * 2.4f * e + ph)
                    drawCircle(brush, step * (0.1f + 0.34f * s), Offset(x, y), alpha = 0.25f + 0.75f * s)
                    x += step
                }
                y += step
            }
        }
    }
}

// 5x7 dot font, same letterforms as the web.
val FONT: Map<Char, List<String>> = mapOf(
    'A' to listOf(".XXX.", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"),
    'B' to listOf("XXXX.", "X...X", "X...X", "XXXX.", "X...X", "X...X", "XXXX."),
    'C' to listOf(".XXX.", "X...X", "X....", "X....", "X....", "X...X", ".XXX."),
    'D' to listOf("XXXX.", "X...X", "X...X", "X...X", "X...X", "X...X", "XXXX."),
    'E' to listOf("XXXXX", "X....", "X....", "XXXX.", "X....", "X....", "XXXXX"),
    'F' to listOf("XXXXX", "X....", "X....", "XXXX.", "X....", "X....", "X...."),
    'G' to listOf(".XXX.", "X...X", "X....", "X.XXX", "X...X", "X...X", ".XXXX"),
    'H' to listOf("X...X", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"),
    'I' to listOf("XXXXX", "..X..", "..X..", "..X..", "..X..", "..X..", "XXXXX"),
    'J' to listOf("..XXX", "....X", "....X", "....X", "X...X", "X...X", ".XXX."),
    'K' to listOf("X...X", "X..X.", "X.X..", "XX...", "X.X..", "X..X.", "X...X"),
    'L' to listOf("X....", "X....", "X....", "X....", "X....", "X....", "XXXXX"),
    'M' to listOf("X...X", "XX.XX", "X.X.X", "X.X.X", "X...X", "X...X", "X...X"),
    'N' to listOf("X...X", "XX..X", "X.X.X", "X..XX", "X...X", "X...X", "X...X"),
    'O' to listOf(".XXX.", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."),
    'P' to listOf("XXXX.", "X...X", "X...X", "XXXX.", "X....", "X....", "X...."),
    'Q' to listOf(".XXX.", "X...X", "X...X", "X...X", "X.X.X", "X..X.", ".XX.X"),
    'R' to listOf("XXXX.", "X...X", "X...X", "XXXX.", "X.X..", "X..X.", "X...X"),
    'S' to listOf(".XXXX", "X....", "X....", ".XXX.", "....X", "....X", "XXXX."),
    'T' to listOf("XXXXX", "..X..", "..X..", "..X..", "..X..", "..X..", "..X.."),
    'U' to listOf("X...X", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."),
    'V' to listOf("X...X", "X...X", "X...X", "X...X", "X...X", ".X.X.", "..X.."),
    'W' to listOf("X...X", "X...X", "X...X", "X.X.X", "X.X.X", "XX.XX", "X...X"),
    'X' to listOf("X...X", "X...X", ".X.X.", "..X..", ".X.X.", "X...X", "X...X"),
    'Y' to listOf("X...X", "X...X", ".X.X.", "..X..", "..X..", "..X..", "..X.."),
    'Z' to listOf("XXXXX", "....X", "...X.", "..X..", ".X...", "X....", "XXXXX"),
    '0' to listOf(".XXX.", "X...X", "X..XX", "X.X.X", "XX..X", "X...X", ".XXX."),
    '1' to listOf("..X..", ".XX..", "..X..", "..X..", "..X..", "..X..", ".XXX."),
    '2' to listOf(".XXX.", "X...X", "....X", "...X.", "..X..", ".X...", "XXXXX"),
    '3' to listOf("XXXX.", "....X", "....X", ".XXX.", "....X", "....X", "XXXX."),
    '4' to listOf("...X.", "..XX.", ".X.X.", "X..X.", "XXXXX", "...X.", "...X."),
    '5' to listOf("XXXXX", "X....", "XXXX.", "....X", "....X", "X...X", ".XXX."),
    '6' to listOf("..XX.", ".X...", "X....", "XXXX.", "X...X", "X...X", ".XXX."),
    '7' to listOf("XXXXX", "....X", "...X.", "..X..", ".X...", ".X...", ".X..."),
    '8' to listOf(".XXX.", "X...X", "X...X", ".XXX.", "X...X", "X...X", ".XXX."),
    '9' to listOf(".XXX.", "X...X", "X...X", ".XXXX", "....X", "...X.", ".XX.."),
    '\'' to listOf("..X..", "..X..", ".....", ".....", ".....", ".....", "....."),
    '.' to listOf(".....", ".....", ".....", ".....", ".....", ".....", "..X.."),
    ':' to listOf(".....", "..X..", ".....", ".....", ".....", "..X..", "....."),
    '-' to listOf(".....", ".....", ".....", ".XXX.", ".....", ".....", "....."),
    ' ' to listOf(".....", ".....", ".....", ".....", ".....", ".....", "....."),
)

private fun glyphs(text: String) = text.uppercase().map { FONT[it] ?: FONT[' ']!! }

// Crisp vector dot-matrix word with an optional glow.
@Composable
fun DotWord(value: String, height: Dp, color: Color, modifier: Modifier = Modifier, glow: Boolean = false) {
    val chars = glyphs(value)
    val cols = chars.size * 6 - 1
    Canvas(modifier.size(height * cols / 7f, height)) {
        val u = size.height / 7
        chars.forEachIndexed { i, rows -> rows.forEachIndexed { y, row -> row.forEachIndexed { x, c ->
            if (c == 'X') {
                val o = Offset((i * 6 + x + 0.5f) * u, (y + 0.5f) * u)
                if (glow) drawCircle(color.copy(alpha = 0.22f), u * 0.95f, o)
                drawCircle(color, u * 0.44f, o)
            }
        } } }
    }
}

// The hero: big dot-matrix headline that breathes, follows the finger and ripples on tap.
private class Dot(val x: Float, val y: Float, val on: Boolean, val col: Float) { var r = 1f; var g = 1f; var b = 1f }

private class DotState {
    var key = ""; var step = 8f; var dots = emptyList<Dot>()
    var px = -1e4f; var py = -1e4f; var pk = 0f; var last = 0L
    val ripples = mutableListOf<Triple<Float, Float, Long>>()
}

@Composable
fun DotText(text: String, colors: List<Color>, modifier: Modifier = Modifier, energy: Float = 0f) {
    val st = remember { DotState() }
    val t = clock(true, 45)
    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(4200)
            if (System.currentTimeMillis() - st.last > 3000 && st.dots.isNotEmpty()) {
                val w = st.dots.last().x; val h = st.dots.last().y
                st.ripples += Triple(w * (0.2f + Math.random().toFloat() * 0.6f), h * (0.3f + Math.random().toFloat() * 0.4f), System.currentTimeMillis())
            }
        }
    }
    Canvas(
        modifier.pointerInput(Unit) {
            awaitPointerEventScope {
                while (true) {
                    val ev = awaitPointerEvent()
                    val p = ev.changes.firstOrNull() ?: continue
                    st.px = p.position.x; st.py = p.position.y; st.last = System.currentTimeMillis()
                    if (p.pressed && !p.previousPressed) st.ripples += Triple(st.px, st.py, st.last)
                }
            }
        },
    ) {
        val w = size.width; val h = size.height
        val S = 2; val chars = glyphs(text); val CW = 5 * S; val GAP = 2; val ROWS = 7 * S
        val cols = chars.size * (CW + GAP) - GAP
        val key = "${w}x$h|$text"
        if (key != st.key) {
            st.key = key
            val pad = 1.6f
            st.step = min(w / (cols + pad * 2), h / (ROWS + pad * 2))
            val gw = floor(w / st.step).toInt(); val gh = floor(h / st.step).toInt()
            val ox = (w - gw * st.step) / 2 + st.step / 2; val oy = (h - gh * st.step) / 2 + st.step / 2
            val c0 = ((gw - cols) / 2f).roundToInt(); val r0 = ((gh - ROWS) / 2f).roundToInt()
            st.dots = buildList {
                for (gy in 0 until gh) for (gx in 0 until gw) {
                    val lx = gx - c0; val ly = gy - r0; val cx = lx % (CW + GAP)
                    val on = ly in 0 until ROWS && lx in 0 until cols && cx < CW && chars[lx / (CW + GAP)][ly / S][cx / S] == 'X'
                    add(Dot(ox + gx * st.step, oy + gy * st.step, on, (lx.toFloat() / max(1, cols - 1)).coerceIn(0f, 1f)))
                }
            }
        }
        val now = System.currentTimeMillis()
        val idle = now - st.last > 2200
        val px = if (idle) w * (0.5f + 0.42f * sin(t * 0.55f)) else st.px
        val py = if (idle) h * (0.5f + 0.35f * sin(t * 1.3f)) else st.py
        st.pk += ((if (idle) 0.5f else 1f) - st.pk) * 0.08f
        val step = st.step; val R = step * 10
        st.ripples.removeAll { now - it.third > 1400 }
        for (d in st.dots) {
            val f = d.col * (colors.size - 1)
            val i = min(colors.size - 2, floor(f).toInt()).coerceAtLeast(0)
            val target = lerp(colors[i], colors[min(colors.size - 1, i + 1)], f - i)
            d.r += (target.red - d.r) * 0.05f; d.g += (target.green - d.g) * 0.05f; d.b += (target.blue - d.b) * 0.05f
            var k = max(0f, 1 - hypot(d.x - px, d.y - py) / R) * st.pk
            for ((rx, ry, t0) in st.ripples) {
                val age = (now - t0) / 1400f
                val ring = abs(hypot(d.x - rx, d.y - ry) - age * w * 0.9f)
                k = max(k, max(0f, 1 - ring / (step * 1.8f)) * (1 - age))
            }
            val wave = 0.5f + 0.5f * sin(d.x * 0.02f + d.y * 0.012f - t * 2.4f)
            val beat = if (energy > 0) 0.5f + 0.5f * sin(t * 7 - d.col * 9) else 0f
            val c = Color(d.r.coerceIn(0f, 1f), d.g.coerceIn(0f, 1f), d.b.coerceIn(0f, 1f))
            if (d.on) drawCircle(if (k > 0.6f) Color.White else c, step * (0.36f + 0.03f * wave + 0.08f * k + 0.04f * beat * energy), Offset(d.x, d.y), alpha = (0.82f + 0.18f * max(wave, k)).coerceAtMost(1f))
            else drawCircle(c, step * (0.1f + 0.2f * k), Offset(d.x, d.y), alpha = (0.07f + 0.45f * k).coerceAtMost(1f))
        }
    }
}

// Identicon: mirrored 5x5 dots from the user's key.
@Composable
fun DotAvatar(seed: String, color: Color, size: Dp, modifier: Modifier = Modifier) {
    val cells = remember(seed) {
        val r = rng(seed)
        buildList { for (y in 0 until 5) for (x in 0 until 3) if (r() > 0.45f) { add(x to y); if (x < 2) add(4 - x to y) } }.ifEmpty { listOf(2 to 2) }
    }
    Canvas(modifier.size(size)) {
        val s = this.size.width / 40
        drawCircle(color, 20 * s, alpha = 0.18f)
        cells.forEach { (x, y) -> drawCircle(color, 2.1f * s, Offset((10 + x * 5) * s, (10 + y * 5) * s)) }
    }
}

// Dot-matrix equaliser used while loading.
@Composable
fun DotLoader(label: String, color: Color) {
    val t = clock(true, 30)
    Column(Modifier.fillMaxWidth().padding(vertical = 30.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Canvas(Modifier.size(111.dp, 85.dp)) {
            val cell = size.width / 9
            for (c in 0 until 9) {
                val ph = ((t - c * 0.09f) / 1.1f) % 1f
                val lvl = 1.5f + (0.5f - 0.5f * cos(ph * TAU)) * 5.5f
                for (r in 0 until 7) {
                    val a = when { r < floor(lvl) -> 1f; r < lvl -> 0.5f; else -> 0.1f }
                    drawCircle(color, cell * 0.3f, Offset(c * cell + cell / 2, size.height - (r * cell + cell / 2) * size.height / (7 * cell)), alpha = a)
                }
            }
        }
        Box(Modifier.height(12.dp))
        Label(label, C.mute, size = 11.sp)
    }
}


// Section rule: a row of faint dots with a lit band sweeping across.
@Composable
fun DotRule(accent: Color, modifier: Modifier = Modifier) {
    val t = clock(true, 30)
    Canvas(modifier.fillMaxWidth().height(4.dp)) {
        val gap = 9.dp.toPx(); val n = (size.width / gap).toInt()
        val sweep = ((t % 4.5f) / 4.5f) * (size.width + 120.dp.toPx()) - 120.dp.toPx()
        for (i in 0..n) {
            val x = i * gap + gap / 2
            val edge = min(1f, min(x, size.width - x) / (size.width * 0.15f))
            drawCircle(Color.White, 1.4.dp.toPx(), Offset(x, size.height / 2), alpha = 0.22f * edge)
            if (x in sweep..(sweep + 120.dp.toPx())) drawCircle(accent, 1.6.dp.toPx(), Offset(x, size.height / 2))
        }
    }
}

// Dotted orbit around the big play button; spins and pulses while playing.
@Composable
fun PlayOrbit(color: Color, on: Boolean, size: Dp) {
    val t = clock(on, 30)
    Canvas(Modifier.size(size)) {
        val c = center; val rad = this.size.minDimension / 2 - 4.dp.toPx()
        for (i in 0 until 36) {
            val a = i / 36f * TAU + (if (on) t * TAU / 14 else 0f)
            val pulse = if (on) 0.5f + 0.5f * sin(t * TAU / 1.2f - i * 0.5f) else 0f
            drawCircle(color, 1.6.dp.toPx() * (0.8f + 0.7f * pulse), Offset(c.x + cos(a) * rad, c.y + sin(a) * rad), alpha = 0.2f + 0.8f * pulse)
        }
    }
}

