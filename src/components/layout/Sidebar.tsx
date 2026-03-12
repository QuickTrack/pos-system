'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Truck, 
  FileText, 
  Settings, 
  BarChart3,
  Store,
  X,
  LogOut,
  ShoppingBag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/store';

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
    label: 'Inventory', 
    href: '/inventory', 
    icon: Package,
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
    label: 'Settings', 
    href: '/settings', 
    icon: Settings,
    permission: 'manage_settings',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

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
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">NairobiPOS</span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {menuItems.map((item) => {
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
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
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
              <span className="text-emerald-600 font-medium">AD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
              <p className="text-xs text-gray-500 truncate">admin@shop.com</p>
            </div>
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
