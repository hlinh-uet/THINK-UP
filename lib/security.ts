import bcrypt from 'bcryptjs';

export const sessionCookie = 'thinkup-session';
export const sessionLifetime = 7 * 24 * 60 * 60;
export function validPassword(value: unknown): value is string {
  return typeof value === 'string' && Array.from(value).length >= 12 && new TextEncoder().encode(value).length <= 72;
}
export function hashPassword(password: string): Promise<string> { return bcrypt.hash(password, 12); }
export function verifyPassword(password: string, hash: string): Promise<boolean> { return bcrypt.compare(password, hash); }
export function newSessionToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2,'0')).join('');
}
export async function sessionDigest(token: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2,'0')).join('');
}
export function readCookie(request: Request, name: string): string | null {
  const value = request.headers.get('cookie')?.split(';').map(part=>part.trim()).find(part=>part.startsWith(name+'='));
  return value ? value.slice(name.length+1) : null;
}
export function sessionCookieHeader(token: string, request: Request, maxAge = sessionLifetime): string {
  return `${sessionCookie}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
