package app.jam.music.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.width
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
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.jam.music.Floor
import app.jam.music.FloorUser
import app.jam.music.Jam
import app.jam.music.P
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun FloorScreen(bottom: PaddingValues) {
    var tab by rememberSaveable { mutableStateOf(0) }
    val f by Floor.state.collectAsState()
    Column(Modifier.fillMaxSize()) {
        Column(Modifier.statusBarsPadding().padding(horizontal = 18.dp, vertical = 14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (f.status == "live") LiveDot() else Box(Modifier.size(7.dp).clip(CircleShape).background(C.faint))
                Gap(w = 8.dp)
                Label(if (f.status == "live") "${f.relaysUp} relays · ${f.users.size} here" else f.status, if (f.status == "live") Color(0xFF2BD94A) else C.faint)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                DotText("%03d".format(f.users.size), listOf(P.phosphor, P.lime, P.cyan), Modifier.width(150.dp).height(64.dp))
                Gap(w = 14.dp)
                Column {
                    T("The Floor", 34.sp, family = Display, weight = FontWeight.SemiBold)
                    T("One global room. Tap anyone to join their song.", 13.sp, C.mute, lines = 2)
                }
            }
            Gap(10.dp)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Chip("Who's here", tab == 0, P.phosphor to P.lime) { tab = 0 }
                Box {
                    Chip("Chat", tab == 1, P.magenta to P.violet) { tab = 1 }
                    if (f.unread > 0 && tab != 1) Box(Modifier.align(Alignment.TopEnd).size(18.dp).clip(CircleShape).background(P.red), Alignment.Center) { T("${minOf(f.unread, 9)}", 10.sp, Color.White, Mono, FontWeight.Bold) }
                }
            }
        }
        if (tab == 0) People(bottom) else Chat(bottom)
    }
}

@Composable
private fun People(bottom: PaddingValues) {
    val f by Floor.state.collectAsState()
    var editing by remember { mutableStateOf(false) }
    var name by remember(f.me.name) { mutableStateOf(f.me.name) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = bottom) {
        item {
            Column(Modifier.padding(horizontal = 18.dp, vertical = 6.dp).fillMaxWidth().glass().padding(14.dp)) {
                Label("You are")
                Gap(6.dp)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Avatar(Floor.myId, f.me.color, 44)
                    Gap(w = 12.dp)
                    if (editing) BasicTextField(
                        name, { name = it.take(24) }, Modifier.weight(1f), singleLine = true,
                        textStyle = TextStyle(color = C.text, fontSize = 18.sp, fontFamily = Sans, fontWeight = FontWeight.Bold), cursorBrush = SolidColor(f.me.color),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { Floor.setIdentity(name); editing = false }),
                    ) else T(f.me.name, 18.sp, weight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    Icon(Icons.Rounded.Edit, "Rename", Modifier.clip(CircleShape).clickable { if (editing) Floor.setIdentity(name); editing = !editing }.padding(8.dp).size(18.dp), tint = C.mute)
                }
                Gap(10.dp)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    P.all.forEach { c ->
                        Box(Modifier.size(24.dp).clip(CircleShape).background(c).border(2.dp, if (c == f.me.color) Color.White else Color.Transparent, CircleShape).clickable { Floor.setIdentity(color = c) })
                    }
                }
            }
        }
        if (f.spots.isNotEmpty()) {
            item { Gap(14.dp); SectionHead(null, "Playing now", action = "${f.spots.size}") }
            item {
                LazyRow(contentPadding = PaddingValues(horizontal = 18.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) { items(f.spots) { SpotCard(it) } }
            }
        }
        item { Gap(14.dp); SectionHead(null, "Everyone", action = "${f.users.size}") }
        items(f.users, key = { it.id }) { u -> PersonRow(u) }
        if (f.users.size <= 1) item { Empty("wave", "Just you right now", "Play something; anyone who opens Jam sees it and can join in one tap.", P.indigo) }
    }
}

@Composable
private fun PersonRow(u: FloorUser) {
    Row(
        Modifier.fillMaxWidth().clickable(enabled = !u.me && u.track != null) { u.track?.let { Jam.play(it, listOf(it), "Floor", u.at) } }.padding(horizontal = 18.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Avatar(u.id, u.color, 42)
        Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
            T(if (u.me) "${u.name} (you)" else u.name, 15.sp, weight = FontWeight.Bold)
            T(u.track?.let { "${it.title} · ${it.subtitle}" } ?: "Just vibing", 13.sp, C.mute)
        }
        if (!u.me && u.track != null) Box(Modifier.clip(RoundedCornerShape(50)).background(u.color).padding(horizontal = 12.dp, vertical = 6.dp)) { Label("Join", Color.Black) }
        else if (u.track != null) Eq(u.color, true)
    }
}

@Composable
fun Avatar(seed: String, color: Color, size: Int) = DotAvatar(seed, color, size.dp)

@Composable
private fun Chat(bottom: PaddingValues) {
    val f by Floor.state.collectAsState()
    var text by rememberSaveable { mutableStateOf("") }
    val list = rememberLazyListState()
    DisposableEffect(Unit) { Floor.chatOpen = true; Floor.clearUnread(); onDispose { Floor.chatOpen = false } }
    LaunchedEffect(f.messages.size) { if (f.messages.isNotEmpty()) list.animateScrollToItem(f.messages.size - 1) }
    val fmt = remember { SimpleDateFormat("HH:mm", Locale.getDefault()) }
    Column(Modifier.fillMaxSize().padding(bottom = bottom.calculateBottomPadding()).imePadding()) {
        LazyColumn(Modifier.weight(1f), state = list, contentPadding = PaddingValues(vertical = 8.dp)) {
            if (f.messages.isEmpty()) item { Empty("note", "Quiet floor", "Say hi. Messages are public and last about 12 hours.", P.magenta) }
            items(f.messages, key = { it.id }) { m ->
                if (m.sys) Row(Modifier.padding(horizontal = 18.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(6.dp).clip(CircleShape).background(m.user.color)); Gap(w = 8.dp)
                    T("${m.user.name} ${m.text}", 12.5.sp, C.faint)
                } else {
                    val mine = m.user.id == Floor.myId
                    Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 5.dp), horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start) {
                        if (!mine) { Avatar(m.user.id, m.user.color, 32); Gap(w = 8.dp) }
                        Column(
                            Modifier.widthIn(max = 290.dp).clip(RoundedCornerShape(18.dp))
                                .background(if (mine) m.user.color.copy(alpha = 0.22f) else Color(0x12FFFFFF)).padding(horizontal = 13.dp, vertical = 9.dp),
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                T(m.user.name, 12.sp, m.user.color, weight = FontWeight.Bold)
                                Gap(w = 6.dp); Label(fmt.format(Date(m.ts)), C.faint, size = 9.sp)
                            }
                            T(m.text, 15.sp, lines = 20, lineHeight = 20.sp)
                            if (m.on.isNotEmpty()) T("on ${m.on}", 11.sp, C.faint)
                        }
                    }
                }
            }
        }
        Row(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f).height(50.dp).glass(RoundedCornerShape(25.dp)).padding(horizontal = 18.dp), Alignment.CenterStart) {
                if (text.isEmpty()) T("Say something to the floor", 15.sp, C.faint)
                BasicTextField(
                    text, { text = it.take(280) }, Modifier.fillMaxWidth(), singleLine = true,
                    textStyle = TextStyle(color = C.text, fontSize = 15.sp, fontFamily = Sans), cursorBrush = SolidColor(f.me.color),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send), keyboardActions = KeyboardActions(onSend = { if (Floor.sendChat(text)) text = "" }),
                )
            }
            Gap(w = 8.dp)
            Box(Modifier.size(50.dp).clip(CircleShape).background(f.me.color).clickable { if (Floor.sendChat(text)) text = "" }, Alignment.Center) {
                Icon(Icons.AutoMirrored.Rounded.Send, "Send", tint = Color.Black)
            }
        }
    }
}
