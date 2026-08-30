import { handleProxyEvent } from '../../src/server/proxy-core.mjs';

export const config = {
  path: '/.netlify/functions/image-proxy',
};

export default async (request) => {
  const url = new URL(request.url).searchParams.get('url');
  if (!url || typeof url !== 'string' || url.length > 8000) {
    return Response.json({ error: 'Missing url parameter' }, { status: 400 });
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
    return Response.json({ error: error.message || 'Proxy error' }, { status: error.statusCode ?? 500 });
  }
};
