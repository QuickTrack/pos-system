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
export type Role = 'super_admin' | 'admin' | 'manager' | 'cashier' | 'stock_manager';

// All possible permissions in the system
export const ALL_PERMISSIONS = [
  'manage_users',
  'manage_products',
  'manage_categories',
  'manage_customers',
  'manage_suppliers',
  'manage_sales',
  'manage_purchases',
  'manage_expenses',
  'manage_reconciliation',
  'manage_settings',
  'manage_branches',
  'view_reports',
  'view_dashboard',
  'process_refunds',
  'view_customers',
  'export_data',
  'import_data',
  'manage_activity_logs',
  'manage_payroll',
  'process_payroll',
  'approve_payroll',
  'finalize_payroll',
  'view_payroll',
  'manage_employees',
  'manage_advances',
  'manage_loans',
  'manage_payslips',
];

 export const PERMISSIONS: Record<Role, string[]> = {
  super_admin: ALL_PERMISSIONS,
  admin: [
    'manage_users',
    'manage_products',
    'manage_categories',
    'manage_customers',
    'manage_suppliers',
    'manage_sales',
    'manage_purchases',
    'manage_expenses',
    'manage_reconciliation',
    'manage_settings',
    'manage_branches',
    'view_reports',
    'view_dashboard',
    'process_refunds',
    'view_customers',
    'export_data',
    'manage_activity_logs',
    'manage_payroll',
    'process_payroll',
    'approve_payroll',
    'finalize_payroll',
    'view_payroll',
    'manage_employees',
    'manage_advances',
    'manage_loans',
    'manage_payslips',
  ],
  manager: [
    'manage_products',
    'manage_categories',
    'manage_customers',
    'manage_suppliers',
    'manage_sales',
    'manage_purchases',
    'manage_expenses',
    'manage_reconciliation',
    'view_reports',
    'view_dashboard',
    'process_refunds',
    'view_customers',
    'export_data',
    'manage_payroll',
    'process_payroll',
    'approve_payroll',
    'finalize_payroll',
    'view_payroll',
    'manage_employees',
    'manage_advances',
    'manage_loans',
    'manage_payslips',
  ],
  cashier: [
    'manage_sales',
    'manage_reconciliation',
    'view_dashboard',
    'view_customers',
    'view_payroll',
  ],
  stock_manager: [
    'manage_products',
    'manage_categories',
    'manage_suppliers',
    'manage_purchases',
    'view_dashboard',
    'view_payroll',
  ],
};

/**
 * Check if a role has a specific permission
 * Super admin automatically has all permissions
 */
export function hasPermission(role: Role, permission: string): boolean {
  // Super admin has all permissions
  if (role === 'super_admin') {
    return true;
  }
  return PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Check if a role has ALL of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: string[]): boolean {
  // Super admin automatically passes
  if (role === 'super_admin') {
    return true;
  }
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Check if user is super admin (root access)
 */
export function isSuperAdmin(role: Role): boolean {
  return role === 'super_admin';
}
