'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  ShoppingBag,
  ArrowRightLeft,
  DollarSign,
  CreditCard,
  FilePlus,
  Receipt,
  Key,
  X,
  ChevronLeft,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Menu items matching the main sidebar
const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'POS Sales', href: '/pos', icon: ShoppingCart },
  { label: 'Cash Sales', href: '/cash-sales', icon: Receipt },
  { label: 'Customer Invoices', href: '/create-invoice', icon: FilePlus },
  { label: 'Customer Payments', href: '/customer-payments', icon: CreditCard },
  { label: 'Sales Returns', href: '/sales-returns', icon: FileText },
  { label: 'Purchases', href: '/purchases', icon: ShoppingBag },
  { label: 'Supplier Invoices', href: '/supplier-invoices', icon: FileText },
  { label: 'Supplier Payments', href: '/supplier-payments', icon: DollarSign },
  { label: 'Inventory', href: '/inventory', icon: Package },
  { label: 'Stock Transfers', href: '/stock-transfers', icon: ArrowRightLeft },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Suppliers', href: '/suppliers', icon: Truck },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Branches', href: '/branches', icon: Store },
  { label: 'Users', href: '/users', icon: UserCog },
  { label: 'Licenses', href: '/licenses', icon: Key },
  { label: 'Settings', href: '/settings', icon: Settings },
];

// Trigger zone with visible handle button
function HoverTrigger({ 
  onHover, 
  onLeave,
  isOpen
}: { 
  onHover: () => void; 
  onLeave: () => void;
  isOpen: boolean;
}) {
  return (
    <div
      className="fixed top-0 left-0 h-full"
      style={{ zIndex: 99999, width: isOpen ? '0px' : '20px' }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      aria-hidden="true"
    >
      {/* Visible handle/tab on the left edge */}
      <div className={cn(
        "absolute left-0 top-1/2 -translate-y-1/2 w-8 h-16 bg-emerald-500 rounded-r-lg",
        "flex items-center justify-center cursor-pointer transition-all duration-200",
        "hover:bg-emerald-600 shadow-lg",
        isOpen ? "opacity-0 pointer-events-none" : "opacity-90 hover:opacity-100"
      )}>
        <Menu className="w-4 h-4 text-white -rotate-90" />
      </div>
    </div>
  );
}

export function FloatingSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const [isHoveringTrigger, setIsHoveringTrigger] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use a ref to track the latest state values without re-creating callbacks
  const stateRef = useRef({ isHoveringSidebar: false, isHoveringTrigger: false });

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleTriggerHover = useCallback(() => {
    clearHideTimeout();
    setIsHoveringTrigger(true);
    stateRef.current.isHoveringTrigger = true;
    setIsOpen(true);
  }, [clearHideTimeout]);

  const handleTriggerLeave = useCallback(() => {
    setIsHoveringTrigger(false);
    stateRef.current.isHoveringTrigger = false;
    if (!stateRef.current.isHoveringSidebar) {
      hideTimeoutRef.current = setTimeout(() => {
        if (!stateRef.current.isHoveringSidebar && !stateRef.current.isHoveringTrigger) {
          setIsOpen(false);
        }
      }, 400);
    }
  }, []);

  const handleSidebarEnter = useCallback(() => {
    clearHideTimeout();
    setIsHoveringSidebar(true);
    stateRef.current.isHoveringSidebar = true;
  }, [clearHideTimeout]);

  const handleSidebarLeave = useCallback(() => {
    setIsHoveringSidebar(false);
    stateRef.current.isHoveringSidebar = false;
    hideTimeoutRef.current = setTimeout(() => {
      if (!stateRef.current.isHoveringSidebar && !stateRef.current.isHoveringTrigger) {
        setIsOpen(false);
      }
    }, 400);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <HoverTrigger 
        onHover={handleTriggerHover} 
        onLeave={handleTriggerLeave}
        isOpen={isOpen}
      />
      
      <aside
        ref={sidebarRef}
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 shadow-2xl",
          "transform transition-transform duration-300 ease-out",
          "flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ zIndex: 99998 }}
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
        role="navigation"
        aria-label="Quick navigation sidebar"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 bg-emerald-50">
          <span className="font-semibold text-gray-900 text-sm">Quick Navigation</span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
            aria-label="Close navigation sidebar"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-2">
          <ul className="space-y-0.5 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm rounded-lg",
                      "transition-colors duration-150",
                      isActive 
                        ? "bg-emerald-100 text-emerald-700 font-medium" 
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                    onClick={() => setIsOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 text-center">
            Hover left edge to open
          </p>
        </div>
      </aside>
    </>
  );
}
