import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

import { loadRouteData } from './route-data.js';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function makePortfolioHome() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'route-data-'));
  temporaryDirectories.push(directory);
  return directory;
}

test('maps the home route to thoughts, projects and experiences', async () => {
  const home = await makePortfolioHome();
  const route = await loadRouteData(home, '/', 'https://shiming.dev');

  assert.deepEqual(Object.keys(route.data).sort(), ['experiences', 'projects', 'thoughts']);
  assert.equal(route.meta.title, 'Shiming Yuan');
  assert.equal(route.meta.canonical, 'https://shiming.dev/');
});

test('maps a thought detail route to its body and summary', async () => {
  const home = await makePortfolioHome();
  await fs.mkdir(path.join(home, 'thoughts'));
  await fs.writeFile(
    path.join(home, 'thoughts/zero-depth.md'),
    [
      '---',
      'title: Zero Depth',
      'brief: Interfaces without shadows',
      'date: 2026-09-23',
      'tags: [ui]',
      '---',
      '',
      '# Zero Depth',
    ].join('\n'),
  );

  const route = await loadRouteData(home, '/thoughts/zero-depth', 'https://shiming.dev');

  assert.deepEqual(Object.keys(route.data), ['thought:zero-depth']);
  assert.equal(route.data['thought:zero-depth'].body, '# Zero Depth');
  assert.equal(route.data['thought:zero-depth'].summary.title, 'Zero Depth');
  assert.equal(route.meta.title, 'Zero Depth');
  assert.equal(route.meta.type, 'article');
  assert.match(route.meta.jsonLd, /"@type":"BlogPosting"/);
});

test('throws RESOURCE_NOT_FOUND for an unknown thought', async () => {
  const home = await makePortfolioHome();
  await assert.rejects(
    () => loadRouteData(home, '/thoughts/missing', 'https://shiming.dev'),
    (error) => error.code === 'RESOURCE_NOT_FOUND',
  );
});
