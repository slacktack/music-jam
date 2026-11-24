import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-expect-error plain JS module
import { handleSearch } from './server/yt.js';

// Serve /api/search, /api/videos and /api/suggest in `vite dev` with the same
// handler Vercel and the Node server use. req.url keeps its full path here, so
// the handler can dispatch on it directly.
const api: Plugin = {
  name: 'jam-api',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (/^\/api\/(search|videos|suggest)(\?|$)/.test(req.url ?? '')) return handleSearch(req, res);
      next();
    });
  },
};

export default defineConfig({
  plugins: [react(), api],
  server: { host: true },
});
