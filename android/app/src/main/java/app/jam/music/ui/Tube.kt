package app.jam.music.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.jam.music.P
import app.jam.music.YouTube

private val FEEDS = listOf(
    "For you" to "trending india today",
    "Music" to "new music video",
    "Cricket" to "cricket highlights",
    "Comedy" to "stand up comedy india",
    "Gaming" to "gaming",
    "News" to "news live india",
    "Tech" to "tech review",
    "Podcasts" to "podcast hindi",
    "Movies" to "official trailer",
    "Fitness" to "workout at home",
    "Food" to "street food india",
    "Live" to "live now",
)

@Composable
fun Tube(nav: Nav, bottom: PaddingValues) {
    var q by rememberSaveable { mutableStateOf("") }
    var term by rememberSaveable { mutableStateOf("") }
    var feed by rememberSaveable { mutableStateOf(0) }
    val query = term.ifEmpty { FEEDS[feed].second }
    val l = rememberLoad(query) { YouTube.videos(query) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = bottom) {
        item {
            Column(Modifier.statusBarsPadding().padding(horizontal = 18.dp, vertical = 14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Label("Everything on YouTube · plays with the screen off", P.red)
                }
                T("YouTube", 42.sp, family = Display, weight = FontWeight.SemiBold)
                Gap(12.dp)
                SearchBox(q, "Search any video", { q = it; if (it.isEmpty()) term = "" }, { term = q.trim() })
            }
        }
        if (term.isEmpty()) item {
            LazyRow(contentPadding = PaddingValues(horizontal = 18.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(FEEDS.size) { i -> Chip(FEEDS[i].first, i == feed, P.red to P.saffron) { feed = i } }
            }
            Gap(6.dp)
        } else item { SectionHead(null, "Results for \"$term\"") }
        item {
            LoadView(l, video = true, empty = { Empty("search", "No videos", "Try different words.", Color.White) }) { list ->
                Column { list.forEach { VideoCard(it, list, "YouTube") { nav.player() } } }
            }
        }
    }
}

