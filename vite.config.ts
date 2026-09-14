import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function apiPlugin(): Plugin {
  return {
    name: 'api-plugin',
    async configureServer(server) {
      const express = (await import('express')).default;
      const { apiRouter } = await import('./server/api.ts');
      const app = express();
      app.use('/api', apiRouter);

      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/api')) {
          (app as any)(req, res, (err: any) => {
            if (err) {
              console.error('API middleware error:', err);
              if (!res.headersSent) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Internal server error' }));
              }
            }
          });
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
