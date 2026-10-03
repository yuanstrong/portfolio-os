import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { ResourceProvider } from './data/ResourceContext';

export function render(url: string, data: Record<string, unknown> = {}) {
  return renderToString(
    <React.StrictMode>
      <ResourceProvider data={data}>
        <MemoryRouter initialEntries={[url]}>
          <App />
        </MemoryRouter>
      </ResourceProvider>
    </React.StrictMode>
  );
}
