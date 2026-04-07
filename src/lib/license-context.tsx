'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface LicenseInfo {
  licenseKey: string;
  businessName: string;
  email: string;
  licenseType: string;
  status: string;
  expirationDate: string;
  daysRemaining: number | null;
  maxUsers: number;
  maxBranches: number;
  features: string[];
}

interface LicenseWarning {
  type: string;
  message: string;
  daysRemaining?: number;
}

interface LicenseContextType {
  license: LicenseInfo | null;
  loading: boolean;
  error: string | null;
  isValid: boolean;
  isSuperAdmin: boolean;
  bypassed: boolean;
  warnings: LicenseWarning[];
  lastChecked: Date | null;
  checkLicense: () => Promise<void>;
  clearLicense: () => void;
  setLicense: (license: LicenseInfo) => void;
  syncInterval: number;
  setSyncInterval: (interval: number) => void;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

// Default sync interval: once per day (24 hours)
const DEFAULT_SYNC_INTERVAL = 24 * 60 * 60 * 1000;

// Cache duration: same as sync interval (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [license, setLicenseState] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [bypassed, setBypassed] = useState(false);
  const [warnings, setWarnings] = useState<LicenseWarning[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [syncInterval, setSyncInterval] = useState(DEFAULT_SYNC_INTERVAL);
  const [cachedResponse, setCachedResponse] = useState<{
    data: any;
    timestamp: number;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const router = useRouter();

  const checkLicense = useCallback(async (forceRefresh = false) => {
    try {
      // Prevent concurrent checks - only one check at a time
      if (isChecking) {
        return;
      }
      
      // Check cache first (unless force refresh is requested)
      const now = Date.now();
      if (!forceRefresh && cachedResponse && (now - cachedResponse.timestamp) < CACHE_DURATION) {
        const data = cachedResponse.data;
        if (data.licensed !== undefined) {
          setIsValid(data.valid);
          setIsSuperAdmin(data.isSuperAdmin || false);
          setBypassed(data.bypassed || false);
          if (data.license) {
            setLicenseState(data.license);
          }
          setWarnings(data.warnings || []);
          setLastChecked(new Date(cachedResponse.timestamp));
          return;
        }
      }
      
      // Mark as checking to prevent concurrent calls
      setIsChecking(true);

      const storedLicense = localStorage.getItem('pos-license');
      let licenseKey = '';
      
      if (storedLicense) {
        const licenseData = JSON.parse(storedLicense);
        licenseKey = licenseData.licenseKey;
      }

      // Get user role from auth context
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      
      let isSuperAdminUser = false;
      if (response.ok) {
        const userData = await response.json();
        isSuperAdminUser = userData.user?.role === 'super_admin';
      }

      // Validate license with hardware binding
      const validateUrl = licenseKey 
        ? `/api/licenses/validate-hardware?licenseKey=${encodeURIComponent(licenseKey)}`
        : '/api/licenses/validate-hardware';
      
      const validateResponse = await fetch(validateUrl, {
        credentials: 'include',
      });
      
      const data = await validateResponse.json();
      
      // Cache the response
      setCachedResponse({
        data,
        timestamp: Date.now(),
      });

      setIsValid(data.valid);
      setIsSuperAdmin(data.isSuperAdmin || isSuperAdminUser);
      setBypassed(data.bypassed || false);
      
      if (data.license) {
        setLicenseState(data.license);
        // Update localStorage with latest license data
        localStorage.setItem('pos-license', JSON.stringify(data.license));
      }
      
      setWarnings(data.warnings || []);
      setError(data.message || null);
      setLastChecked(new Date());

      // If license is invalid and not super admin, redirect to activation
      if (!data.valid && !data.bypassed && !data.isSuperAdmin) {
        const currentPath = window.location.pathname;
        if (currentPath !== '/license/activate' && currentPath !== '/login') {
          router.push('/license/activate');
        }
      }
    } catch (err) {
      console.error('License check failed:', err);
      setError('Failed to validate license');
    } finally {
      setLoading(false);
      setIsChecking(false);
    }
  }, [cachedResponse, router]);

  const clearLicense = useCallback(() => {
    setLicenseState(null);
    setIsValid(false);
    setIsSuperAdmin(false);
    setBypassed(false);
    setWarnings([]);
    setCachedResponse(null);
    localStorage.removeItem('pos-license');
    localStorage.removeItem('license-warning');
  }, []);

  const setLicense = useCallback((newLicense: LicenseInfo) => {
    setLicenseState(newLicense);
    localStorage.setItem('pos-license', JSON.stringify(newLicense));
    // Clear cache to force refresh on next check
    setCachedResponse(null);
  }, []);

  // Initial license check on mount
  useEffect(() => {
    checkLicense();
  }, []);

  // Check for license changes via localStorage (cross-tab communication)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pos-license' && e.newValue) {
        // License was changed in another tab/window
        // Force refresh to get latest
        checkLicense(true);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [checkLicense]);

  // Also check license when window gains focus (user returns to tab)
  // Only check if enough time has passed since last check (24 hours)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Only refresh if 24+ hours since last check
        const lastCheck = lastChecked?.getTime() || 0;
        const hoursSinceLastCheck = (Date.now() - lastCheck) / (1000 * 60 * 60);
        if (hoursSinceLastCheck >= 24) {
          checkLicense(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkLicense, lastChecked]);

  return (
    <LicenseContext.Provider value={{
      license,
      loading,
      error,
      isValid,
      isSuperAdmin,
      bypassed,
      warnings,
      lastChecked,
      checkLicense,
      clearLicense,
      setLicense,
      syncInterval,
      setSyncInterval,
    }}>
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  const context = useContext(LicenseContext);
  if (context === undefined) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
}
