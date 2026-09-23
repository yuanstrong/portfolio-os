export const AUTH_TOKEN_STORAGE_KEY = 'jarvis.auth.token';

export function readAuthToken(): string | null {
  return authStorage()?.getItem(AUTH_TOKEN_STORAGE_KEY) ?? null;
}

export function writeAuthToken(token: string): void {
  authStorage()?.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken(): void {
  authStorage()?.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function authorizationHeaders(token = readAuthToken()): Record<string, string> {
  return token ? { authorization: `Bearer ${token}` } : {};
}

function authStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis.localStorage !== 'undefined') {
      return globalThis.localStorage;
    }
  } catch {
    return null;
  }

  return null;
}
