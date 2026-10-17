import { AppError, assertAdmin, course, database, id, now, one, prepare, session, str } from './server';
import { hashPassword, validPassword } from './security';
import type { User } from './domain';

export async function createManagedUser(request: Request, actor: User, body: Record<string, unknown>) {
  assertAdmin(actor);
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new AppError('Yêu cầu không cùng nguồn.', 403);
  const name = str(body.name, 120, true);
  const email = str(body.email, 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('Địa chỉ email chưa hợp lệ.');
  if (body.role !== 'student' && body.role !== 'lecturer') throw new AppError('Chọn vai trò sinh viên hoặc giảng viên.');
  if (!validPassword(body.password)) throw new AppError('Mật khẩu cần ít nhất 12 ký tự và tối đa 72 byte.');
  const courseIds = body.courseIds ?? [];
  if (!Array.isArray(courseIds) || courseIds.length > 30 || courseIds.some(c => typeof c !== 'string' || !c.trim() || c.length > 100)) throw new AppError('Danh sách học phần chưa hợp lệ.');
  const assignments = [...new Set(courseIds.map(c => c.trim()))];
  for (const courseId of assignments) await course(actor, courseId, true);
  if (await one('SELECT id FROM users WHERE email=?', email)) throw new AppError('Email đã có tài khoản. Vui lòng chỉnh sửa tài khoản hiện có.', 409);
  const passwordHash = await hashPassword(body.password);
  // Hashing is asynchronous: recheck the administrator's live permissions.
  assertAdmin((await session(request))!);
  const user: User = { id: id(), email, name, role: body.role, active: 1 };
  const stamp = now();
  try {
    await database().batch([
      prepare('INSERT INTO users (id,email,name,role,active,created_at) VALUES (?,?,?,?,1,?)', user.id, email, name, user.role, stamp),
      prepare('INSERT INTO credentials (user_id,password_hash,created_at) VALUES (?,?,?)', user.id, passwordHash, stamp),
      ...assignments.map(courseId => prepare('INSERT INTO memberships (id,course_id,user_id,role) VALUES (?,?,?,?)', id(), courseId, user.id, user.role)),
      prepare('INSERT INTO audit (id,user_id,action,target_id,detail,created_at) VALUES (?,?,?,?,?,?)', id(), actor.id, 'User created', user.id, JSON.stringify({ email, role: user.role, courseIds: assignments }), stamp),
    ]);
  } catch (error) {
    if (await one('SELECT id FROM users WHERE email=?', email)) throw new AppError('Email đã có tài khoản. Vui lòng chỉnh sửa tài khoản hiện có.', 409);
    throw error;
  }
  return { id: user.id, user };
}

export async function updateManagedUser(actor:User,body:Record<string,unknown>) {
  assertAdmin(actor);
  const targetId=str(body.id,100,true),role=str(body.role,20,true);
  if(!['student','lecturer','admin'].includes(role))throw new AppError('Vai trò không hợp lệ.');
  if(![0,1,false,true].includes(body.active as number|boolean))throw new AppError('Trạng thái tài khoản chưa hợp lệ.');
  const active=body.active?1:0,owner=await one<{value:string}>("SELECT value FROM settings WHERE key='owner'");
  if((targetId===actor.id||targetId===owner?.value)&&(!active||role!=='admin'))throw new AppError('Không thể tạm ngừng hoặc hạ quyền tài khoản sở hữu.');
  const target=await one<User>('SELECT * FROM users WHERE id=?',targetId);
  if(!target)throw new AppError('Không tìm thấy người dùng.',404);
  const name=str(body.name,120,true),email=body.email===undefined?target.email:str(body.email,254,true).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new AppError('Địa chỉ email chưa hợp lệ.');
  const conflict=()=>one('SELECT id FROM users WHERE email=? AND id!=?',email,targetId);
  if(await conflict())throw new AppError('Email đã có tài khoản. Vui lòng chọn email khác.',409);
  const stamp=now();
  try{
    await database().batch([
      prepare('UPDATE users SET name=?,email=?,role=?,active=? WHERE id=?',name,email,role,active,targetId),
      prepare('INSERT INTO audit (id,user_id,action,target_id,detail,created_at) VALUES (?,?,?,?,?,?)',id(),actor.id,'user-save',targetId,JSON.stringify({email,role,active}),stamp),
    ]);
  }catch(error){if(await conflict())throw new AppError('Email đã có tài khoản. Vui lòng chọn email khác.',409);throw error}
  return {ok:true};
}
