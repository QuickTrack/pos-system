'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/lib/auth-context';
import { LicenseProvider } from '@/lib/license-context';

function AuthCheck({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hasPosAuth, setHasPosAuth] = useState(() => {
    // Initialize state with sessionStorage value during first render
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('pos-auth-success') === 'true';
    }
    return false;
  });
  const initializedRef = useRef(false);

  useEffect(() => {
    // Clean up the flag after use once user is loaded
    if (!loading && hasPosAuth) {
      sessionStorage.removeItem('pos-auth-success');
    }
  }, [loading, hasPosAuth]);

  useEffect(() => {
    // Allow access if:
    // 1. User is a cashier (normal flow)
    // 2. User has been authenticated via POS modal (indicated by sessionStorage flag)
    
    if (!loading && !user && !hasPosAuth) {
      router.push('/pos/login');
      return;
    }
    
    if (!loading && user && user.role !== 'cashier' && !hasPosAuth) {
      router.push('/dashboard');
      return;
    }
  }, [user, loading, router, hasPosAuth]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Don't render if no user (or wrong role without success flag)
  if (!user && !hasPosAuth) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}

export default function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LicenseProvider>
      <AuthCheck>{children}</AuthCheck>
    </LicenseProvider>
  );
}