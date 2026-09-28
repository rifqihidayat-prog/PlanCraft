import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/db';
import { AuthUser, UserRole } from '@/types';

export const SESSION_COOKIE_NAME = 'plancraft_session';

export function getSessionUser(req: NextRequest): AuthUser | null {
  // 1. Cek dari Cookie HTTP-only
  let token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  // 2. Fallback cek dari Authorization Header (Bearer token)
  if (!token) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) return null;

  return validateSession(token);
}

export function requireAuth(
  req: NextRequest,
  allowedRoles?: UserRole[]
): { user: AuthUser; error?: never } | { user?: never; error: NextResponse } {
  const user = getSessionUser(req);

  if (!user) {
    return {
      error: NextResponse.json(
        {
          success: false,
          code: 'UNAUTHORIZED',
          message: 'Sesi tidak valid atau telah berakhir. Silakan login terlebih dahulu.',
        },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return {
      error: NextResponse.json(
        {
          success: false,
          code: 'FORBIDDEN',
          message: `Hak akses ditolak. Aksi ini membutuhkan wewenang: ${allowedRoles.join(', ')}.`,
        },
        { status: 403 }
      ),
    };
  }

  return { user };
}
