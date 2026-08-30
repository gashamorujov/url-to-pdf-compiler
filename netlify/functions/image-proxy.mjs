import { handleProxyEvent } from '../../src/server/proxy-core.mjs';

export const config = {
  path: '/.netlify/functions/image-proxy',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export default async (request) => {
  const url = new URL(request.url).searchParams.get('url');
  if (!url || typeof url !== 'string' || url.length > 8000) {
    return jsonResponse({ error: 'Missing url parameter' }, 400);
  }
  try {
    const result = await handleProxyEvent(url);
    return new Response(result.body, {
      status: result.status,
      headers: {
        'content-type': result.headers['content-type'],
        'cache-control': result.headers['cache-control'],
        'access-control-allow-origin': '*',
      },
    });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Proxy error' }, error.statusCode ?? 500);
  }
};
