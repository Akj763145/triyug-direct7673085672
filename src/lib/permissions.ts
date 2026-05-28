import { api } from './api';

export type PermissionKey = 'dashboard' | 'students' | 'staff' | 'batches' | 'fees' | 'ledger' | 'resources';

export interface RolePermissions {
  dashboard: boolean;
  students: boolean;
  staff: boolean;
  batches: boolean;
  fees: boolean;
  ledger: boolean;
  resources: boolean;
}

export const defaultPermissions: Record<string, RolePermissions> = {
  Admin: {
    dashboard: true,
    students: true,
    staff: true,
    batches: true,
    fees: true,
    ledger: true,
    resources: true,
  },
  Receptionist: {
    dashboard: true,
    students: true,
    staff: false,
    batches: false,
    fees: true,
    ledger: false,
    resources: true,
  }
};

let permissionsCache: Record<string, RolePermissions> = defaultPermissions;

export async function refreshPermissions(): Promise<Record<string, RolePermissions>> {
  try {
    const remote = await api.getRolePermissions();
    if (Object.keys(remote).length > 0) {
      // Merge with defaults to ensure all keys exist
      const merged: Record<string, RolePermissions> = {};
      Object.keys(defaultPermissions).forEach(role => {
        merged[role] = { ...defaultPermissions[role], ...(remote[role] || {}) };
      });
      // Handle custom roles if any
      Object.keys(remote).forEach(role => {
        if (!merged[role]) merged[role] = remote[role];
      });
      
      permissionsCache = merged;
      localStorage.setItem('triyuga_role_permissions', JSON.stringify(merged));
      window.dispatchEvent(new Event('triyuga_permissions_updated'));
      return merged;
    }
  } catch (e) {
    console.error('Failed to refresh permissions from Supabase:', e);
  }
  
  // Try loading from localStorage if remote fails
  const stored = localStorage.getItem('triyuga_role_permissions');
  if (stored) {
    try {
      permissionsCache = JSON.parse(stored);
    } catch (e) {}
  }
  
  return permissionsCache;
}

export function getRolePermissions(role: string): RolePermissions {
  // If cache is empty and we have something in localStorage, use it
  if (Object.keys(permissionsCache).length <= 2) {
     const stored = localStorage.getItem('triyuga_role_permissions');
     if (stored) {
       try {
         const parsed = JSON.parse(stored);
         if (parsed[role]) return parsed[role];
       } catch (e) {}
     }
  }
  return permissionsCache[role] || defaultPermissions[role] || defaultPermissions.Receptionist;
}

export async function saveRolePermissions(role: string, permissions: RolePermissions) {
  // 1. Update Supabase
  const result = await api.saveRolePermissions(role, permissions);
  
  // 2. Update local cache and notify
  if (result.success) {
    permissionsCache[role] = permissions;
    localStorage.setItem('triyuga_role_permissions', JSON.stringify(permissionsCache));
    window.dispatchEvent(new Event('triyuga_permissions_updated'));
  }
  
  return result;
}

export function hasPermission(role: string, key: PermissionKey): boolean {
  if (role === 'Admin') return true;
  const perms = getRolePermissions(role);
  return perms[key] !== false;
}

export function getPermissionKeyFromPath(path: string): PermissionKey {
  if (path === '/' || path === '') return 'dashboard';
  if (path.startsWith('/students')) return 'students';
  if (path.startsWith('/staff')) return 'staff';
  if (path.startsWith('/batches')) return 'batches';
  if (path.startsWith('/fees')) return 'fees';
  if (path.startsWith('/ledger')) return 'ledger';
  if (path.startsWith('/resources')) return 'resources';
  return 'dashboard';
}
