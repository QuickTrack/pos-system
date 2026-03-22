'use client';

import { Menu, Bell, Search, Moon, Sun, Home, Calendar, AlertTriangle, Shield, RefreshCw } from 'lucide-react';
import { useUIStore } from '@/lib/store';
import { useLicense } from '@/lib/license-context';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { sidebarOpen, setSidebarOpen, darkMode, toggleDarkMode } = useUIStore();
  
  // License context - may not be available in all layouts
  let licenseContext: any = null;
  let license: any = null;
  let checkLicense: any = null;
  
  try {
    licenseContext = useLicense();
    license = licenseContext.license;
    checkLicense = licenseContext.checkLicense;
  } catch (e) {
    // License context not available - will use localStorage fallback
  }
  
  const [currentTime, setCurrentTime] = useState('');
  const [financialYear, setFinancialYear] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Update lastChecked when license is checked
  useEffect(() => {
    if (license) {
      setLastChecked(new Date());
    }
  }, [license]);

  // Fallback to localStorage if license context not available
  useEffect(() => {
    if (!license) {
      try {
        const storedLicense = localStorage.getItem('pos-license');
        if (storedLicense) {
          license = JSON.parse(storedLicense);
        }
      } catch (e) {
        // ignore
      }
    }
  }, [license]);

  const licenseDaysRemaining = license?.daysRemaining ?? null;

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
      } catch (error) {
        console.error('Failed to load financial year:', error);
      }
    };
    loadFinancialYear();
  }, []);

  // Load license info
  // License is now managed by LicenseProvider - no local storage needed
  // Real-time updates happen automatically through polling

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

        {/* Center - Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search products, customers, sales..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Real-time License Status - Clickable to upgrade/renew */}
          {license && (
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
                title={`License: ${license?.plan || 'Unknown'} - Click to upgrade or renew`}
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
              {/* Sync indicator */}
              {checkLicense && (
                <button
                  onClick={() => checkLicense()}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"
                  title="Click to sync now"
                >
                  <RefreshCw className="w-2 h-2 text-white" />
                </button>
              )}
            </div>
          )}
          {/* License sync settings */}
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
        </div>
      </div>
    </header>
  );
}
