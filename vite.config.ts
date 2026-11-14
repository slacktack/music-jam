import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-expect-error plain JS module
import { handleSearch } from './server/yt.js';

// Serve /api/search in `vite dev` with the same handler Vercel and the Node server use.
const api: Plugin = {
  name: 'jam-api',
  configureServer(server) {
    server.middlewares.use('/api/search', (req, res) => {
      req.url = `/api/search${req.url?.startsWith('?') ? req.url : req.url?.replace(/^\/?/, '?') ?? ''}`;
      handleSearch(req, res);
    });
  },
};

export default defineConfig({
  plugins: [react(), api],
  server: { host: true },
});
