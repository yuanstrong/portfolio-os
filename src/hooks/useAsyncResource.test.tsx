import assert from 'node:assert/strict';
import { test } from 'node:test';

import { renderToStaticMarkup } from 'react-dom/server';

import { ResourceProvider } from '../data/ResourceContext';
import { useAsyncResource } from './useAsyncResource';

function Probe({ label }: { label: string }) {
  const resource = useAsyncResource<string>('thoughts', async () => 'fetched', []);
  if (resource.status === 'loading') {
    return <span>{label}:loading</span>;
  }
  if (resource.status === 'error') {
    return <span>{label}:error</span>;
  }
  return <span>{label}:{resource.data}</span>;
}

test('uses server-provided data when present instead of loading', () => {
  const markup = renderToStaticMarkup(
    <ResourceProvider data={{ thoughts: 'server-thoughts' }}>
      <Probe label="probe" />
    </ResourceProvider>,
  );
  assert.match(markup, /probe:server-thoughts/);
  assert.doesNotMatch(markup, /probe:loading/);
});

test('falls back to loading when no server data is provided', () => {
  const markup = renderToStaticMarkup(
    <ResourceProvider data={{}}>
      <Probe label="probe" />
    </ResourceProvider>,
  );
  assert.match(markup, /probe:loading/);
});
