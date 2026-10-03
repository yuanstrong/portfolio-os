import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(artifactRoot, '..', '.env') });

const portfolioHome = process.env.PORTFOLIO_HOME
  ? path.resolve(process.cwd(), process.env.PORTFOLIO_HOME)
  : undefined;
const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';
const port = Number(process.env.PORT ?? 3000);
const app = createApp({
  portfolioHome,
  staticRoot: path.join(artifactRoot, 'static'),
  siteUrl,
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server successfully started! Serving static files from ${artifactRoot}/static on http://localhost:${port}`);
});
