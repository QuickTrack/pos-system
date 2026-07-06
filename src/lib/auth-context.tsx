'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: string;
  branch?: string;
  exp?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: (redirectTo?: string) => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_CHECK_INTERVAL = 60000; // Check every minute

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = async () => {
    try {
      // Call API to verify token instead of reading httpOnly cookie
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async (redirectTo: string = '/login') => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Ignore logout errors
    }
    
    // Clear cookie
    document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    setUser(null);
    router.push(redirectTo);
    router.refresh();
  };

// Check and redirect to onboarding if needed
  useEffect(() => {
    if (!loading && user) {
      const currentPath = window.location.pathname;
      
      // Skip checks for license and onboarding pages
      if (currentPath === '/license/activate' || currentPath === '/onboarding' || currentPath === '/pos/login') {
        return;
      }
      
      // Super admins bypass license validation - they can access the system regardless of license status
      const isSuperAdmin = user.role === 'super_admin';
      
      // Check license first - only check once per day
      const checkLicense = async () => {
        try {
          // Check if we've validated within the last 24 hours
          const lastValidated = localStorage.getItem('license-last-validated');
          if (lastValidated) {
            const lastDate = new Date(lastValidated);
            const hoursSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60);
            if (hoursSince < 24) {
              return; // Skip validation - done within last 24 hours
            }
          }
          
          const storedLicense = localStorage.getItem('pos-license');
          
          // If super admin, skip license check entirely
          if (isSuperAdmin) {
            // Clear any license warnings for super admins
            localStorage.removeItem('license-warning');
            localStorage.setItem('license-last-validated', new Date().toISOString());
            return;
          }
          
          if (storedLicense) {
            const licenseData = JSON.parse(storedLicense);
            
            // Validate license with server
            const response = await fetch(`/api/licenses/validate?licenseKey=${encodeURIComponent(licenseData.licenseKey)}`);
            const data = await response.json();
            
            // Store validation timestamp
            localStorage.setItem('license-last-validated', new Date().toISOString());
            
            if (!data.valid) {
              // License invalid or expired
              if (currentPath !== '/license/activate') {
                router.push('/license/activate');
              }
              return;
            }
            
            // Check for warnings
            if (data.warnings && data.warnings.length > 0) {
              // Store warning for display in header
              localStorage.setItem('license-warning', JSON.stringify(data.warnings));
            }
          } else {
            // No license found
            localStorage.setItem('license-last-validated', new Date().toISOString());
            if (currentPath !== '/license/activate') {
              router.push('/license/activate');
            }
          }
        } catch (error) {
          console.error('License check failed:', error);
        }
      };
      
      checkLicense();
      
      // Check if onboarding is needed
      const onboardingComplete = localStorage.getItem('onboarding-complete');
      
      // If not on onboarding page and not complete, redirect
      if (!onboardingComplete && currentPath !== '/onboarding') {
        router.push('/onboarding');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    checkAuth();

    // Set up periodic token check
    const interval = setInterval(() => {
      checkAuth();
    }, TOKEN_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
