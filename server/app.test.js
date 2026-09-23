import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createApp } from './app.js';

test('production app can be constructed with the Express 5 SPA fallback', () => {
  assert.doesNotThrow(() => createApp({ portfolioHome: '/tmp/portfolio-home-test' }));
});
