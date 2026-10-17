export type Role = 'student' | 'lecturer' | 'admin';
export type View = 'overview' | 'editor' | 'journey' | 'actions' | 'progress' | 'lecturer' | 'admin' | 'messages';

export const studentPages=[
  {key:'overview',label:'Tổng quan'}, {key:'editor',label:'Reflection Editor'},
  {key:'journey',label:'Hành trình & hành động'},
  {key:'progress',label:'Tiến bộ của tôi'}, {key:'messages',label:'Tin nhắn'},
] as const;

const views: Record<Role, readonly View[]> = {
  student: ['overview', 'editor', 'journey', 'actions', 'progress','messages'],
  lecturer: ['lecturer','messages'],
  admin: ['admin', 'lecturer','messages'],
};
export function isRole(role: unknown): role is Role { return role === 'student' || role === 'lecturer' || role === 'admin'; }
export function homeView(role: Role): View { return role === 'student' ? 'overview' : role; }
export function homePath(role: Role): string { return `/${role}`; }
export function canView(role: unknown, view: unknown): view is View { return isRole(role) && views[role].includes(view as View); }
export function resolveView(role: Role, requested: unknown): View { return role === 'student' && requested === 'actions' ? 'journey' : canView(role, requested) ? requested : homeView(role); }
export function viewPath(role: Role, view: View): string { return view==='messages'?`/${role}/messages`:homePath(role) + (view === homeView(role) ? '' : `?view=${resolveView(role, view)}`); }
