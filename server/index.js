// JAM floor server: serves the built app and runs the single global "floor"
// (presence, chat, reactions) over one WebSocket endpoint at /ws.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 8787);
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/healthz') return res.writeHead(200).end('ok');
  let file = path.normalize(path.join(DIST, decodeURIComponent(url.pathname)));
  if (!file.startsWith(DIST)) return res.writeHead(403).end();
  fs.stat(file, (err, st) => {
    if (err || st.isDirectory()) file = path.join(DIST, 'index.html'); // SPA fallback
    fs.readFile(file, (e, buf) => {
      if (e) return res.writeHead(404).end('Run `npm run build` first.');
      const ext = path.extname(file);
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
      });
      res.end(buf);
    });
  });
});

// ---------- the floor ----------
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });
const users = new Map(); // ws -> user
const history = []; // last chat messages
const MAX_HISTORY = 60;
const MAX_USERS_SENT = 250;
let dirty = false;
let seq = 0;

const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '');
const color = (v) => (/^#[0-9a-fA-F]{6}$/.test(v) ? v : '#5B5BFF');

function cleanStation(s) {
  if (!s || typeof s !== 'object') return null;
  const url = str(s.url, 500);
  if (!/^https:\/\//i.test(url)) return null;
  const favicon = str(s.favicon, 500);
  return {
    id: str(s.id, 80) || url,
    name: str(s.name, 80) || 'Unknown station',
    url,
    favicon: /^https:\/\//i.test(favicon) ? favicon : '',
    tags: str(s.tags, 120),
    country: str(s.country, 40),
    hls: !!s.hls,
  };
}

// Sliding-window rate limit; returns true when the action is allowed.
function allow(user, key, max, windowMs) {
  const now = Date.now();
  const hits = (user.hits[key] = (user.hits[key] || []).filter((t) => now - t < windowMs));
  if (hits.length >= max) return false;
  hits.push(now);
  return true;
}

function broadcast(obj) {
  const data = JSON.stringify(obj);
  for (const ws of users.keys()) if (ws.readyState === 1) ws.send(data);
}

function snapshot() {
  const stations = new Map();
  const list = [];
  for (const u of users.values()) {
    if (!u.ready) continue;
    if (u.station) {
      const e = stations.get(u.station.id);
      if (e) e.count++;
      else stations.set(u.station.id, { ...u.station, count: 1 });
    }
    if (list.length < MAX_USERS_SENT) list.push({ id: u.id, name: u.name, color: u.color, stationId: u.station?.id || null });
  }
  return {
    type: 'presence',
    total: [...users.values()].filter((u) => u.ready).length,
    users: list,
    stations: [...stations.values()].sort((a, b) => b.count - a.count).slice(0, 60),
  };
}

setInterval(() => {
  if (!dirty) return;
  dirty = false;
  broadcast(snapshot());
}, 800);

// Drop dead sockets.
setInterval(() => {
  for (const [ws, u] of users) {
    if (!u.alive) { ws.terminate(); continue; }
    u.alive = false;
    ws.ping();
  }
}, 30000);

wss.on('connection', (ws) => {
  const user = { id: `u${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: 'anon', color: '#5B5BFF', station: null, ready: false, alive: true, hits: {} };
  users.set(ws, user);
  ws.on('pong', () => (user.alive = true));

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw.toString()); } catch { return; }
    if (!m || typeof m !== 'object') return;
    switch (m.type) {
      case 'hello':
        user.name = str(m.name, 24) || 'anon';
        user.color = color(m.color);
        user.station = cleanStation(m.station);
        if (!user.ready) {
          user.ready = true;
          ws.send(JSON.stringify({ type: 'welcome', id: user.id, history }));
          ws.send(JSON.stringify(snapshot()));
        }
        dirty = true;
        break;
      case 'tune':
        if (!user.ready || !allow(user, 'tune', 20, 10000)) return;
        user.station = cleanStation(m.station);
        dirty = true;
        break;
      case 'chat': {
        const text = str(m.text, 280);
        if (!user.ready || !text || !allow(user, 'chat', 6, 10000)) return;
        const msg = { type: 'chat', id: `${Date.now().toString(36)}${(++seq).toString(36)}`, user: { id: user.id, name: user.name, color: user.color }, text, station: user.station?.name || '', ts: Date.now() };
        history.push(msg);
        if (history.length > MAX_HISTORY) history.shift();
        broadcast(msg);
        break;
      }
      case 'react': {
        const emoji = str(m.emoji, 8);
        if (!user.ready || !emoji || !allow(user, 'react', 12, 5000)) return;
        broadcast({ type: 'react', emoji, user: { id: user.id, name: user.name, color: user.color }, stationId: user.station?.id || null });
        break;
      }
    }
  });

  const bye = () => { if (users.delete(ws)) dirty = true; };
  ws.on('close', bye);
  ws.on('error', bye);
});

server.listen(PORT, () => console.log(`JAM floor live on http://localhost:${PORT}`));
