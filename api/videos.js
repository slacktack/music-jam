// Vercel serverless function: GET /api/videos?q=...  (or ?c=<continuation token>)
import { apiHandler } from '../server/yt.js';
export default apiHandler('/api/videos');
