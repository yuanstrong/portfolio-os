import { createContext, type ReactNode } from 'react';

declare global {
  interface Window {
    __INITIAL_DATA__?: Record<string, unknown>;
  }
}

export const ResourceContext = createContext<Record<string, unknown>>({});

export function ResourceProvider({
  data,
  children,
}: {
  data: Record<string, unknown>;
  children: ReactNode;
}) {
  return (
    <ResourceContext.Provider value={data}>
      {children}
    </ResourceContext.Provider>
  );
}
