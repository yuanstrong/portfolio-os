import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

export function render(url: string) {
  return renderToString(
    <React.StrictMode>
      <MemoryRouter initialEntries={[url]}>
        <App />
      </MemoryRouter>
    </React.StrictMode>
  );
}

export function getRoutes(): string[] {
  return [
    '/',
    '/thoughts',
    '/experience',
    '/projects',
  ];
}
