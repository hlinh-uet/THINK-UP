export type Role = 'student' | 'lecturer' | 'admin';
export type View = 'overview' | 'editor' | 'journey' | 'actions' | 'progress' | 'lecturer' | 'admin';

const views: Record<Role, readonly View[]> = {
  student: ['overview', 'editor', 'journey', 'actions', 'progress'],
  lecturer: ['lecturer'],
  admin: ['admin', 'lecturer'],
};
export function isRole(role: unknown): role is Role { return role === 'student' || role === 'lecturer' || role === 'admin'; }
export function homeView(role: Role): View { return role === 'student' ? 'overview' : role; }
export function homePath(role: Role): string { return `/${role}`; }
export function canView(role: unknown, view: unknown): view is View { return isRole(role) && views[role].includes(view as View); }
export function resolveView(role: Role, requested: unknown): View { return canView(role, requested) ? requested : homeView(role); }
export function viewPath(role: Role, view: View): string { return homePath(role) + (view === homeView(role) ? '' : `?view=${resolveView(role, view)}`); }
