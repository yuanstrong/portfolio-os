import assert from 'node:assert/strict';
import { test } from 'node:test';

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import { AgentsPage } from './index';
import { NavBar } from '../../components/NavBar';

test('agent workspace lays out side nav, canvas, and console in one row', () => {
  const markup = renderToStaticMarkup(<AgentsPage />);

  assert.match(markup, /agent-workspace/);
  assert.match(markup, /flex-row/);
});

test('navigation uses worker status dot instead of sign in text', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <NavBar />
    </MemoryRouter>,
  );

  assert.doesNotMatch(markup, /SIGN_IN/);
  assert.match(markup, /Jarvis worker offline/);
});
