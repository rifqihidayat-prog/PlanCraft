import { AuthUser, UserRole } from '@/types';

export const DEFAULT_ACCOUNTS: (AuthUser & { pin: string })[] = [
  {
    id: 'user-admin',
    username: 'admin',
    name: 'Admin PPIC',
    role: 'admin',
    pin: '1234',
  },
  {
    id: 'user-prod',
    username: 'produksi',
    name: 'Tim Produksi',
    role: 'production',
    pin: '1234',
  },
];

const AUTH_STORAGE_KEY = 'plancraft_current_user_v1';
const isClient = typeof window !== 'undefined';

export function getStoredUser(): AuthUser {
  if (!isClient) return DEFAULT_ACCOUNTS[0]; // Admin by default for SSR
  try {
    const data = localStorage.getItem(AUTH_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // Default to admin initially
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(DEFAULT_ACCOUNTS[0]));
    return DEFAULT_ACCOUNTS[0];
  } catch {
    return DEFAULT_ACCOUNTS[0];
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

export function switchRole(role: UserRole): AuthUser {
  const account = DEFAULT_ACCOUNTS.find(a => a.role === role) || DEFAULT_ACCOUNTS[0];
  const authUser: AuthUser = {
    id: account.id,
    username: account.username,
    name: account.name,
    role: account.role,
  };
  saveStoredUser(authUser);
  return authUser;
}

export function loginWithCredentials(username: string, pin: string): {
  success: boolean;
  user?: AuthUser;
  message?: string;
} {
  const cleanUsername = username.trim().toLowerCase();
  const cleanPin = pin.trim();

  const account = DEFAULT_ACCOUNTS.find(
    a => a.username.toLowerCase() === cleanUsername && a.pin === cleanPin
  );

  if (!account) {
    return {
      success: false,
      message: 'Username atau PIN salah. (Default PIN: 1234)',
    };
  }

  const authUser: AuthUser = {
    id: account.id,
    username: account.username,
    name: account.name,
    role: account.role,
  };

  saveStoredUser(authUser);
  return {
    success: true,
    user: authUser,
  };
}
