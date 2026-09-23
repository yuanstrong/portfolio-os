import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AUTH_TOKEN_STORAGE_KEY } from './authSession';
import {
  arrayBufferToBase64,
  normalizeAuthResponse,
  pemToArrayBuffer,
} from './auth';

test('pemToArrayBuffer strips PEM armor and decodes bytes', () => {
  const pem = [
    '-----BEGIN PUBLIC KEY-----',
    'AQIDBA==',
    '-----END PUBLIC KEY-----',
  ].join('\n');

  const bytes = new Uint8Array(pemToArrayBuffer(pem));

  assert.deepEqual(Array.from(bytes), [1, 2, 3, 4]);
});

test('arrayBufferToBase64 encodes binary data', () => {
  const buffer = new Uint8Array([104, 101, 108, 108, 111]).buffer;

  assert.equal(arrayBufferToBase64(buffer), 'aGVsbG8=');
});

test('normalizeAuthResponse maps authenticated body', async () => {
  installMemoryStorage();
  const response = new Response(
    JSON.stringify({
      status: 'authenticated',
      token: 'jwt-token',
      token_type: 'Bearer',
      expires_in_seconds: 7200,
    }),
    { status: 200 },
  );

  assert.deepEqual(await normalizeAuthResponse(response), {
    status: 'authenticated',
    token: 'jwt-token',
    tokenType: 'Bearer',
    expiresInSeconds: 7200,
  });
  assert.equal(globalThis.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY), 'jwt-token');
});

test('normalizeAuthResponse maps 2fa body', async () => {
  const response = new Response(
    JSON.stringify({
      status: '2fa_required',
      challenge_id: 'challenge-1',
      expires_in_seconds: 300,
    }),
    { status: 202 },
  );

  assert.deepEqual(await normalizeAuthResponse(response), {
    status: '2fa_required',
    challengeId: 'challenge-1',
    expiresInSeconds: 300,
  });
});

test('normalizeAuthResponse throws stable errors for 401 and 503', async () => {
  await assert.rejects(
    normalizeAuthResponse(new Response(JSON.stringify({ error: 'invalid_credentials' }), { status: 401 })),
    /Invalid credentials/,
  );
  await assert.rejects(
    normalizeAuthResponse(new Response(JSON.stringify({ error: 'worker_unavailable' }), { status: 503 })),
    /Authentication worker unavailable/,
  );
});

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
