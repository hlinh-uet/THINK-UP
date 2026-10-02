import { headers } from 'next/headers';

export async function pageRequest(path: string): Promise<Request> {
  const values = await headers();
  const host = values.get('x-forwarded-host') || values.get('host') || 'localhost:3000';
  const protocol = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host) ? 'http' : 'https';
  return new Request(`${protocol}://${host}${path}`, { headers: new Headers(values) });
}
