import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildHtml } from './build-html.js';

const template = [
  '<!doctype html>',
  '<html><head><meta charset="utf-8"><title>Shiming Yuan</title></head>',
  '<body><div id="root"><!--app-html--></div></body></html>',
].join('\n');

test('injects title, description, canonical, og and twitter tags', () => {
  const html = buildHtml({
    template,
    meta: {
      title: 'Zero Depth',
      description: 'Interfaces without shadows',
      canonical: 'https://shiming.dev/thoughts/zero-depth',
      type: 'article',
    },
    appHtml: '<main>content</main>',
    initialData: {},
  });

  assert.match(html, /<title>Zero Depth<\/title>/);
  assert.match(html, /<meta name="description" content="Interfaces without shadows" \/>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/shiming.dev\/thoughts\/zero-depth" \/>/);
  assert.match(html, /<meta property="og:type" content="article" \/>/);
  assert.match(html, /<meta property="og:title" content="Zero Depth" \/>/);
  assert.match(html, /<meta name="twitter:card" content="summary" \/>/);
  assert.match(html, /<main>content<\/main>/);
  assert.doesNotMatch(html, /<!--app-html-->/);
});

test('escapes content to prevent script-tag breakout in initial data', () => {
  const html = buildHtml({
    template,
    meta: { title: 'T', description: '', canonical: 'https://x/', type: 'website' },
    appHtml: '<main></main>',
    initialData: { thought: { body: 'alert("x")</script><script>alert(1)</script>' } },
  });

  assert.doesNotMatch(html, /<\/script><script>/);
});
