'use client';

import { Menu, Bell, Search, Moon, Sun, Home, Calendar, AlertTriangle, Shield, RefreshCw, ShoppingCart, Package, Users, Truck, Settings, X, Check } from 'lucide-react';
import { useUIStore, useNotificationStore } from '@/lib/store';
import { useLicense } from '@/lib/license-context';
import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { ModeToggle } from '@/components/ui/ModeToggle';

function getCategoryIcon(category?: string) {
  switch (category) {
    case 'sale': return <ShoppingCart className="w-4 h-4" />;
    case 'inventory': return <Package className="w-4 h-4" />;
    case 'customer': return <Users className="w-4 h-4" />;
    case 'supplier': return <Truck className="w-4 h-4" />;
    case 'license': return <Shield className="w-4 h-4" />;
    case 'system': return <Settings className="w-4 h-4" />;
    default: return <Bell className="w-4 h-4" />;
  }
}

function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function NotificationButton() {
  const { notifications, markAsRead, removeNotification, clearAll } = useNotificationStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);
  
  return (
    <div className="relative">
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="p-2 rounded-lg hover:bg-gray-100 relative"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>
      
      {showDropdown && (
        <div ref={dropdownRef} className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {notifications.length > 0 && (
              <button 
                onClick={() => clearAll()}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Clear all
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No notifications
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' :
                    notification.type === 'error' ? 'bg-red-50 dark:bg-red-900/20' :
                    notification.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' :
                    notification.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                    'bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-full ${
                      notification.type === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' :
                      notification.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400' :
                      notification.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400' :
                      'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                    }`}>
                      {getCategoryIcon(notification.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white">{notification.message}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface HeaderProps {
  title: string;
  subtitle?: string;
}

function loadLicenseFromStorage(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('pos-license');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === 'object' && parsed.licenseKey) {
      return parsed;
    }
    return null;
  } catch {
    try { localStorage.removeItem('pos-license'); } catch {}
    return null;
  }
}

function useLicenseSafe() {
  try {
    return useLicense();
  } catch {
    return null;
  }
}

export function Header({ title, subtitle }: HeaderProps) {
  const { sidebarOpen, setSidebarOpen, darkMode, toggleDarkMode } = useUIStore();
  const licenseContext = useLicenseSafe();
  const [localLicense, setLocalLicense] = useState<any | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('pos-license');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && parsed.licenseKey) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [currentTime, setCurrentTime] = useState('');
  const [financialYear, setFinancialYear] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<{ name: string; logo: string }>({ name: '', logo: '' });

  useEffect(() => {
    if (!licenseContext) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'LICENSE_SYNC' && event.data.license) {
        setLocalLicense(event.data.license);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [licenseContext]);

  const effectiveLicense = licenseContext?.license ?? localLicense;
  const licenseDaysRemaining = useMemo(() => {
    return effectiveLicense?.daysRemaining ?? null;
  }, [effectiveLicense?.daysRemaining]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadFinancialYear = async () => {
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        if (data.settings?.currentFinancialYear) {
          setFinancialYear(data.settings.currentFinancialYear);
        }
        if (data.settings?.businessName) {
          setBusinessInfo({ name: data.settings.businessName, logo: data.settings.logo || '' });
        }
      } catch (error) {
        console.error('Failed to load financial year:', error);
      }
    };
    loadFinancialYear();
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100 text-emerald-600" title="Return to Dashboard">
            <Home className="w-5 h-5" />
          </Link>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
        <div className="hidden lg:flex flex-1 min-w-0 mx-8">
          {businessInfo.name ? (
            <div className="flex items-center gap-3 w-full min-w-0">
              {businessInfo.logo ? (
                <img src={businessInfo.logo} alt={businessInfo.name} className="h-10 w-auto object-contain flex-shrink-0" />
              ) : (
                <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-600 font-bold text-lg">{businessInfo.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <span className="text-lg font-semibold text-gray-900 truncate">{businessInfo.name}</span>
            </div>
          ) : (
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search products, customers, sales..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {effectiveLicense && (
            <div className="relative">
              <Link href="/license/activate" className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${licenseDaysRemaining !== null && licenseDaysRemaining < 0 ? 'bg-red-50 text-red-700' : licenseDaysRemaining !== null && licenseDaysRemaining <= 14 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`} title={`License: ${effectiveLicense?.licenseType || 'Unknown'}`}>
                {licenseDaysRemaining !== null && licenseDaysRemaining < 0 ? (
                  <><AlertTriangle className="w-3 h-3" /><span>License Expired</span></>
                ) : licenseDaysRemaining !== null && licenseDaysRemaining <= 14 ? (
                  <><RefreshCw className="w-3 h-3" /><span>{licenseDaysRemaining}d left</span></>
                ) : (
                  <><Shield className="w-3 h-3" /><span>{licenseDaysRemaining !== null ? licenseDaysRemaining + 'd left' : 'Active'}</span></>
                )}
              </Link>
              {licenseContext?.checkLicense && (
                <button onClick={() => licenseContext.checkLicense()} className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center" title="Sync now">
                  <RefreshCw className="w-2 h-2 text-white" />
                </button>
              )}
            </div>
          )}
          {process.env.NODE_ENV === 'development' && (
            <button onClick={() => setShowSettings(!showSettings)} className="text-xs text-gray-400 hover:text-gray-600">⚙️</button>
          )}
          {financialYear && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-md text-emerald-700 text-xs font-medium">
              <Calendar className="w-3 h-3" /><span>FY: {financialYear}</span>
            </div>
          )}
          <span className="hidden sm:block text-sm text-gray-500 mr-2">{currentTime}</span>
          <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-gray-100" title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            {darkMode ? <Sun className="w-5 h-5 text-gray-600" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>
          <NotificationButton />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}