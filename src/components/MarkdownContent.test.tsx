import assert from 'node:assert/strict';
import { test } from 'node:test';

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import { MarkdownContent } from './MarkdownContent';

test('renders relative markdown document links as path-based URLs', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <MarkdownContent
        body="Read the [architecture notes](architect.md) for details."
        projectId="jarvis"
        documentPath="README.md"
      />
    </MemoryRouter>,
  );

  assert.match(markup, /\/projects\/jarvis\/architect/);
  assert.doesNotMatch(markup, /\?doc=/);
});

test('preserves anchor suffixes on markdown document links', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <MarkdownContent
        body="See [the boundaries](architect.md#boundaries)."
        projectId="jarvis"
        documentPath="README.md"
      />
    </MemoryRouter>,
  );

  assert.match(markup, /\/projects\/jarvis\/architect#boundaries/);
});
