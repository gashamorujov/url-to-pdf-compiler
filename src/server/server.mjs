/**
 * Standalone production proxy (used as-is, or adapted to Vercel/Netlify).
 * Run: VITE_CORS_PROXY=http://localhost:8787 node src/server/server.mjs
 */
import http from 'node:http';
import { handleProxyEvent } from './proxy-core.mjs';

const PORT = process.env.PORT || 8787;

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (reqUrl.pathname !== '/proxy') {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
    return;
  }

  const target = reqUrl.searchParams.get('url');
  if (!target || typeof target !== 'string' || target.length > 8000) {
    res.writeHead(400, { 'content-type': 'text/plain' });
    res.end('Missing url parameter');
    return;
  }

  // Very small, in-memory burst limiter (per process).
  if (global.__proxyInflight === undefined) global.__proxyInflight = 0;
  if (global.__proxyInflight >= 64) {
    res.writeHead(429, { 'content-type': 'text/plain' });
    res.end('Too many requests');
    return;
  }
  global.__proxyInflight += 1;

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
  } finally {
    global.__proxyInflight -= 1;
  }
});

server.listen(PORT, () => {
  console.log(`CORS proxy listening on http://localhost:${PORT}`);
});
