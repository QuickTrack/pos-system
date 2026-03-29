'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  UserCog,
  Truck, 
  FileText, 
  Settings, 
  BarChart3,
  Store,
  Layout,
  X,
  LogOut,
  ShoppingBag,
  ArrowRightLeft,
  DollarSign,
  CreditCard,
  Shield,
  FilePlus,
  Receipt,
  Key
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { hasPermission, isSuperAdmin, Role } from '@/lib/auth';

const menuItems = [
  { 
    label: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard,
    permission: 'view_dashboard',
  },
  {
    label: 'POS Sales',
    href: '/pos',
    icon: ShoppingCart,
    permission: 'manage_sales',
  },
  {
    label: 'Cash Sales',
    href: '/cash-sales',
    icon: Receipt,
    permission: 'manage_sales',
  },
  { 
    label: 'Inventory', 
    href: '/inventory', 
    icon: Package,
    permission: 'manage_products',
  },
  {
    label: 'Stock Transfers',
    href: '/stock-transfers',
    icon: ArrowRightLeft,
    permission: 'manage_products',
  },
  { 
    label: 'Customers', 
    href: '/customers', 
    icon: Users,
    permission: 'view_customers',
  },
  { 
    label: 'Suppliers', 
    href: '/suppliers', 
    icon: Truck,
    permission: 'manage_suppliers',
  },
  { 
    label: 'Purchases', 
    href: '/purchases', 
    icon: ShoppingBag,
    permission: 'manage_purchases',
  },
  { 
    label: 'Supplier Payments', 
    href: '/supplier-payments', 
    icon: DollarSign,
    permission: 'manage_purchases',
  },
  { 
    label: 'Customer Payments', 
    href: '/customer-payments', 
    icon: CreditCard,
    permission: 'manage_sales',
  },
  { 
    label: 'Sales Returns', 
    href: '/sales-returns', 
    icon: FileText,
    permission: 'manage_sales',
  },
  { 
    label: 'Customer Invoices', 
    href: '/create-invoice', 
    icon: FilePlus,
    permission: 'manage_sales',
  },
  { 
    label: 'Supplier Invoices', 
    href: '/supplier-invoices', 
    icon: FileText,
    permission: 'manage_purchases',
  },
  { 
    label: 'Reports', 
    href: '/reports', 
    icon: FileText,
    permission: 'view_reports',
  },
  { 
    label: 'Analytics', 
    href: '/analytics', 
    icon: BarChart3,
    permission: 'view_reports',
  },
  { 
    label: 'Branches', 
    href: '/branches', 
    icon: Store,
    permission: 'manage_branches',
  },
  { 
    label: 'Users', 
    href: '/users', 
    icon: UserCog,
    permission: 'manage_users',
  },
  { 
    label: 'Licenses', 
    href: '/licenses', 
    icon: Key,
    permission: 'super_admin',
  },
  { 
    label: 'Settings', 
    href: '/settings', 
    icon: Settings,
    permission: 'manage_settings',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, logout } = useAuth();

  // Get user role
  const userRole = user?.role as Role;
  const isAdmin = isSuperAdmin(userRole);

  // Filter menu items based on user role and permissions
  // Super admin sees all menu items
  const filteredMenuItems = menuItems.filter((item) => {
    if (!userRole) return false;
    // Super admin sees everything
    if (isSuperAdmin(userRole)) {
      return true;
    }
    return hasPermission(userRole, item.permission);
  });

  const handleLogout = async () => {
    await logout();
  };

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image 
              src="/Gemini_Generated_Image_iikvdoiikvdoiikv.png" 
              alt="QuickTrack InfoSystems ERP" 
              width={32} 
              height={32} 
              className="w-8 h-8 rounded-lg"
            />
            <span className="font-bold text-lg text-gray-900 hidden lg:block">QuickTrack ERP</span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          <ul className="space-y-0.5">
            {filteredMenuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "sidebar-link",
                      isActive && "active"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-emerald-600 font-medium">{user ? getInitials(user.name) : 'AD'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
              <div className="flex items-center gap-1">
                {isAdmin && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600">
                    <Shield className="w-3 h-3" />
                    Super Admin
                  </span>
                )}
                {!isAdmin && (
                  <p className="text-xs text-gray-500 capitalize">{user?.role || 'Role'}</p>
                )}
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
