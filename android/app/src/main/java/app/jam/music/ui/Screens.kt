package app.jam.music.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Shuffle
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.jam.music.Catalog
import app.jam.music.P
import androidx.compose.material3.Text
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.shadow
import kotlinx.coroutines.launch
import app.jam.music.Floor
import app.jam.music.Jam
import app.jam.music.Likes
import app.jam.music.Radio
import app.jam.music.Track
import app.jam.music.Vibe
import app.jam.music.YouTube
import kotlinx.coroutines.delay

interface Nav {
    fun open(v: Vibe)
    fun tab(name: String, arg: String = "")
    fun likes()
    fun player()
    fun back()
}

@Composable
fun Home(nav: Nav, bottom: PaddingValues) {
    val floor by Floor.state.collectAsState()
    val fests = remember { Catalog.sortedFestivals() }
    val nowFest = fests.firstOrNull { it.second.first == Catalog.FestState.NOW }?.first
    val p by Jam.state.collectAsState()
    val scope = rememberCoroutineScope()
    var cycle by remember { mutableIntStateOf(0) }
    LaunchedEffect(p.track == null) { while (p.track == null) { delay(4000); cycle++ } }
    val hero = p.track?.let { Catalog.trackColors(it.id, p.context).let { c -> listOf(c.first, c.second, P.magenta) } } ?: HERO_CYCLE[cycle % HERO_CYCLE.size]
    val accent = LocalAccent.current
    LazyColumn(Modifier.fillMaxSize(), contentPadding = bottom) {
        item {
            Box(Modifier.statusBarsPadding().fillMaxWidth()) {
                DotText("JAM", hero, Modifier.fillMaxWidth().height(150.dp).padding(horizontal = 8.dp), energy = if (p.status == app.jam.music.Status.PLAYING) 1f else 0f)
                Icon(Icons.Rounded.Favorite, "Likes", Modifier.align(Alignment.TopEnd).padding(6.dp).clip(CircleShape).clickable { nav.likes() }.padding(10.dp).size(22.dp), tint = C.text)
            }
        }
        item {
            Column(Modifier.padding(horizontal = 18.dp)) {
                Row(Modifier.clip(RoundedCornerShape(50)).clickable { nav.tab("floor") }.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (floor.status == "live") LiveDot() else Box(Modifier.size(7.dp).clip(CircleShape).background(C.faint))
                    Gap(w = 10.dp)
                    DotWord("%03d".format(floor.users.size), 20.dp, P.phosphor, glow = true)
                    Gap(w = 10.dp)
                    T(when (floor.status) { "live" -> "on the floor right now"; "connecting" -> "joining the floor…"; else -> "floor offline, music still works" }, 13.sp, C.mute)
                }
                Gap(10.dp)
                Text(
                    "Aaj kya sunoge?",
                    style = TextStyle(
                        brush = Brush.linearGradient(0.35f to C.text, 0.72f to accent.first, 1f to accent.second),
                        fontFamily = Display, fontWeight = FontWeight.SemiBold, fontSize = 48.sp, lineHeight = 48.sp, letterSpacing = (-0.8).sp,
                    ),
                )
                Gap(8.dp)
                T("Every free radio and every song, on one shared floor. No rooms, no sign-up.", 15.5.sp, C.mute, lines = 3, lineHeight = 21.sp)
                Gap(16.dp)
                Row(Modifier.fillMaxWidth().height(54.dp).clip(RoundedCornerShape(50)).background(Color(0x0FFFFFFF)).border(1.dp, C.line2, RoundedCornerShape(50)).clickable { nav.tab("search") }.padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Search, null, tint = C.faint, modifier = Modifier.size(18.dp))
                    Gap(w = 12.dp)
                    T("Songs, singers, stations, festivals…", 15.sp, C.faint)
                }
                Gap(18.dp)
            }
        }
        if (nowFest != null) item {
            Box(Modifier.padding(horizontal = 18.dp, vertical = 6.dp)) {
                Box(Modifier.fillMaxWidth().height(170.dp).clip(RoundedCornerShape(26.dp)).clickable { nav.open(nowFest) }) {
                    FlowArt(nowFest.pattern, nowFest.colors, nowFest.id, Modifier.fillMaxSize(), animate = true)
                    Column(Modifier.align(Alignment.BottomStart).padding(18.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) { LiveDot(); Gap(w = 8.dp); Label("Happening now", Color.White) }
                        T(nowFest.label, 34.sp, Color.White, Display, FontWeight.SemiBold)
                        T(nowFest.sub, 13.sp, Color.White.copy(alpha = 0.85f))
                    }
                    Box(Modifier.align(Alignment.BottomEnd).padding(16.dp).size(50.dp).clip(CircleShape).background(Color.White), Alignment.Center) {
                        Icon(Icons.Rounded.PlayArrow, "Open", tint = Color.Black, modifier = Modifier.size(28.dp))
                    }
                }
            }
        }
        item { Gap(14.dp); SectionHead("00", "One tap radio", onAction = { nav.tab("radio") }) }
        items(ONE_TAP.chunked(2)) { row ->
            Row(Modifier.padding(horizontal = 18.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { v -> TapCard(v, Modifier.weight(1f)) { scope.launch { playRadio(v); nav.player() } } }
            }
        }
        item { Gap(22.dp); SectionHead("01", "Desi first") }
        val desi = Catalog.vibes.filter { it.desi }
        item {
            LazyRow(contentPadding = PaddingValues(horizontal = 18.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                items(desi.take(3)) { v -> BigTile(v, Modifier.width(250.dp), onPlay = { scope.launch { playSongs(v); nav.player() } }) { nav.open(v) } }
            }
            Gap(10.dp)
        }
        items(desi.drop(3).take(6).chunked(2)) { row -> TileRow(row, nav) }
        item { Gap(22.dp); SectionHead("02", "Voices", action = "${Catalog.artists.size}") }
        item {
            LazyRow(contentPadding = PaddingValues(horizontal = 14.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                items(Catalog.artists) { a -> ArtistBubble(a) { nav.open(a) } }
            }
        }
        item { Gap(22.dp); SectionHead("03", "Trending in India", action = "More", onAction = { nav.open(Catalog.vibes[0]) }) }
        item {
            val l = rememberLoad("trend") { YouTube.search(Catalog.vibes[0].songs) }
            LoadView(l) { list -> Column { list.take(6).forEach { TrackRow(it, list, "Hindi") } } }
        }
        item { Gap(22.dp); SectionHead("04", "Festivals & moods") }
        item {
            LazyRow(contentPadding = PaddingValues(horizontal = 18.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                items(fests) { (f, _) -> FestCard(f) { nav.open(f) } }
            }
        }
        if (floor.spots.isNotEmpty()) {
            item { Gap(22.dp); SectionHead("05", "Live on the floor", action = "Floor", onAction = { nav.tab("floor") }) }
            item {
                LazyRow(contentPadding = PaddingValues(horizontal = 18.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(floor.spots.take(10)) { s -> SpotCard(s) }
                }
            }
        }
        item { Gap(22.dp); SectionHead("06", "More desi") }
        items(desi.drop(9).chunked(2)) { row -> TileRow(row, nav) }
        item { Gap(22.dp); SectionHead("07", "Around the world") }
        items(Catalog.vibes.filter { !it.desi }.chunked(2)) { row -> TileRow(row, nav) }
        item { Gap(30.dp) }
    }
}

object P2 { val saffron = Color(0xFFFF8A00) }

private val HERO_CYCLE = listOf(
    listOf(P.saffron, P.red, P.magenta), listOf(P.phosphor, P.lime, P.marigold),
    listOf(P.marigold, P.magenta, P.violet), listOf(P.cyan, P.indigo, P.magenta),
)
private val ONE_TAP = listOf("hindi", "punjabi", "retro-hindi", "bhakti").map { id -> Catalog.vibes.first { it.id == id } }

private suspend fun playRadio(v: Vibe) {
    val list = runCatching { Radio.stations(v.radio) }.getOrElse { app.jam.music.Toasts.show("Couldn't reach the radio directory."); return }
    if (list.isNotEmpty()) Jam.play(list[0], list, "${v.label} radio")
}

private suspend fun playSongs(v: Vibe) {
    val list = runCatching { YouTube.search(v.songs) }.getOrElse { app.jam.music.Toasts.show("Couldn't load songs."); return }
    if (list.isNotEmpty()) Jam.play(list[0], list, v.label)
}

@Composable
private fun TapCard(v: Vibe, modifier: Modifier, onClick: () -> Unit) {
    Box(modifier.height(112.dp).clip(RoundedCornerShape(22.dp)).background(Color(0xFF08080B)).border(1.dp, C.line, RoundedCornerShape(22.dp)).clickable(onClick = onClick)) {
        Row(Modifier.fillMaxSize()) {
            Box(Modifier.weight(0.35f))
            FlowArt(v.pattern, v.colors, v.id + "tap", Modifier.weight(0.65f).fillMaxHeight().alpha(0.85f), energy = 0.6f, density = 0.6f)
        }
        Box(Modifier.fillMaxSize().background(Brush.horizontalGradient(0.3f to Color(0xFF08080B), 1f to Color(0x3308080B))))
        Box(Modifier.align(Alignment.TopEnd).padding(12.dp).size(38.dp).shadow(14.dp, CircleShape, spotColor = v.colors.first).clip(CircleShape).background(Color.White), Alignment.Center) {
            Icon(Icons.Rounded.PlayArrow, "Play", tint = Color.Black, modifier = Modifier.size(22.dp))
        }
        Column(Modifier.align(Alignment.BottomStart).padding(14.dp)) {
            T(v.label, 21.sp, Color.White, Display, FontWeight.SemiBold)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(6.dp).clip(CircleShape).background(P.phosphor)); Gap(w = 6.dp)
                T("RADIO · SCREEN-OFF OK", 9.5.sp, v.colors.first, Mono, FontWeight.Bold, spacing = 1.1.sp)
            }
        }
    }
}

@Composable
private fun TileRow(row: List<Vibe>, nav: Nav) {
    Row(Modifier.padding(horizontal = 18.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        row.forEach { v -> VibeTile(v, Modifier.weight(1f)) { nav.open(v) } }
        if (row.size == 1) Box(Modifier.weight(1f))
    }
}

@Composable
fun Logo() {
    Row(verticalAlignment = Alignment.CenterVertically) {
        T("JAM", 26.sp, family = Mono, weight = FontWeight.Bold, spacing = 2.sp, color = P2.saffron)
        Box(Modifier.padding(start = 3.dp, bottom = 14.dp).size(7.dp).clip(CircleShape).background(Color(0xFF2BD94A)))
    }
}

@Composable
fun Header(title: String, nav: Nav, sub: String? = null) {
    Row(Modifier.statusBarsPadding().fillMaxWidth().padding(start = 6.dp, end = 18.dp, top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Back", Modifier.clip(CircleShape).clickable { nav.back() }.padding(12.dp), tint = C.text)
        Column {
            T(title, 22.sp, family = Display, weight = FontWeight.SemiBold)
            if (sub != null) T(sub, 12.sp, C.mute)
        }
    }
}

@Composable
fun Collection(v: Vibe, nav: Nav, bottom: PaddingValues) {
    var tab by rememberSaveable(v.id) { mutableStateOf(if (v.songs.isEmpty() || v.type == "tab") 1 else 0) }
    val songs = rememberLoad(v.id, "s") { if (v.songs.isEmpty()) emptyList() else YouTube.search(v.songs) }
    val radio = rememberLoad(v.id, "r") { Radio.stations(v.radio) }
    val ctx = if (tab == 1) "${v.label} radio" else v.label
    LazyColumn(Modifier.fillMaxSize(), contentPadding = bottom) {
        item {
            Box(Modifier.fillMaxWidth().height(300.dp)) {
                FlowArt(v.pattern, v.colors, v.id, Modifier.fillMaxSize(), animate = true)
                Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, C.bg), startY = 300f)))
                Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Back", Modifier.statusBarsPadding().padding(6.dp).clip(CircleShape).background(Color(0x66000000)).clickable { nav.back() }.padding(12.dp), tint = Color.White)
                Column(Modifier.align(Alignment.BottomStart).padding(18.dp)) {
                    Label(when (v.type) { "artist" -> "Voice"; "fest" -> "Festival & mood"; "tab" -> "Radio"; else -> if (v.desi) "Desi" else "Genre" }, Color.White.copy(alpha = 0.8f))
                    T(v.label, 44.sp, Color.White, Display, FontWeight.SemiBold, lineHeight = 46.sp)
                    T(v.sub, 14.sp, Color.White.copy(alpha = 0.8f))
                }
            }
        }
        item {
            Row(Modifier.padding(horizontal = 18.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (v.songs.isNotEmpty()) Chip("Songs", tab == 0, v.colors) { tab = 0 }
                Chip("Live radio", tab == 1, v.colors) { tab = 1 }
                Box(Modifier.weight(1f))
                val list = ((if (tab == 0) songs else radio).state as? Load.Ok)?.v.orEmpty()
                if (list.isNotEmpty()) {
                    Icon(Icons.Rounded.Shuffle, "Shuffle", Modifier.clip(CircleShape).clickable { val s = list.shuffled(); Jam.play(s[0], s, ctx); nav.player() }.padding(10.dp), tint = C.mute)
                    Box(Modifier.size(52.dp).clip(CircleShape).background(Brush.linearGradient(v.colors.toList())).clickable { Jam.play(list[0], list, ctx); nav.player() }, Alignment.Center) {
                        Icon(Icons.Rounded.PlayArrow, "Play all", tint = Color.Black, modifier = Modifier.size(30.dp))
                    }
                }
            }
        }
        item {
            val l = if (tab == 0) songs else radio
            LoadView(l, empty = { Empty("radio", "Nothing on air", "Try another vibe.") }) { list ->
                Column { list.forEach { TrackRow(it, list, ctx) } }
            }
        }
    }
}

@Composable
fun RadioHub(nav: Nav, bottom: PaddingValues, initial: String) {
    var sel by rememberSaveable { mutableStateOf(initial.ifEmpty { "india" }) }
    LaunchedEffect(initial) { if (initial.isNotEmpty()) sel = initial }
    val tab = Catalog.radioTabs.first { it.id == sel }
    val l = rememberLoad(sel) { Radio.stations(tab.radio) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = bottom) {
        item {
            val p by Jam.state.collectAsState()
            val playing = p.status == app.jam.music.Status.PLAYING
            Column(Modifier.statusBarsPadding().padding(horizontal = 18.dp, vertical = 10.dp)) {
                DotText("LIVE", if (playing && p.track != null) Catalog.trackColors(p.track!!.id, p.context).let { listOf(it.first, it.second, P.magenta) } else listOf(P.phosphor, P.lime, P.cyan), Modifier.fillMaxWidth().height(110.dp), energy = if (playing) 1f else 0f)
                T("Radio & FM", 40.sp, family = Display, weight = FontWeight.SemiBold)
                T("Thousands of live stations. They keep playing with your screen off, so this is the one for the gym, the drive and the night.", 14.sp, C.mute, lines = 3, lineHeight = 19.sp)
            }
        }
        item {
            LazyRow(contentPadding = PaddingValues(horizontal = 18.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(Catalog.radioTabs) { t -> Chip(t.label, t.id == sel, t.colors) { sel = t.id } }
            }
            Gap(10.dp)
        }
        item {
            Box(Modifier.padding(horizontal = 18.dp, vertical = 6.dp).fillMaxWidth().height(110.dp).clip(RoundedCornerShape(22.dp))) {
                FlowArt(tab.pattern, tab.colors, tab.id, Modifier.fillMaxSize(), animate = true)
                Column(Modifier.align(Alignment.BottomStart).padding(16.dp)) {
                    T(tab.label, 28.sp, Color.White, Display, FontWeight.SemiBold)
                    T(tab.sub, 13.sp, Color.White.copy(alpha = 0.85f))
                }
                val list = (l.state as? Load.Ok)?.v.orEmpty()
                if (list.isNotEmpty()) Box(Modifier.align(Alignment.CenterEnd).padding(16.dp).size(52.dp).clip(CircleShape).background(Color.White).clickable { Jam.play(list[0], list, "${tab.label} radio"); nav.player() }, Alignment.Center) {
                    Icon(Icons.Rounded.PlayArrow, "Play", tint = Color.Black, modifier = Modifier.size(30.dp))
                }
            }
        }
        item {
            LoadView(l, empty = { Empty("radio", "Nothing on air", "Try another tab.") }) { list -> Column { list.forEach { TrackRow(it, list, "${tab.label} radio") } } }
        }
    }
}

@Composable
fun SearchBox(q: String, hint: String, onChange: (String) -> Unit, onSubmit: () -> Unit = {}, autofocus: Boolean = false) {
    val fr = remember { FocusRequester() }
    val fm = LocalFocusManager.current
    LaunchedEffect(Unit) { if (autofocus) runCatching { fr.requestFocus() } }
    Row(Modifier.fillMaxWidth().height(54.dp).glass(RoundedCornerShape(18.dp)).padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Rounded.Search, null, tint = C.mute)
        Gap(w = 12.dp)
        Box(Modifier.weight(1f)) {
            if (q.isEmpty()) T(hint, 15.sp, C.faint)
            BasicTextField(
                q, onChange, Modifier.fillMaxWidth().focusRequester(fr), singleLine = true,
                textStyle = TextStyle(color = C.text, fontSize = 16.sp, fontFamily = Sans), cursorBrush = SolidColor(P2.saffron),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search), keyboardActions = KeyboardActions(onSearch = { fm.clearFocus(); onSubmit() }),
            )
        }
        if (q.isNotEmpty()) Icon(Icons.Rounded.Close, "Clear", Modifier.clip(CircleShape).clickable { onChange("") }.padding(6.dp), tint = C.mute)
    }
}

@Composable
fun Search(nav: Nav, bottom: PaddingValues) {
    var q by rememberSaveable { mutableStateOf("") }
    var term by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(q) { delay(450); term = q.trim() }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = bottom) {
        item {
            Column(Modifier.statusBarsPadding().padding(horizontal = 18.dp, vertical = 14.dp)) {
                T("Search", 42.sp, family = Display, weight = FontWeight.SemiBold)
                Gap(12.dp)
                SearchBox(q, "Songs, singers, stations…", { q = it }, { term = q.trim() })
            }
        }
        if (term.length < 2) {
            item { SectionHead(null, "Festivals & moods") }
            item {
                LazyRow(contentPadding = PaddingValues(horizontal = 18.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(Catalog.sortedFestivals()) { (f, _) -> FestCard(f) { nav.open(f) } }
                }
            }
            item { Gap(18.dp); SectionHead(null, "Try a search") }
            item {
                LazyRow(contentPadding = PaddingValues(horizontal = 18.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(listOf("Arijit Singh", "Lo-fi", "Sidhu Moose Wala", "Mirchi", "Kishore Kumar", "Garba", "Bhajan", "AP Dhillon")) { s -> Chip(s, false) { q = s; term = s } }
                }
            }
            item { Gap(18.dp); SectionHead(null, "Languages & genres") }
            items(Catalog.vibes.chunked(2)) { row -> TileRow(row, nav) }
        } else {
            val hits = listOfNotNull(Catalog.findFestival(term), Catalog.findArtist(term), Catalog.findVibe(term))
            if (hits.isNotEmpty()) item {
                LazyRow(contentPadding = PaddingValues(horizontal = 18.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(hits) { v -> VibeTile(v, Modifier.size(200.dp, 100.dp), 100) { nav.open(v) } }
                }
            }
            item { SectionHead(null, "Songs") }
            item {
                val l = rememberLoad(term, "s") { YouTube.search(term) }
                LoadView(l, empty = { Empty("search", "No songs", "Try another spelling.") }) { list -> Column { list.take(12).forEach { TrackRow(it, list, "") } } }
            }
            item { Gap(14.dp); SectionHead(null, "Live stations") }
            item {
                val l = rememberLoad(term, "r") { Radio.search(term) }
                LoadView(l, empty = { Empty("radio", "No stations", "Nothing matched \"$term\".") }) { list -> Column { list.take(15).forEach { TrackRow(it, list, "") } } }
            }
        }
    }
}

@Composable
fun LikesScreen(nav: Nav, bottom: PaddingValues) {
    val likes by Likes.list.collectAsState()
    LazyColumn(Modifier.fillMaxSize(), contentPadding = bottom) {
        item { Header("Likes", nav, "${likes.size} saved") }
        if (likes.isEmpty()) item { Empty("heart", "Nothing liked yet", "Tap the heart on any song or station.", Color(0xFFE10600)) }
        else {
            item {
                Row(Modifier.padding(horizontal = 18.dp, vertical = 8.dp)) {
                    Chip("Play all", true, Color(0xFFFF2D95) to Color(0xFFFF8A00)) { Jam.play(likes[0], likes, "Likes"); nav.player() }
                }
            }
            items(likes, key = { it.id }) { TrackRow(it, likes, "Likes") }
        }
    }
}

@Composable
fun SpotCard(s: app.jam.music.Spot) {
    val c = app.jam.music.colorsFor(s.track.id)
    Column(Modifier.size(170.dp, 230.dp).glass().clickable { Jam.play(s.track, listOf(s.track), "Floor", s.at) }.padding(10.dp)) {
        Cover(s.track, Modifier.fillMaxWidth().height(130.dp))
        Gap(8.dp)
        T(s.track.title, 14.sp, weight = FontWeight.Bold)
        T(s.track.subtitle, 12.sp, C.mute)
        Box(Modifier.weight(1f))
        Row(verticalAlignment = Alignment.CenterVertically) {
            s.users.take(4).forEach { u -> Box(Modifier.padding(end = 3.dp).size(18.dp).clip(CircleShape).background(u.color)) }
            Gap(w = 4.dp)
            Label(if (s.users.size == 1) s.users[0].name.take(12) else "${s.users.size} here", c.first)
        }
    }
}

