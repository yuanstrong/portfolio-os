import fs from 'node:fs/promises';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createResourceMiddleware } from './portfolio-content.js';
import { loadRouteData } from './route-data.js';
import { buildHtml } from './build-html.js';
import { buildRobotsTxt, buildSitemapXml, collectSitemapUrls } from './sitemap.js';
import { render } from '../src/entry-server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp({
  portfolioHome,
  staticRoot = path.join(__dirname, '..', 'dist', 'static'),
  siteUrl = 'http://localhost:3000',
} = {}) {
  const app = express();

  app.use(createResourceMiddleware(portfolioHome));
  app.use(express.static(staticRoot));

  const templatePath = path.join(staticRoot, 'index.html');

  async function renderPage(req, res) {
    let route;
    try {
      route = await loadRouteData(portfolioHome, req.path, siteUrl);
    } catch (error) {
      const status = error?.code === 'RESOURCE_NOT_FOUND' ? 404 : 500;
      res.status(status).type('text/plain').send(status === 404 ? 'Not found' : 'Internal server error');
      return;
    }

    const template = await fs.readFile(templatePath, 'utf8');
    const appHtml = render(req.path, route.data);
    const html = buildHtml({ template, meta: route.meta, appHtml, initialData: route.data });

    res.status(200).type('html').send(html);
  }

  app.get(['/', '/thoughts', '/projects', '/experience'], renderPage);
  app.get('/thoughts/:id', renderPage);
  app.get('/projects/:id', renderPage);

  app.get('/sitemap.xml', async (req, res) => {
    const urls = await collectSitemapUrls(portfolioHome, siteUrl);
    res.type('application/xml').send(buildSitemapXml(urls));
  });

  app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send(buildRobotsTxt(siteUrl));
  });

  app.use((req, res) => {
    res.status(404).type('text/plain').send('Not found');
  });

  return app;
}
