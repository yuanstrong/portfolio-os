import { useCallback, useEffect, useState } from 'react';
import { clearAuthToken, readAuthToken, writeAuthToken } from '../api/authSession';

export function useAuthSession() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(readAuthToken());
  }, []);

  const signIn = useCallback((nextToken: string) => {
    setToken(nextToken);
    writeAuthToken(nextToken);
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    clearAuthToken();
  }, []);

  return {
    token,
    authenticated: Boolean(token),
    signIn,
    signOut,
  };
}
