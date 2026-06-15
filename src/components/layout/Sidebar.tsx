'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
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
  ShoppingBag,
  ArrowRightLeft,
  DollarSign,
  CreditCard,
  Shield,
  FilePlus,
  Receipt,
  Key,
  FileSearch,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
  Star,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { hasPermission, isSuperAdmin, Role } from '@/lib/auth';

interface MenuItem {
  label: string;
  href: string;
  icon: any;
  permission: string;
}

interface MenuGroup {
  label: string;
  icon: any;
  permission?: string;
  items: MenuItem[];
}

interface FavoriteItem {
  href: string;
  label: string;
  iconName?: string;
}

const iconMap: Record<string, any> = {
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
  ShoppingBag,
  ArrowRightLeft,
  DollarSign,
  CreditCard,
  Shield,
  FilePlus,
  Receipt,
  Key,
  FileSearch,
};

const menuGroups: MenuGroup[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    permission: 'view_dashboard',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
    ],
  },
  {
    label: 'Sales',
    icon: ShoppingCart,
    permission: 'manage_sales',
    items: [
      { label: 'POS Sales', href: '/pos', icon: ShoppingCart, permission: 'manage_sales' },
      { label: 'Cash Sales', href: '/cash-sales', icon: Receipt, permission: 'manage_sales' },
      { label: 'Quotations', href: '/quotations', icon: FileSearch, permission: 'manage_sales' },
      { label: 'Customer Invoices', href: '/create-invoice', icon: FilePlus, permission: 'manage_sales' },
      { label: 'Customer Payments', href: '/customer-payments', icon: CreditCard, permission: 'manage_sales' },
      { label: 'Sales Returns', href: '/sales-returns', icon: FileText, permission: 'manage_sales' },
    ],
  },
  {
    label: 'Purchases',
    icon: ShoppingBag,
    permission: 'manage_purchases',
    items: [
      { label: 'Purchases', href: '/purchases', icon: ShoppingBag, permission: 'manage_purchases' },
      { label: 'Receive Inventory', href: '/supplier-invoices', icon: FileText, permission: 'manage_purchases' },
      { label: 'Supplier Payments', href: '/supplier-payments', icon: DollarSign, permission: 'manage_purchases' },
    ],
  },
  {
    label: 'Inventory',
    icon: Package,
    permission: 'manage_products',
    items: [
      { label: 'Inventory', href: '/inventory', icon: Package, permission: 'manage_products' },
      { label: 'Stock Transfers', href: '/stock-transfers', icon: ArrowRightLeft, permission: 'manage_products' },
    ],
  },
  {
    label: 'Parties',
    icon: Users,
    permission: 'view_customers',
    items: [
      { label: 'Customers', href: '/customers', icon: Users, permission: 'view_customers' },
      { label: 'Suppliers', href: '/suppliers', icon: Truck, permission: 'manage_suppliers' },
    ],
  },
  {
    label: 'Reports & Analytics',
    icon: BarChart3,
    permission: 'view_reports',
    items: [
      { label: 'Reports', href: '/reports', icon: FileText, permission: 'view_reports' },
      { label: 'Analytics', href: '/analytics', icon: BarChart3, permission: 'view_reports' },
    ],
  },
  {
    label: 'Administration',
    icon: Settings,
    permission: 'manage_settings',
    items: [
      { label: 'Branches', href: '/branches', icon: Store, permission: 'manage_branches' },
      { label: 'Users', href: '/users', icon: UserCog, permission: 'manage_users' },
      { label: 'Licenses', href: '/licenses', icon: Key, permission: 'super_admin' },
      { label: 'Settings', href: '/settings', icon: Settings, permission: 'manage_settings' },
    ],
  },
];

function MenuGroupItem({ group, pathname, onClose, toggleFavorite, isFavorite }: { group: MenuGroup; pathname: string; onClose: () => void; toggleFavorite: (item: any) => void; isFavorite: (href: string) => boolean }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasActiveItem = group.items.some((item) => 
    pathname === item.href || pathname.startsWith(item.href + '/')
  );

  const shouldExpand = isOpen || hasActiveItem;

  if (group.items.length === 1) {
    const item = group.items[0];
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <li>
        <Link
          href={item.href}
          className={cn(
            "sidebar-link flex items-center justify-between",
            isActive && "active"
          )}
          onClick={onClose}
        >
          <span className="flex items-center gap-2">
            <item.icon className="w-4 h-4" />
            <span className="text-sm">{item.label}</span>
          </span>
          <button
            type="button"
            className="p-1 rounded hover:bg-gray-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite({
                href: item.href,
                label: item.label,
                iconName: item.icon?.name || item.icon?.displayName || '',
              });
            }}
            title="Toggle favorite"
          >
            <Star className={`w-3 h-3 ${isFavorite(item.href) ? 'fill-amber-400 text-amber-500' : 'text-gray-400'}`} />
          </button>
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
          hasActiveItem 
            ? "bg-emerald-50 text-emerald-700" 
            : "text-gray-700 hover:bg-gray-100"
        )}
      >
        <div className="flex items-center gap-2">
          <group.icon className="w-4 h-4" />
          <span>{group.label}</span>
        </div>
        {shouldExpand ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>
      {shouldExpand && (
        <ul className="ml-4 mt-1 space-y-0.5">
          {group.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "sidebar-link pl-6 flex items-center justify-between",
                    isActive && "active"
                  )}
                  onClick={onClose}
                >
                  <span className="flex items-center gap-2">
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.label}</span>
                  </span>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-gray-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite({
                        href: item.href,
                        label: item.label,
                        iconName: item.icon?.name || item.icon?.displayName || '',
                      });
                    }}
                    title="Toggle favorite"
                  >
                    <Star className={`w-3 h-3 ${isFavorite(item.href) ? 'fill-amber-400 text-amber-500' : 'text-gray-400'}`} />
                  </button>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, favoriteLinks, toggleFavorite, isFavorite } = useUIStore();
  const { user, logout } = useAuth();
  const [isHovering, setIsHovering] = useState(false);
  const [isHoveringTrigger, setIsHoveringTrigger] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleTriggerEnter = useCallback(() => {
    clearHideTimeout();
    setIsHoveringTrigger(true);
    setIsHovering(true);
  }, [clearHideTimeout]);

  const handleTriggerLeave = useCallback(() => {
    setIsHoveringTrigger(false);
    hideTimeoutRef.current = setTimeout(() => {
      if (!isHoveringTrigger) {
        setIsHovering(false);
      }
    }, 300);
  }, [isHoveringTrigger]);

  const handleSidebarEnter = useCallback(() => {
    clearHideTimeout();
    setIsHovering(true);
  }, [clearHideTimeout]);

  const handleSidebarLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsHovering(false);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const userRole = user?.role as Role;
  const isAdmin = isSuperAdmin(userRole);

  const filteredMenuGroups = menuGroups.map((group) => {
    if (!userRole) return { ...group, items: [] };
    if (isSuperAdmin(userRole)) {
      return group;
    }
    const filteredItems = group.items.filter((item) => 
      hasPermission(userRole, item.permission)
    );
    return { ...group, items: filteredItems };
  }).filter((group) => group.items.length > 0);

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isDesktopOpen = isHovering;
  const isMobileOpen = sidebarOpen;

  const getBaseHref = (href: string) => href.split('?')[0].split('#')[0];

  const resolveIcon = (iconName: string) => iconMap[iconName] || Star;

  const isInvalidFavorite = (fav: any) => !fav || !fav.href || !fav.label;
  const safeFavorites = (favoriteLinks || [])
    .filter((fav: any) => !isInvalidFavorite(fav));

  const handleToggleFavorite = (fav: any) => {
    toggleFavorite(fav);
  };

  return (
    <>
      <div
        className="fixed top-0 left-0 h-full z-40"
        style={{ width: isDesktopOpen ? '0px' : '20px' }}
        onMouseEnter={handleTriggerEnter}
        onMouseLeave={handleTriggerLeave}
      >
        <div className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-8 h-16 bg-emerald-500 rounded-r-lg",
          "flex items-center justify-center cursor-pointer transition-all duration-200",
          "hover:bg-emerald-600 shadow-lg",
          isDesktopOpen ? "opacity-0 pointer-events-none" : "opacity-90 hover:opacity-100"
        )}>
          <Menu className="w-4 h-4 text-white -rotate-90" />
        </div>
      </div>

      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-out",
        isDesktopOpen ? "lg:translate-x-0" : "lg:-translate-x-full",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}
      onMouseEnter={handleSidebarEnter}
      onMouseLeave={handleSidebarLeave}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image 
              src="/Gemini_Generated_Image_iikvdoiikvdoiikv.png" 
              alt="QuickTrack InfoSystems ERP" 
              width={32} 
              height={32} 
              className="w-8 h-8 rounded-lg"
            />
            <span className="font-bold text-lg text-gray-900">QuickTrack ERP</span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          <ul className="space-y-1">
            <li className="mb-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Favorite Links
              </div>
              {safeFavorites.length === 0 ? (
                <p className="px-3 text-xs text-gray-400">Click the star icon next to any menu item to pin it here.</p>
              ) : (
                <ul className="space-y-0.5">
                  {safeFavorites.map((fav: any) => {
                    const isActive = getBaseHref(pathname) === getBaseHref(fav.href);
                    const IconComp = resolveIcon(fav.iconName || '');
                    return (
                      <li key={`${fav.href}-${fav.label}`}>
                        <Link
                          href={fav.href}
                          className={cn(
                            "sidebar-link flex items-center justify-between",
                            isActive && "active"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <IconComp className="w-4 h-4" />
                            <span className="text-sm">{fav.label}</span>
                          </span>
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-gray-100"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleFavorite({
                                href: fav.href,
                                label: fav.label,
                                iconName: fav.iconName,
                              });
                            }}
                            title="Remove from favorites"
                          >
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          </button>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>

            {filteredMenuGroups.map((group) => (
              <MenuGroupItem 
                key={group.label} 
                group={group} 
                pathname={pathname}
                onClose={() => setSidebarOpen(false)}
                toggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
              />
            ))}
          </ul>
        </nav>

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
