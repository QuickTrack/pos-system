'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  DollarSign,
  ClipboardList,
  FileText,
  Users,
  MonitorSmartphone,
  AlertTriangle,
} from 'lucide-react';

const tabs = [
  { label: 'Dashboard', href: '/reconciliation', icon: LayoutDashboard, exact: true },
  { label: 'Shifts', href: '/reconciliation/shifts', icon: Calendar },
  { label: 'Cash Drops', href: '/reconciliation/cash-drops', icon: DollarSign },
  { label: 'Variances', href: '/reconciliation/variance', icon: AlertTriangle },
  { label: 'Registers', href: '/reconciliation/registers', icon: MonitorSmartphone },
  { label: 'Z-Reads', href: '/reconciliation/z-reads', icon: FileText },
  { label: 'Cashier Performance', href: '/reconciliation/cashier-performance', icon: Users },
];

const iconMap: Record<string, any> = {
  LayoutDashboard,
  Calendar,
  DollarSign,
  ClipboardList,
  FileText,
  Users,
  MonitorSmartphone,
  AlertTriangle,
};

export default function ReconciliationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Reconciliation</h2>
          <p className="text-xs text-gray-500">End-of-Day Management</p>
        </div>
        <nav className="p-3 space-y-1">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive(tab.href, tab.exact)
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-gray-200 mt-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
