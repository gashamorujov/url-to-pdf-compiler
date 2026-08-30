/**
 * Shared CORS proxy core used by the Vite dev middleware and the standalone
 * Node server (src/server/server.mjs).
 *
 * SSRF protection, timeout and size limits are enforced, and NO authentication
 * headers are forwarded, so this never bypasses access control. The proxy is
 * only needed when a third-party host (like imo-epublications.org) serves
 * images without permissive CORS headers.
 */
import http from 'node:http';
import https from 'node:https';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const MAX_RESPONSE_BYTES = 50 * 1024 * 1024; // 50 MB safety cap
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_REDIRECTS = 5;

const IPV4_PRIVATE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|0\.)/;
const IPV4_LINK_LOCAL = /^169\.254\./;
const IPV6_PRIVATE = /(^|:)(f[cd][0-9a-f]{2}|fe80):/i;
const METADATA_HOSTS = /(^|\.)(metadata\.google\.internal|169\.254\.169\.254)$/i;
const LOCALHOST_RE = /(^|\.)localhost$/i;

function isPrivate(hostname) {
  const host = hostname.toLowerCase();
  if (LOCALHOST_RE.test(host) || METADATA_HOSTS.test(host)) return true;
  if (IPV4_PRIVATE.test(host) || IPV4_LINK_LOCAL.test(host)) return true;
  if (IPV6_PRIVATE.test(host)) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    // Any bare IPv4 is treated as private to avoid internal-network SSRF.
    return true;
  }
  return false;
}

function validateUrl(raw) {
  const url = new URL(raw, 'https://invalid.invalid');
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    const error = new Error('Only http and https URLs are allowed.');
    error.statusCode = 400;
    throw error;
  }
  if (!url.hostname) {
    const error = new Error('Invalid URL.');
    error.statusCode = 400;
    throw error;
  }
  if (isPrivate(url.hostname)) {
    const error = new Error('This URL points to a private or internal address.');
    error.statusCode = 403;
    throw error;
  }
  return url;
}

function request(url, { redirects = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;

    const requestObj = transport.get(
      url,
      { headers: { 'user-agent': 'URL-to-PDF-Compiler-proxy/1.0' } },
      (response) => {
        const { statusCode, headers } = response;
        const contentType = headers['content-type'] ?? '';
        const location = headers.location;

        if (statusCode >= 300 && statusCode < 400 && location) {
          response.resume();
          if (redirects >= MAX_REDIRECTS) {
            reject(Object.assign(new Error('Too many redirects.'), { statusCode: 502 }));
            return;
          }
          const nextUrl = new URL(location, url);
          request(nextUrl, { redirects: redirects + 1 }).then(resolve, reject);
          return;
        }

        if (statusCode === 401 || statusCode === 403) {
          response.resume();
          reject(
            Object.assign(
              new Error(`The remote server requires authentication (HTTP ${statusCode}). This app does not bypass access control.`),
              { statusCode: statusCode === 401 ? 502 : 502 },
            ),
          );
          return;
        }

        if (!statusCode || statusCode < 200 || statusCode >= 300) {
          response.resume();
          reject(Object.assign(new Error(`Remote server responded with HTTP ${statusCode}.`), { statusCode: 502 }));
          return;
        }

        if (!/^image\//i.test(contentType)) {
          response.resume();
          reject(Object.assign(new Error(`Remote server did not return an image (${contentType || 'unknown type'}).`), { statusCode: 502 }));
          return;
        }

        const chunks = [];
        let totalBytes = 0;
        let timedOut = false;

        const timer = setTimeout(() => {
          timedOut = true;
          response.destroy();
          reject(Object.assign(new Error('Remote server timed out.'), { statusCode: 504 }));
        }, REQUEST_TIMEOUT_MS);

        response.on('data', (chunk) => {
          totalBytes += chunk.length;
          if (totalBytes > MAX_RESPONSE_BYTES) {
            timedOut = true;
            response.destroy();
            reject(Object.assign(new Error('Remote response exceeded size limit.'), { statusCode: 502 }));
            return;
          }
          chunks.push(chunk);
        });

        response.on('end', () => {
          if (timedOut) return;
          clearTimeout(timer);
          resolve({
            buffer: Buffer.concat(chunks),
            contentType,
            statusCode,
          });
        });

        response.on('error', (err) => {
          if (timedOut) return;
          clearTimeout(timer);
          reject(Object.assign(new Error(`Upstream error: ${err.message}`), { statusCode: 502 }));
        });
      },
    );

    requestObj.setTimeout(REQUEST_TIMEOUT_MS, () => {
      requestObj.destroy(Object.assign(new Error('Request timed out.'), { statusCode: 504 }));
    });

    requestObj.on('error', (err) => reject(Object.assign(new Error(`Upstream error: ${err.message}`), { statusCode: err.code === 'ENOTFOUND' ? 502 : 502 })));
  });
}

/** Shared handler: returns { status, headers, body } or throws with statusCode. */
export async function handleProxyEvent(url) {
  const target = validateUrl(url);
  const remote = await request(target);
  return {
    status: remote.statusCode,
    headers: {
      'content-type': remote.contentType,
      'cache-control': 'public, max-age=86400',
    },
    body: remote.buffer,
  };
}
