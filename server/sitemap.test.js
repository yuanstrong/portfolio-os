import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

import { buildRobotsTxt, buildSitemapXml, collectSitemapUrls, formatSitemapDate } from './sitemap.js';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function makePortfolioHome() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sitemap-'));
  temporaryDirectories.push(directory);
  return directory;
}

test('formatSitemapDate converts unix seconds and date strings to YYYY-MM-DD', () => {
  assert.equal(formatSitemapDate(0), '1970-01-01');
  assert.equal(formatSitemapDate('2026-09-23'), '2026-09-23');
  assert.equal(formatSitemapDate('not a date'), null);
});

test('buildSitemapXml renders valid urlset entries with optional lastmod', () => {
  const xml = buildSitemapXml([
    { loc: 'https://shiming.dev/', lastmod: null },
    { loc: 'https://shiming.dev/thoughts/zero-depth', lastmod: '2026-09-23' },
  ]);

  assert.match(xml, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  assert.match(xml, /<loc>https:\/\/shiming.dev\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/shiming.dev\/thoughts\/zero-depth<\/loc>/);
  assert.match(xml, /<lastmod>2026-09-23<\/lastmod>/);
  assert.doesNotMatch(xml, /<lastmod>null<\/lastmod>/);
});

test('buildRobotsTxt disallows api and agents and points to the sitemap', () => {
  const robots = buildRobotsTxt('https://shiming.dev/');
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Disallow: \/agents/);
  assert.match(robots, /Sitemap: https:\/\/shiming.dev\/sitemap.xml/);
});

test('collectSitemapUrls lists static pages and content urls', async () => {
  const home = await makePortfolioHome();
  await fs.mkdir(path.join(home, 'thoughts'));
  await fs.writeFile(
    path.join(home, 'thoughts/zero-depth.md'),
    ['---', 'title: Zero Depth', 'date: 2026-09-23', '---', '', 'Body'].join('\n'),
  );

  const urls = await collectSitemapUrls(home, 'https://shiming.dev');

  const locs = urls.map((url) => url.loc);
  assert.ok(locs.includes('https://shiming.dev/'));
  assert.ok(locs.includes('https://shiming.dev/thoughts'));
  assert.ok(locs.includes('https://shiming.dev/thoughts/zero-depth'));
  assert.ok(locs.includes('https://shiming.dev/projects'));
  assert.ok(locs.includes('https://shiming.dev/experience'));
});
