import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const projectRoot = path.resolve(import.meta.dirname, '..');

test('production configuration exposes the compiled server artifact', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
  );

  assert.equal(packageJson.scripts.start, 'node dist/server/index.js');
  assert.ok(packageJson.scripts['build:server']);
  assert.equal(packageJson.scripts['build:server'], 'vite build --ssr server/index.js --outDir dist/server');
  assert.ok(fs.existsSync(path.join(projectRoot, 'server/index.js')));
  assert.ok(fs.existsSync(path.join(projectRoot, 'server/prepare-runtime-package.js')));
});
