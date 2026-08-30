import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { handleProxyEvent } from './src/server/proxy-core.mjs';

/**
 * Built-in same-origin CORS proxy for the Vite dev server and `vite preview`.
 *   GET /@proxy?url=<encoded-image-url>
 * It is SSRF-protected, never forwards credentials, and only relays image
 * responses, so it never bypasses access control.
 */
function builtInProxyPlugin() {
  const middleware = async (req, res) => {
    const host = req.headers.host || 'localhost';
    const reqUrl = new URL(req.url ?? '/', `http://${host}`);
    const target = reqUrl.searchParams.get('url');

    if (!target || typeof target !== 'string' || target.length > 8000) {
      res.statusCode = 400;
      res.end('Missing url parameter');
      return;
    }

    try {
      const result = await handleProxyEvent(target);
      res.writeHead(result.status, {
        ...result.headers,
        'access-control-allow-origin': '*',
      });
      res.end(result.body);
    } catch (error) {
      res.writeHead(error.statusCode ?? 500, { 'content-type': 'text/plain' });
      res.end(error.message || 'Proxy error');
    }
  };

  return {
    name: 'built-in-cors-proxy',
    configureServer(server) {
      server.middlewares.use('/@proxy', middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/@proxy', middleware);
    },
  };
}

export default defineConfig(({ command }) => {
  const plugins = command === 'serve' ? [react(), tailwindcss(), builtInProxyPlugin()] : [react(), tailwindcss()];
  return {
    plugins,
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1500,
    },
  };
});
