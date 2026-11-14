// Minimal Nostr relay (NIP-01) for self-hosting the floor or testing locally.
// In-memory only. Attach to any http.Server, or run standalone: `npm run relay`.
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';
import { verifyEvent } from 'nostr-tools/pure';

const MAX_STORED = 5000;

function matches(f, ev) {
  if (f.ids && !f.ids.includes(ev.id)) return false;
  if (f.kinds && !f.kinds.includes(ev.kind)) return false;
  if (f.authors && !f.authors.includes(ev.pubkey)) return false;
  if (f.since && ev.created_at < f.since) return false;
  if (f.until && ev.created_at > f.until) return false;
  for (const k in f) {
    if (k[0] !== '#' || k.length !== 2) continue;
    const want = f[k];
    if (!ev.tags.some((t) => t[0] === k[1] && want.includes(t[1]))) return false;
  }
  return true;
}

export function attachRelay(server, path = '/relay') {
  const wss = new WebSocketServer({ server, path, maxPayload: 64 * 1024 });
  const stored = [];
  const replaceable = new Map(); // kind:pubkey:d -> event
  const subs = new Map(); // ws -> Map(subId -> filters)

  const all = () => [...stored, ...replaceable.values()];
  const send = (ws, msg) => ws.readyState === 1 && ws.send(JSON.stringify(msg));

  wss.on('connection', (ws) => {
    subs.set(ws, new Map());
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (!Array.isArray(msg)) return;
      const [type, a, ...rest] = msg;
      if (type === 'EVENT') {
        const ev = a;
        if (!ev || !verifyEvent(ev)) return send(ws, ['OK', ev?.id ?? '', false, 'invalid: bad signature']);
        if (ev.kind >= 30000 && ev.kind < 40000) {
          const d = ev.tags.find((t) => t[0] === 'd')?.[1] ?? '';
          const key = `${ev.kind}:${ev.pubkey}:${d}`;
          const prev = replaceable.get(key);
          if (!prev || prev.created_at < ev.created_at) replaceable.set(key, ev);
        } else if (!(ev.kind >= 20000 && ev.kind < 30000)) {
          stored.push(ev);
          if (stored.length > MAX_STORED) stored.shift();
        }
        send(ws, ['OK', ev.id, true, '']);
        for (const [client, s] of subs) for (const [id, filters] of s) if (filters.some((f) => matches(f, ev))) send(client, ['EVENT', id, ev]);
      } else if (type === 'REQ') {
        const filters = rest.filter((f) => f && typeof f === 'object');
        subs.get(ws).set(a, filters);
        for (const f of filters) {
          let out = all().filter((ev) => matches(f, ev)).sort((x, y) => y.created_at - x.created_at);
          if (f.limit) out = out.slice(0, f.limit);
          for (const ev of out) send(ws, ['EVENT', a, ev]);
        }
        send(ws, ['EOSE', a]);
      } else if (type === 'CLOSE') {
        subs.get(ws)?.delete(a);
      }
    });
    ws.on('close', () => subs.delete(ws));
  });
  return wss;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 7777);
  const server = http.createServer((_, res) => res.end('JAM nostr relay'));
  attachRelay(server, '/');
  server.listen(port, () => console.log(`relay on ws://localhost:${port}`));
}
