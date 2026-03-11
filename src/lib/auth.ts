import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'nairobi-pos-secret-key-change-in-production';

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  branch?: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) return null;
    
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function setAuthCookie(token: string): void {
  cookies().then(cookieStore => {
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
  });
}

export function removeAuthCookie(): void {
  cookies().then(cookieStore => {
    cookieStore.delete('auth-token');
  });
}

// Role-based access control
export type Role = 'admin' | 'manager' | 'cashier' | 'stock_manager';

export const PERMISSIONS: Record<Role, string[]> = {
  admin: [
    'manage_users',
    'manage_products',
    'manage_categories',
    'manage_customers',
    'manage_suppliers',
    'manage_sales',
    'manage_purchases',
    'manage_settings',
    'manage_branches',
    'view_reports',
    'view_dashboard',
    'process_refunds',
  ],
  manager: [
    'manage_products',
    'manage_categories',
    'manage_customers',
    'manage_suppliers',
    'manage_sales',
    'manage_purchases',
    'view_reports',
    'view_dashboard',
    'process_refunds',
  ],
  cashier: [
    'manage_sales',
    'view_dashboard',
    'view_customers',
  ],
  stock_manager: [
    'manage_products',
    'manage_categories',
    'manage_suppliers',
    'manage_purchases',
    'view_dashboard',
  ],
};

export function hasPermission(role: Role, permission: string): boolean {
  return PERMISSIONS[role]?.includes(permission) || false;
}
