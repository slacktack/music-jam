// Production server for any Node host: serves the built app, /api/search,
// and a Nostr relay at /relay (point VITE_RELAYS at it to self-host the floor).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleSearch } from './yt.js';
import { attachRelay } from './relay.js';

const PORT = Number(process.env.PORT || 8787);
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', process.env.DIST || 'dist');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/healthz') return res.writeHead(200).end('ok');
  if (url.pathname === '/api/search' || url.pathname === '/api/videos' || url.pathname === '/api/suggest') return handleSearch(req, res);
  let file = path.normalize(path.join(DIST, decodeURIComponent(url.pathname)));
  if (!file.startsWith(DIST)) return res.writeHead(403).end();
  fs.stat(file, (err, st) => {
    if (err || st.isDirectory()) file = path.join(DIST, 'index.html');
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

attachRelay(server, '/relay');
server.listen(PORT, () => console.log(`JAM on http://localhost:${PORT}`));
