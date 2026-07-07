import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function normalizeBasePath(basePath: string | undefined): string {
  if (!basePath || basePath === '/') {
    return '/';
  }

  const trimmedBasePath = basePath.trim().replace(/^\/+|\/+$/g, '');
  return trimmedBasePath ? `/${trimmedBasePath}/` : '/';
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    base: normalizeBasePath(env.VITE_BASE_PATH),
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 4177,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 4178,
    },
  };
});
