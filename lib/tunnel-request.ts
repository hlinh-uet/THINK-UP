// Enabled only by the local hosting launcher, never inferred from client headers.
export function tunnelRequest(request: Request, publicOrigin?: string): Request {
  if (!publicOrigin) return request;
  const origin = new URL(publicOrigin);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash || ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) {
    throw new Error('THINKUP_PUBLIC_ORIGIN must be a public HTTPS origin.');
  }
  const url = new URL(request.url);
  url.protocol = origin.protocol;
  url.host = origin.host;
  url.port = origin.port;
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) {
    if (name.startsWith('oai-authenticated-') || name.startsWith('x-forwarded-') || name === 'forwarded') headers.delete(name);
  }
  headers.set('host', origin.host);
  return new Request(url, { method: request.method, headers, body: request.body, redirect: request.redirect, ...(request.body ? { duplex: 'half' } : {}) });
}
