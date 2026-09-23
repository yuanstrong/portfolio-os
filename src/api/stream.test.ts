import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AUTH_TOKEN_STORAGE_KEY } from './authSession';
import { streamPost } from './stream';

test('streamPost sends stored bearer token and reads SSE result frames', async (t) => {
  installMemoryStorage();
  globalThis.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'jwt-token');
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(
      [
        'event: state',
        'data: {"status":"loading"}',
        '',
        'event: result',
        'data: {"reply":"ok"}',
        '',
        'event: done',
        'data: {"reason":"completed"}',
        '',
      ].join('\n'),
      {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      },
    );
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const frames: string[] = [];

  const response = await streamPost('/api/v1/stream/storage/upload-url', { file_name: 'a.pdf' }, undefined, (frame) => {
    frames.push(frame.type);
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), JSON.stringify({ reply: 'ok' }));
  assert.deepEqual(frames, ['state', 'result']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, '/api/v1/stream/storage/upload-url');
  assert.equal(headerValue(calls[0].init?.headers, 'authorization'), 'Bearer jwt-token');
});

function headerValue(headers: HeadersInit | undefined, name: string): string | undefined {
  if (!headers || Array.isArray(headers) || headers instanceof Headers) {
    return headers instanceof Headers ? headers.get(name) ?? undefined : undefined;
  }

  return headers[name];
}

function installMemoryStorage() {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem(key: string) {
        return values.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        values.set(key, value);
      },
      removeItem(key: string) {
        values.delete(key);
      },
    },
  });
}
