import type {AdminRole, ContentKind} from './types';

export function canWriteKind(role: AdminRole, kind: ContentKind) {
  if (role === 'owner') return true;
  if (role === 'editor') return ['page', 'service', 'company', 'seo', 'settings'].includes(kind);
  if (role === 'shop') return ['product', 'catalogue'].includes(kind);
  if (role === 'projects') return kind === 'project';
  return false;
}

export function canReadKind(role: AdminRole, kind: ContentKind) {
  if (['owner', 'editor', 'viewer'].includes(role)) return true;
  if (role === 'shop') return ['product', 'catalogue'].includes(kind);
  if (role === 'projects') return kind === 'project';
  return false;
}

export const canManageEnquiries = (role: AdminRole) => role === 'owner' || role === 'sales';
export const canManageMedia = (role: AdminRole) => ['owner', 'editor', 'shop', 'projects'].includes(role);
export const canReadMedia = (role: AdminRole) => ['owner', 'editor', 'shop', 'projects', 'viewer'].includes(role);
export const canManageUsers = (role: AdminRole) => role === 'owner';
export const canReadNavigation = (role: AdminRole) => ['owner', 'editor', 'viewer'].includes(role);
export const canManageNavigation = (role: AdminRole) => ['owner', 'editor'].includes(role);
export const canReadForms = (role: AdminRole) => ['owner', 'editor', 'sales', 'viewer'].includes(role);
export const canManageForms = (role: AdminRole) => ['owner', 'editor'].includes(role);
