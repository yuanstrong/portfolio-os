import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { ResourceProvider } from './data/ResourceContext';
import './index.css';

const rootElement = document.getElementById('root')!;
const initialData = window.__INITIAL_DATA__ ?? {};
const app = (
  <StrictMode>
    <ResourceProvider data={initialData}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ResourceProvider>
  </StrictMode>
);

const isHtmlEmpty =
  rootElement.innerHTML.trim() === '' ||
  rootElement.innerHTML.trim() === '<!--app-html-->';

if (isHtmlEmpty) {
  createRoot(rootElement).render(app);
} else {
  hydrateRoot(rootElement, app);
}
