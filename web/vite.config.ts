import { defineConfig, loadEnv } from 'vite';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';

/**
 * Em desenvolvimento, o Vite encaminha /api e /uploads para a API (proxy).
 * Assim o navegador sempre fala com a mesma origem e não há problemas de CORS.
 * Em produção, o Nginx faz o mesmo papel (ver web/nginx.conf).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.API_PROXY_TARGET || 'http://localhost:3000';
  // Carimbo da versão no próprio pacote: sem isso, não há como olhar a tela e
  // saber qual build está rodando — foi assim que um bundle velho passou
  // despercebido por três correções seguidas.
  const versao = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')).version;
  return {
    plugins: [react()],
    define: { __LIVRIN_VERSAO__: JSON.stringify(versao) },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/uploads': { target, changeOrigin: true },
      },
      watch: env.CHOKIDAR_USEPOLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
    },
    preview: { port: 4173, proxy: { '/api': target, '/uploads': target } },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            pdf: ['pdfjs-dist'],
            epub: ['epubjs'],
            react: ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
  };
});
