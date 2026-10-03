import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { afterEach, test } from 'node:test';

import { createApp } from './app.js';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function makePortfolioHome() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'app-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function makeStaticRoot() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'app-static-'));
  temporaryDirectories.push(directory);
  await fs.writeFile(
    path.join(directory, 'index.html'),
    '<!doctype html><html><head><title>Shiming Yuan</title></head><body><div id="root"><!--app-html--></div></body></html>',
  );
  return directory;
}

async function startServer(app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

test('production app can be constructed with the Express 5 SPA fallback', () => {
  assert.doesNotThrow(() => createApp({ portfolioHome: '/tmp/portfolio-home-test' }));
});

test('serves a rendered thought with meta and content', async () => {
  const home = await makePortfolioHome();
  const staticRoot = await makeStaticRoot();
  await fs.mkdir(path.join(home, 'thoughts'));
  await fs.writeFile(
    path.join(home, 'thoughts/zero-depth.md'),
    [
      '---',
      'title: Zero Depth',
      'brief: Interfaces without shadows',
      'date: 2026-09-23',
      '---',
      '',
      '# Zero Depth',
    ].join('\n'),
  );

  const app = createApp({ portfolioHome: home, staticRoot, siteUrl: 'https://shiming.dev' });
  const { baseUrl, close } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/thoughts/zero-depth`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<title>Zero Depth<\/title>/);
    assert.match(html, /<meta name="description" content="Interfaces without shadows" \/>/);
    assert.match(html, /<h1[^>]*>Zero Depth<\/h1>/);
    assert.doesNotMatch(html, /loading_thought/);
  } finally {
    await close();
  }
});

test('returns 404 for an unknown thought', async () => {
  const home = await makePortfolioHome();
  const staticRoot = await makeStaticRoot();
  const app = createApp({ portfolioHome: home, staticRoot, siteUrl: 'https://shiming.dev' });
  const { baseUrl, close } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/thoughts/missing`);
    assert.equal(response.status, 404);
  } finally {
    await close();
  }
});

test('serves the home page with rendered content and meta', async () => {
  const home = await makePortfolioHome();
  const staticRoot = await makeStaticRoot();
  const app = createApp({ portfolioHome: home, staticRoot, siteUrl: 'https://shiming.dev' });
  const { baseUrl, close } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<meta name="description" content="Curiosity-driven by nature, builder by choice." \/>/);
    assert.match(html, /<link rel="canonical" href="https:\/\/shiming.dev\/" \/>/);
    assert.match(html, /<h1[^>]*>Shiming Yuan<\/h1>/);
    assert.doesNotMatch(html, /<!--app-html-->/);
  } finally {
    await close();
  }
});

test('serves project README and document URLs', async () => {
  const home = await makePortfolioHome();
  const staticRoot = await makeStaticRoot();
  const projectRoot = path.join(home, 'projects', 'jarvis');
  await fs.mkdir(projectRoot, { recursive: true });
  await fs.writeFile(
    path.join(projectRoot, 'README.md'),
    ['---', 'title: Jarvis', 'brief: A local agent runtime', '---', '', '# Jarvis README'].join('\n'),
  );
  await fs.writeFile(
    path.join(projectRoot, 'architect.md'),
    ['---', 'title: Jarvis Architecture', '---', '', '# Architecture Body'].join('\n'),
  );

  const app = createApp({ portfolioHome: home, staticRoot, siteUrl: 'https://shiming.dev' });
  const { baseUrl, close } = await startServer(app);

  try {
    const readme = await fetch(`${baseUrl}/projects/jarvis`);
    assert.equal(readme.status, 200);
    assert.match(await readme.text(), /Jarvis README/);

    const doc = await fetch(`${baseUrl}/projects/jarvis/architect`);
    assert.equal(doc.status, 200);
    const docHtml = await doc.text();
    assert.match(docHtml, /<title>Jarvis Architecture<\/title>/);
    assert.match(docHtml, /Architecture Body/);
    assert.match(docHtml, /\/projects\/jarvis\/architect/);
    assert.doesNotMatch(docHtml, /\?doc=/);

    const missing = await fetch(`${baseUrl}/projects/jarvis/missing`);
    assert.equal(missing.status, 404);
  } finally {
    await close();
  }
});

test('serves a sitemap and robots.txt', async () => {
  const home = await makePortfolioHome();
  const staticRoot = await makeStaticRoot();
  const app = createApp({ portfolioHome: home, staticRoot, siteUrl: 'https://shiming.dev' });
  const { baseUrl, close } = await startServer(app);

  try {
    const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
    assert.equal(sitemap.status, 200);
    assert.match(await sitemap.text(), /<urlset/);

    const robots = await fetch(`${baseUrl}/robots.txt`);
    assert.equal(robots.status, 200);
    assert.match(await robots.text(), /Sitemap: https:\/\/shiming.dev\/sitemap.xml/);
  } finally {
    await close();
  }
});
