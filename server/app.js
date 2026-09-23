import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createResourceMiddleware } from './portfolio-content.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp({ portfolioHome, staticRoot = path.join(__dirname, '..', 'dist', 'static') } = {}) {
  const app = express();

  app.use(createResourceMiddleware(portfolioHome));

  // Serve all static assets and pre-rendered HTML files.
  // express.static automatically serves index.html files found within directories.
  app.use(express.static(staticRoot));

  // Express 5 requires a named wildcard parameter for the SPA fallback.
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(staticRoot, 'index.html'));
  });

  return app;
}
