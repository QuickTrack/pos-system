import { Tutorial } from '@/lib/training/tutorial-engine';

export type UserRole = 'admin' | 'cashier' | 'store_manager';

export interface RolePermissions {
  canViewReports: boolean;
  canManageInventory: boolean;
  canProcessRefunds: boolean;
  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
  canProcessSales: boolean;
  canManageCustomers: boolean;
}

export interface RoleTrainingFlow {
  role: UserRole;
  displayName: string;
  description: string;
  permissions: RolePermissions;
  tutorials: Tutorial[];
  estimatedCompletionTime: number; // in minutes
}

const rolePermissions: Record<UserRole, RolePermissions> = {
  admin: {
    canViewReports: true,
    canManageInventory: true,
    canProcessRefunds: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canManageSettings: true,
    canProcessSales: true,
    canManageCustomers: true,
  },
  cashier: {
    canViewReports: false,
    canManageInventory: false,
    canProcessRefunds: true,
    canManageUsers: false,
    canViewAnalytics: false,
    canManageSettings: false,
    canProcessSales: true,
    canManageCustomers: true,
  },
  store_manager: {
    canViewReports: true,
    canManageInventory: true,
    canProcessRefunds: true,
    canManageUsers: false,
    canViewAnalytics: true,
    canManageSettings: false,
    canProcessSales: true,
    canManageCustomers: true,
  },
};

const adminTutorials: Tutorial[] = [
  {
    id: 'admin-dashboard',
    title: 'Dashboard Overview',
    description: 'Learn how to navigate the admin dashboard and view key metrics',
    steps: [
      {
        id: 'step-1',
        title: 'Welcome to Dashboard',
        content: 'The dashboard provides an overview of your business performance. Let\'s explore the key sections.',
        target: '[data-tutorial="dashboard"]',
        position: 'bottom',
      },
      {
        id: 'step-2',
        title: 'Sales Metrics',
        content: 'View today\'s sales, total revenue, and transaction counts at a glance.',
        target: '[data-tutorial="sales-metrics"]',
        position: 'bottom',
      },
      {
        id: 'step-3',
        title: 'Quick Actions',
        content: 'Access frequently used features like new sales, inventory management, and reports.',
        target: '[data-tutorial="quick-actions"]',
        position: 'left',
      },
    ],
    category: 'getting-started',
    estimatedTime: 5,
  },
  {
    id: 'admin-inventory',
    title: 'Inventory Management',
    description: 'Learn how to add, edit, and manage your product inventory',
    steps: [
      {
        id: 'step-1',
        title: 'Access Inventory',
        content: 'Navigate to the Inventory section from the sidebar menu.',
        target: '[data-tutorial="nav-inventory"]',
        position: 'right',
      },
      {
        id: 'step-2',
        title: 'Add New Product',
        content: 'Click the "Add Product" button to create a new product entry.',
        target: '[data-tutorial="add-product"]',
        position: 'bottom',
      },
      {
        id: 'step-3',
        title: 'Product Details',
        content: 'Fill in product information including name, SKU, price, and stock quantity.',
        target: '[data-tutorial="product-form"]',
        position: 'left',
      },
    ],
    category: 'inventory',
    estimatedTime: 10,
  },
  {
    id: 'admin-reports',
    title: 'Reports & Analytics',
    description: 'Generate and analyze business reports',
    steps: [
      {
        id: 'step-1',
        title: 'Access Reports',
        content: 'Navigate to the Reports section to view available report types.',
        target: '[data-tutorial="nav-reports"]',
        position: 'right',
      },
      {
        id: 'step-2',
        title: 'Sales Reports',
        content: 'Generate sales reports by date range, product, or category.',
        target: '[data-tutorial="sales-reports"]',
        position: 'bottom',
      },
      {
        id: 'step-3',
        title: 'Export Reports',
        content: 'Export reports to PDF or CSV format for external analysis.',
        target: '[data-tutorial="export-reports"]',
        position: 'left',
      },
    ],
    category: 'reports',
    estimatedTime: 8,
  },
];

const cashierTutorials: Tutorial[] = [
  {
    id: 'cashier-pos',
    title: 'Point of Sale',
    description: 'Learn how to process sales transactions',
    steps: [
      {
        id: 'step-1',
        title: 'Start New Sale',
        content: 'Click the "New Sale" button to begin a transaction.',
        target: '[data-tutorial="new-sale"]',
        position: 'bottom',
      },
      {
        id: 'step-2',
        title: 'Add Products',
        content: 'Search for products by name or scan barcodes to add items to the cart.',
        target: '[data-tutorial="product-search"]',
        position: 'bottom',
      },
      {
        id: 'step-3',
        title: 'Process Payment',
        content: 'Select payment method and complete the transaction.',
        target: '[data-tutorial="payment"]',
        position: 'left',
      },
    ],
    category: 'sales',
    estimatedTime: 7,
  },
  {
    id: 'cashier-customers',
    title: 'Customer Management',
    description: 'Add and manage customer information',
    steps: [
      {
        id: 'step-1',
        title: 'Add Customer',
        content: 'Click "Add Customer" to create a new customer profile.',
        target: '[data-tutorial="add-customer"]',
        position: 'bottom',
      },
      {
        id: 'step-2',
        title: 'Customer Details',
        content: 'Enter customer name, phone, and email for future reference.',
        target: '[data-tutorial="customer-form"]',
        position: 'left',
      },
    ],
    category: 'customers',
    estimatedTime: 5,
  },
];

const storeManagerTutorials: Tutorial[] = [
  {
    id: 'manager-inventory',
    title: 'Inventory Control',
    description: 'Manage stock levels and inventory tracking',
    steps: [
      {
        id: 'step-1',
        title: 'Stock Overview',
        content: 'View current stock levels and identify low-stock items.',
        target: '[data-tutorial="stock-overview"]',
        position: 'bottom',
      },
      {
        id: 'step-2',
        title: 'Stock Adjustments',
        content: 'Make stock adjustments for received goods or corrections.',
        target: '[data-tutorial="stock-adjust"]',
        position: 'left',
      },
    ],
    category: 'inventory',
    estimatedTime: 8,
  },
  {
    id: 'manager-analytics',
    title: 'Sales Analytics',
    description: 'Analyze sales performance and trends',
    steps: [
      {
        id: 'step-1',
        title: 'Sales Trends',
        content: 'View daily, weekly, and monthly sales trends.',
        target: '[data-tutorial="sales-trends"]',
        position: 'bottom',
      },
      {
        id: 'step-2',
        title: 'Top Products',
        content: 'Identify best-selling products and categories.',
        target: '[data-tutorial="top-products"]',
        position: 'left',
      },
    ],
    category: 'analytics',
    estimatedTime: 6,
  },
];

export const roleTrainingFlows: Record<UserRole, RoleTrainingFlow> = {
  admin: {
    role: 'admin',
    displayName: 'Administrator',
    description: 'Full system access with all management capabilities',
    permissions: rolePermissions.admin,
    tutorials: adminTutorials,
    estimatedCompletionTime: adminTutorials.reduce((sum, t) => sum + t.estimatedTime, 0),
  },
  cashier: {
    role: 'cashier',
    displayName: 'Cashier',
    description: 'Process sales and manage customer transactions',
    permissions: rolePermissions.cashier,
    tutorials: cashierTutorials,
    estimatedCompletionTime: cashierTutorials.reduce((sum, t) => sum + t.estimatedTime, 0),
  },
  store_manager: {
    role: 'store_manager',
    displayName: 'Store Manager',
    description: 'Manage inventory, view reports, and oversee operations',
    permissions: rolePermissions.store_manager,
    tutorials: storeManagerTutorials,
    estimatedCompletionTime: storeManagerTutorials.reduce((sum, t) => sum + t.estimatedTime, 0),
  },
};

export function getRoleTrainingFlow(role: UserRole): RoleTrainingFlow {
  return roleTrainingFlows[role];
}

export function getRolePermissions(role: UserRole): RolePermissions {
  return rolePermissions[role];
}

export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  return rolePermissions[role][permission];
}
