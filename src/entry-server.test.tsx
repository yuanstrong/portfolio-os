import assert from 'node:assert/strict';
import { test } from 'node:test';

import { render } from './entry-server';

test('render embeds server data into the markup instead of the loading state', () => {
  const html = render('/thoughts', {
    thoughts: [
      {
        id: 'zero-depth',
        title: 'Zero Depth',
        tags: [],
        categories: [],
        date: 0,
        brief: 'Interfaces without shadows',
      },
    ],
  });

  assert.match(html, /Zero Depth/);
  assert.doesNotMatch(html, /loading_thoughts/);
});
