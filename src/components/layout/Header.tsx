'use client';

import { Menu, Bell, Search, Moon, Sun, Home, Calendar, AlertTriangle, Shield, RefreshCw } from 'lucide-react';
import { useUIStore } from '@/lib/store';
import { useLicense } from '@/lib/license-context';
import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { ModeToggle } from '@/components/ui/ModeToggle';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

// Helper to safely load license from localStorage
function loadLicenseFromStorage(): any | null {
  try {
    const stored = localStorage.getItem('pos-license');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Validate basic structure
    if (parsed && typeof parsed === 'object' && parsed.licenseKey) {
      return parsed;
    }
    return null;
  } catch {
    // Corrupted data - clear it
    try { localStorage.removeItem('pos-license'); } catch {}
    return null;
  }
}

// Helper to check if license context is available
function useLicenseSafe() {
  try {
    return useLicense();
  } catch {
    // Not inside LicenseProvider
    return null;
  }
}

export function Header({ title, subtitle }: HeaderProps) {
  const { sidebarOpen, setSidebarOpen, darkMode, toggleDarkMode } = useUIStore();
  
  // License context - safely check if available
  const licenseContext = useLicenseSafe();
  
  // Initialize localLicense from localStorage immediately (lazy initialization)
  // This prevents stale null render on initial mount
  const [localLicense, setLocalLicense] = useState<any>(() => loadLicenseFromStorage());
  
  // Track if we've synced from context at least once
  const hasSyncedFromContext = useRef(false);

  const [currentTime, setCurrentTime] = useState('');
  const [financialYear, setFinancialYear] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<{ name: string; logo: string }>({ name: '', logo: '' });

  // Sync context license to local state whenever it changes
  // This is the primary source of truth when context is available
  useEffect(() => {
    if (licenseContext) {
      hasSyncedFromContext.current = true;
      setLocalLicense(licenseContext.license);
    }
  }, [licenseContext, licenseContext?.license]);

  // Listen for localStorage changes (cross-tab sync) only when context is NOT available
  useEffect(() => {
    if (licenseContext) return; // Context handles sync when available

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pos-license') {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed && typeof parsed === 'object' && parsed.licenseKey) {
              setLocalLicense(parsed);
            }
          } catch {
            // Corrupted data - ignore
          }
        } else {
          setLocalLicense(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [licenseContext]);

  // Determine effective license: context takes priority when available
  const effectiveLicense = licenseContext?.license ?? localLicense;
  
  // Memoize daysRemaining to avoid recalculation
  const licenseDaysRemaining = useMemo(() => {
    return effectiveLicense?.daysRemaining ?? null;
  }, [effectiveLicense?.daysRemaining]);

  // Use lastChecked from context if available, otherwise null (don't create new Date on every render)
  const lastChecked = licenseContext?.lastChecked ?? null;

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-KE', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load financial year from settings
  useEffect(() => {
    const loadFinancialYear = async () => {
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        if (data.settings?.currentFinancialYear) {
          setFinancialYear(data.settings.currentFinancialYear);
        }
        if (data.settings?.businessName) {
          setBusinessInfo({
            name: data.settings.businessName,
            logo: data.settings.logo || ''
          });
        }
      } catch (error) {
        console.error('Failed to load financial year:', error);
      }
    };
    loadFinancialYear();
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard" 
            className="p-2 rounded-lg hover:bg-gray-100 text-emerald-600"
            title="Return to Dashboard"
          >
            <Home className="w-5 h-5" />
          </Link>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Center - Business Name/Logo Display */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          {businessInfo.name ? (
            <div className="flex items-center gap-3 w-full">
              {businessInfo.logo ? (
                <img 
                  src={businessInfo.logo} 
                  alt={businessInfo.name}
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <span className="text-emerald-600 font-bold text-lg">
                    {businessInfo.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-lg font-semibold text-gray-900 truncate">
                {businessInfo.name}
              </span>
            </div>
          ) : (
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Search products, customers, sales..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Real-time License Status - Clickable to upgrade/renew */}
          {effectiveLicense && (
            <div className="relative">
              <Link 
                href="/license/activate"
                className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                  licenseDaysRemaining !== null && licenseDaysRemaining < 0 
                    ? 'bg-red-50 text-red-700' 
                    : licenseDaysRemaining !== null && licenseDaysRemaining <= 14 
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-green-50 text-green-700'
                }`}
                title={`License: ${effectiveLicense?.licenseType || 'Unknown'} - Click to upgrade or renew`}
              >
                {licenseDaysRemaining !== null && licenseDaysRemaining < 0 ? (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    <span>License Expired - Click to Renew</span>
                  </>
                ) : licenseDaysRemaining !== null && licenseDaysRemaining <= 14 ? (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    <span>{licenseDaysRemaining}d left - Click to Upgrade</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3 h-3" />
                    <span>{licenseDaysRemaining !== null ? `${licenseDaysRemaining}d left` : 'Active'}</span>
                  </>
                )}
              </Link>
              {/* Sync indicator - only show when context is available */}
              {licenseContext?.checkLicense && (
                <button
                  onClick={() => licenseContext.checkLicense()}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"
                  title="Click to sync now"
                >
                  <RefreshCw className="w-2 h-2 text-white" />
                </button>
              )}
            </div>
          )}
          {/* License sync settings - dev only */}
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ⚙️
            </button>
          )}
          {financialYear && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-md text-emerald-700 text-xs font-medium">
              <Calendar className="w-3 h-3" />
              <span>FY: {financialYear}</span>
            </div>
          )}
          <span className="hidden sm:block text-sm text-gray-500 mr-2">
            {currentTime}
          </span>
          
          <button 
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-gray-600" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>
          
          <button className="p-2 rounded-lg hover:bg-gray-100 relative">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
