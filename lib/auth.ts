import { one, prepare, database, initialize, session, platformSession, AppError, id, now, log } from './server';
import { homePath, isRole } from './access';
import { hashPassword, verifyPassword, validPassword, newSessionToken, sessionDigest, sessionCookieHeader, readCookie, sessionCookie, sessionLifetime } from './security';
import type { User } from './domain';

const dummyHash = '$2b$12$rtvkc9mjuYbCjfEu2HMNEO/HTyWJkMRetJJkZ.lcyRExj6jqX3VUm';
const json = (value: unknown, headers: HeadersInit = {}) => Response.json(value,{headers:{'Cache-Control':'no-store',...headers}});
function emailValue(value: unknown): string {
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) throw new AppError('Địa chỉ email chưa hợp lệ.');
  return value.trim().toLowerCase();
}
function passwordValue(value: unknown): string {
  if (!validPassword(value)) throw new AppError('Mật khẩu cần ít nhất 12 ký tự và tối đa 72 byte.');
  return value;
}
function assertOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new AppError('Yêu cầu không cùng nguồn.',403);
}
async function limit(key: string, maximum: number, period = 15 * 60 * 1000) {
  const start=Math.floor(Date.now()/period)*period;
  const row=await one<{attempts:number}>('INSERT INTO auth_limits (key,window_start,attempts) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window_start=excluded.window_start THEN attempts+1 ELSE 1 END,window_start=excluded.window_start RETURNING attempts',await sessionDigest(key),start);
  if (!row || row.attempts>maximum) throw new AppError('Quá nhiều lần thử. Vui lòng chờ 15 phút rồi thử lại.',429);
}
async function createSession(user: User, request: Request) {
  const token=newSessionToken();
  await database().batch([
    prepare('DELETE FROM sessions WHERE expires_at<=?',Date.now()),
    prepare('DELETE FROM auth_limits WHERE window_start<?',Date.now()-24*60*60*1000),
    prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)',await sessionDigest(token),user.id,Date.now()+sessionLifetime*1000),
  ]);
  if (!isRole(user.role)) throw new AppError('Vai trò tài khoản chưa hợp lệ.',403);
  return json({user,redirect:homePath(user.role)},{'Set-Cookie':sessionCookieHeader(token,request)});
}
export async function authState(request: Request) {
  await initialize();
  let user: User|null=null;
  try { if(readCookie(request,sessionCookie))user=await session(request,false); } catch(error) { if(!(error instanceof AppError) || error.status!==403)throw error; }
  let setup: Pick<User,'name'|'email'|'role'>|null=null;
  if (!user) {
    // An email account may share the visitor's platform email, with a different
    // user ID. Do not provision a second account or switch into it automatically.
    const platformEmail=request.headers.get('oai-authenticated-user-email')?.toLowerCase();
    const existing=platformEmail?await one('SELECT c.user_id FROM credentials c JOIN users u ON u.id=c.user_id WHERE u.email=?',platformEmail):null;
    if(!existing){const platform=await platformSession(request,false);if(platform && !await one('SELECT user_id FROM credentials WHERE user_id=?',platform.id))setup={name:platform.name,email:platform.email,role:platform.role};}
  }
  return json({user,setup,redirect:user && isRole(user.role)?homePath(user.role):null});
}
export async function authenticate(request: Request, operation: string) {
  assertOrigin(request);await initialize();
  if (operation==='logout') {
    const token=readCookie(request,sessionCookie);
    if (token && /^[a-f0-9]{64}$/.test(token))await prepare('DELETE FROM sessions WHERE token_hash=?',await sessionDigest(token)).run();
    return json({ok:true,redirect:'/'},{'Set-Cookie':sessionCookieHeader('',request,0)});
  }
  if (!['login','register','setup'].includes(operation)) throw new AppError('Không tìm thấy thao tác.',404);
  const length=Number(request.headers.get('content-length')||0);
  if(length>4096)throw new AppError('Thông tin chưa hợp lệ hoặc quá dài.',413);
  if(!request.headers.get('content-type')?.includes('application/json'))throw new AppError('Thông tin chưa hợp lệ.');
  let body:Record<string,unknown>;
  try { const raw=await request.text();if(raw.length>4096)throw new Error();body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))throw new Error(); } catch { throw new AppError('Thông tin chưa hợp lệ.'); }
  const peer=request.headers.get('cf-connecting-ip');
  if(peer)await limit(`ip:${peer}`,40);
  if(operation==='setup') {
    const user=await platformSession(request);
    if(!user)throw new AppError('Vui lòng xác thực tài khoản hiện có trước khi kích hoạt.',401);
    await limit(`setup:${user.id}`,8);
    const password=passwordValue(body.password);
    if(await one('SELECT user_id FROM credentials WHERE user_id=?',user.id))throw new AppError('Tài khoản đã có mật khẩu. Vui lòng đăng nhập.',409);
    const hash=await hashPassword(password);
    const result=await prepare('INSERT INTO credentials (user_id,password_hash,created_at) VALUES (?,?,?) ON CONFLICT(user_id) DO NOTHING',user.id,hash,now()).run();
    if(result.meta.changes!==1)throw new AppError('Tài khoản đã có mật khẩu. Vui lòng đăng nhập.',409);
    await log(user,'Account activated',user.id);
    return createSession(user,request);
  }
  const email=emailValue(body.email);
  await limit(`${operation}:${email}`,operation==='login'?8:4);
  if(operation==='login') {
    const row=await one<User & {password_hash:string}>('SELECT u.id,u.email,u.name,u.role,u.active,c.password_hash FROM users u JOIN credentials c ON c.user_id=u.id WHERE u.email=?',email);
    const password=typeof body.password==='string'&&new TextEncoder().encode(body.password).length<=72?body.password:'';
    const matches=await verifyPassword(password,row?.password_hash||dummyHash);
    if(!matches||!row)throw new AppError('Email hoặc mật khẩu không đúng.',401);
    if(!row.active)throw new AppError('Tài khoản đã bị tạm ngừng. Vui lòng liên hệ quản trị viên.',403);
    const {password_hash: _password,...user}=row;
    return createSession(user,request);
  }
  const password=passwordValue(body.password);
  if(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>120)throw new AppError('Họ và tên chưa hợp lệ.');
  if(await one('SELECT id FROM users WHERE email=?',email))throw new AppError('Email đã có tài khoản. Vui lòng đăng nhập hoặc kích hoạt tài khoản hiện có.',409);
  const user:User={id:id(),name:body.name.trim(),email,role:'student',active:1};
  const hash=await hashPassword(password);
  try {
    await database().batch([
      prepare('INSERT INTO users (id,email,name,role,active,created_at) VALUES (?,?,?,?,1,?)',user.id,email,user.name,'student',now()),
      prepare('INSERT INTO credentials (user_id,password_hash,created_at) VALUES (?,?,?)',user.id,hash,now()),
    ]);
  } catch(error) { if(await one('SELECT id FROM users WHERE email=?',email))throw new AppError('Email đã có tài khoản. Vui lòng đăng nhập hoặc kích hoạt tài khoản hiện có.',409);throw error; }
  // A typed email cannot prove ownership of a pending privileged invitation.
  // Admins review and assign roles after registration.
  await log(user,'Account registered',user.id);
  return createSession(user,request);
}
