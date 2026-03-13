import jwt from 'jsonwebtoken';

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
