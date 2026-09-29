import { AuthUser } from '@/types';

const AUTH_STORAGE_KEY = 'plancraft_current_user_v1';
const isClient = typeof window !== 'undefined';

export function getStoredUser(): AuthUser | null {
  if (!isClient) return null;
  try {
    const data = localStorage.getItem(AUTH_STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as AuthUser;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStoredUser(user: AuthUser): void {
  if (!isClient) return;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save user session', e);
  }
}

export function logoutUser(): void {
  if (!isClient) return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear user session', e);
  }
}
