import { streamPost, type StreamFrame } from './stream';
import { authorizationHeaders, readAuthToken, writeAuthToken } from './authSession';

export type CredentialKeyResponse = {
  alg: 'RSA-OAEP-256';
  kid: string;
  public_key_pem: string;
};

export type EncryptedAuthSecret = {
  alg: 'RSA-OAEP-256';
  kid: string;
  ciphertext: string;
};

export type AuthenticatedOutcome = {
  status: 'authenticated';
  token: string;
  tokenType: string;
  expiresInSeconds: number;
};

export type TwoFactorRequiredOutcome = {
  status: '2fa_required';
  challengeId: string;
  expiresInSeconds: number;
};

export type AuthOutcome = AuthenticatedOutcome | TwoFactorRequiredOutcome;

type AuthenticatedResponseBody = {
  status: 'authenticated';
  token: string;
  token_type: string;
  expires_in_seconds: number;
};

type TwoFactorRequiredResponseBody = {
  status: '2fa_required';
  challenge_id: string;
  expires_in_seconds: number;
};

const AUTH_ERROR_MESSAGES: Record<number, string> = {
  401: 'Invalid credentials',
  503: 'Authentication worker unavailable',
};

let pendingTwoFactorLogin: {
  challengeId: string;
  finalOutcome: Promise<AuthOutcome>;
} | null = null;

export async function fetchCredentialKey(): Promise<CredentialKeyResponse> {
  const response = await fetch('/api/v1/auth/credential-key', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(AUTH_ERROR_MESSAGES[response.status] ?? 'Authentication request failed');
  }
  const body = await response.json();
  if (body?.alg !== 'RSA-OAEP-256' || typeof body.kid !== 'string' || typeof body.public_key_pem !== 'string') {
    throw new Error('Credential encryption failed');
  }
  return body as CredentialKeyResponse;
}

export async function loginWithCredential(username: string, password: string): Promise<AuthOutcome> {
  const keyInfo = await fetchCredentialKey();
  const credential = await encryptAuthSecret(password, keyInfo);

  return streamLoginWithCredential(username, credential);
}

export async function verifyTwoFactor(challengeId: string, code: string): Promise<AuthOutcome> {
  const pending = pendingTwoFactorLogin;
  if (!pending || pending.challengeId !== challengeId) {
    throw new Error('Authentication request failed');
  }

  const keyInfo = await fetchCredentialKey();
  const encryptedCode = await encryptAuthSecret(code, keyInfo);

  const response = await fetch('/api/v1/stream/auth/2fa', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...authorizationHeaders(readAuthToken()),
    },
    body: JSON.stringify({
      challenge_id: challengeId,
      code: encryptedCode,
    }),
  });

  try {
    return await normalizeAuthResponse(response);
  } finally {
    pendingTwoFactorLogin = null;
  }
}

export async function encryptAuthSecret(
  secret: string,
  keyInfo: CredentialKeyResponse,
): Promise<EncryptedAuthSecret> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Secure browser crypto is unavailable');
  }

  try {
    const key = await subtle.importKey(
      'spki',
      pemToArrayBuffer(keyInfo.public_key_pem),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt'],
    );
    const ciphertext = await subtle.encrypt(
      { name: 'RSA-OAEP' },
      key,
      new TextEncoder().encode(secret),
    );

    return {
      alg: 'RSA-OAEP-256',
      kid: keyInfo.kid,
      ciphertext: arrayBufferToBase64(ciphertext),
    };
  } catch {
    throw new Error('Credential encryption failed');
  }
}

export async function normalizeAuthResponse(response: Response): Promise<AuthOutcome> {
  const body = await readJson(response);
  if (!response.ok) {
    if (response.status === 401 && body?.error === 'invalid_2fa_code') {
      throw new Error('Invalid authentication code');
    }
    throw new Error(AUTH_ERROR_MESSAGES[response.status] ?? 'Authentication request failed');
  }

  if (body?.status === 'authenticated') {
    const authenticated = body as AuthenticatedResponseBody;
    writeAuthToken(authenticated.token);
    return {
      status: 'authenticated',
      token: authenticated.token,
      tokenType: authenticated.token_type,
      expiresInSeconds: authenticated.expires_in_seconds,
    };
  }

  if (body?.status === '2fa_required') {
    const twoFactor = body as TwoFactorRequiredResponseBody;
    return {
      status: '2fa_required',
      challengeId: twoFactor.challenge_id,
      expiresInSeconds: twoFactor.expires_in_seconds,
    };
  }

  throw new Error('Authentication request failed');
}

async function streamLoginWithCredential(
  username: string,
  credential: EncryptedAuthSecret,
): Promise<AuthOutcome> {
  let firstSettled = false;
  let resolveFirst!: (outcome: AuthOutcome) => void;
  let rejectFirst!: (error: unknown) => void;
  const firstOutcome = new Promise<AuthOutcome>((resolve, reject) => {
    resolveFirst = resolve;
    rejectFirst = reject;
  });

  let finalOutcome: Promise<AuthOutcome>;
  finalOutcome = (async () => {
    try {
      const response = await streamPost(
        '/api/v1/stream/auth/login',
        { username, credential },
        undefined,
        (frame) => {
          const twoFactor = twoFactorOutcomeFromFrame(frame);
          if (twoFactor && !firstSettled) {
            firstSettled = true;
            pendingTwoFactorLogin = {
              challengeId: twoFactor.challengeId,
              finalOutcome,
            };
            resolveFirst(twoFactor);
          }
        },
      );
      const outcome = await normalizeAuthResponse(response);
      if (!firstSettled) {
        firstSettled = true;
        resolveFirst(outcome);
      }
      return outcome;
    } catch (error) {
      if (!firstSettled) {
        firstSettled = true;
        rejectFirst(error);
      }
      throw error;
    }
  })();

  finalOutcome.catch(() => {
    // The first promise reports pre-2FA failures. Post-2FA failures are reported
    // when verifyTwoFactor awaits this promise.
  });

  return firstOutcome;
}

function twoFactorOutcomeFromFrame(frame: StreamFrame): TwoFactorRequiredOutcome | null {
  if (frame.type !== 'require_action') {
    return null;
  }
  if (frame.payload.action_type !== '2fa') {
    return null;
  }
  if (
    typeof frame.payload.challenge_id !== 'string'
    || typeof frame.payload.expires_in_seconds !== 'number'
  ) {
    return null;
  }
  return {
    status: '2fa_required',
    challengeId: frame.payload.challenge_id,
    expiresInSeconds: frame.payload.expires_in_seconds,
  };
}

export function pemToArrayBuffer(publicKeyPem: string): ArrayBuffer {
  const base64 = publicKeyPem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
