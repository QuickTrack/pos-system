'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuthAndLicense = async () => {
      try {
        // Check if user is authenticated
        const authResponse = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (authResponse.ok) {
          const authData = await authResponse.json();
          
          // If user is authenticated and is a super admin, redirect to dashboard
          if (authData.user && authData.user.role === 'super_admin') {
            router.push('/dashboard');
            return;
          }

          // Check if user has a valid license
          const storedLicense = localStorage.getItem('pos-license');
          if (storedLicense) {
            try {
              const licenseData = JSON.parse(storedLicense);
              
              // Validate license with server (only if authenticated)
              const licenseResponse = await fetch(`/api/licenses/validate?licenseKey=${encodeURIComponent(licenseData.licenseKey)}`, {
                method: 'GET',
                credentials: 'include',
              });
              
              if (licenseResponse.ok) {
                const licenseResult = await licenseResponse.json();
                
                if (licenseResult.valid) {
                  // License is valid, redirect to dashboard
                  router.push('/dashboard');
                  return;
                }
              }
            } catch (licenseError) {
              // License validation failed, continue to license activation
              console.log('License validation failed:', licenseError);
            }
          }

          // Check if onboarding is complete
          const onboardingComplete = localStorage.getItem('onboarding-complete');
          if (!onboardingComplete) {
            // Redirect to onboarding first
            router.push('/onboarding');
            return;
          }
        }

        // No valid auth or license, redirect to license activation
        router.push('/license/activate');
      } catch (error) {
        console.error('Auth/license check failed:', error);
        // On error, redirect to license activation
        router.push('/license/activate');
      } finally {
        setChecking(false);
      }
    };

    checkAuthAndLicense();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
        <p className="text-slate-400">
          {checking ? 'Checking authentication...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  );
}
