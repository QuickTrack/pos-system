'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
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

const TOKEN_CHECK_INTERVAL = 60000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    const hasAuthCookie = typeof document !== 'undefined' && document.cookie.includes('auth-token=');
    if (!hasAuthCookie) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
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
  }, []);

  const logout = useCallback(async (redirectTo: string = '/login') => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Ignore logout errors
    }

    const preserveToken = sessionStorage.getItem('pos-preserve-token');
    if (preserveToken) {
      try {
        await fetch('/api/auth/restore-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preserveToken }),
        });
      } catch {
        // Ignore restore errors
      }
      sessionStorage.removeItem('pos-preserve-token');
      sessionStorage.removeItem('pos-auth-success');
    } else {
      document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }

    setUser(null);
    router.push(redirectTo);
    router.refresh();
  }, [router]);

  useEffect(() => {
    checkAuth();

    const interval = setInterval(() => {
      checkAuth();
    }, TOKEN_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [checkAuth]);

  useEffect(() => {
    if (!loading && user) {
      const currentPath = window.location.pathname;

      if (currentPath === '/license/activate' || currentPath === '/onboarding') {
        return;
      }

      const checkLicense = async () => {
        try {
          const lastValidated = localStorage.getItem('license-last-validated');
          if (lastValidated) {
            const lastDate = new Date(lastValidated);
            const hoursSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60);
            if (hoursSince < 24) {
              return;
            }
          }

          const storedLicense = localStorage.getItem('pos-license');

          if (user.role === 'super_admin') {
            localStorage.removeItem('license-warning');
            localStorage.setItem('license-last-validated', new Date().toISOString());
            return;
          }

          if (storedLicense) {
            const licenseData = JSON.parse(storedLicense);

            const response = await fetch(`/api/licenses/validate?licenseKey=${encodeURIComponent(licenseData.licenseKey)}`);
            const data = await response.json();

            localStorage.setItem('license-last-validated', new Date().toISOString());

            if (!data.valid) {
              if (currentPath !== '/license/activate') {
                router.push('/license/activate');
              }
              return;
            }

            if (data.warnings && data.warnings.length > 0) {
              localStorage.setItem('license-warning', JSON.stringify(data.warnings));
            }
          } else {
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

      const onboardingComplete = localStorage.getItem('onboarding-complete');

      if (!onboardingComplete && currentPath !== '/onboarding') {
        router.push('/onboarding');
      }
    }
  }, [user, loading, router, checkAuth]);

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
