import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { createResourceMiddleware } from './server/portfolio-content.js';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const portfolioHome = env.PORTFOLIO_HOME
    ? path.resolve('.', env.PORTFOLIO_HOME)
    : undefined;
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-portfolio-resources',
        configureServer(server) {
          server.middlewares.use(createResourceMiddleware(portfolioHome));
        },
        configurePreviewServer(server) {
          server.middlewares.use(createResourceMiddleware(portfolioHome));
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
