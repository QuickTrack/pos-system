'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { 
  Key, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Shield,
  Building2,
  Mail,
  Phone,
  RefreshCw,
  MapPin,
  Hash,
  Briefcase,
  User,
  ArrowLeft
} from 'lucide-react';

interface LicenseInfo {
  licenseKey: string;
  businessName: string;
  email: string;
  expirationDate: string;
  daysRemaining: number;
  licenseType: string;
  status: string;
}

interface BusinessInfo {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  taxNumber: string; // Business registration / Tax ID
  industry: string;
}

interface OnboardingData {
  businessName: string;
  businessTagline: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  businessLogo: string;
  taxRate: number;
  taxNumber: string;
  includeInPrice: boolean;
  currency: string;
  dateFormat: string;
  language: string;
  timeZone: string;
  invoicePrefix: string;
  cashSalePrefix: string;
  financialYearStartMonth: number;
  currentFinancialYear: string;
  paymentMethods: {
    cash: boolean;
    mpesa: boolean;
    card: boolean;
    bankTransfer: boolean;
    credit: boolean;
  };
  receiptHeader: string;
  receiptFooter: string;
  autoPrint: boolean;
  showLogoOnReceipt: boolean;
  openingCashBalance: number;
  openingBankBalance: number;
}

function ActivateLicenseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get plan from query parameter
  const plan = searchParams.get('plan');
  const isTrial = plan === 'trial';
  
  const [licenseKey, setLicenseKey] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [industry, setIndustry] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [errorCode, setErrorCode] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load business info from onboarding or settings
  useEffect(() => {
    const loadBusinessInfo = async () => {
      setInitialLoading(true);
      
      // First, try to load from onboarding localStorage
      try {
        const onboardingData = localStorage.getItem('onboarding-progress');
        if (onboardingData) {
          const parsed: OnboardingData = JSON.parse(onboardingData);
          
          // Populate fields from onboarding data
          if (parsed.businessName) setBusinessName(parsed.businessName);
          if (parsed.businessPhone) setPhone(parsed.businessPhone);
          if (parsed.businessEmail) setEmail(parsed.businessEmail);
          if (parsed.businessAddress) setAddress(parsed.businessAddress);
          if (parsed.taxNumber) setTaxNumber(parsed.taxNumber);
        }
      } catch (e) {
        console.error('Failed to load from onboarding:', e);
      }

      // Also check for settings in localStorage (persistent storage)
      try {
        const savedSettings = localStorage.getItem('pos-settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          
          // Only set if not already populated from onboarding
          if (!businessName && settings.businessName) setBusinessName(settings.businessName);
          if (!phone && settings.phone) setPhone(settings.phone);
          if (!email && settings.email) setEmail(settings.email);
          if (!address && settings.address) setAddress(settings.address);
          if (!taxNumber && settings.vatNumber) setTaxNumber(settings.vatNumber);
          if (!taxNumber && settings.kraPin) setTaxNumber(settings.kraPin);
        }
      } catch (e) {
        console.error('Failed to load from settings:', e);
      }

      // Try to fetch from API if authenticated (for settings already saved to DB)
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          const settings = data.settings;
          
          // Only set if not already populated
          if (!businessName && settings.businessName) setBusinessName(settings.businessName);
          if (!phone && settings.phone) setPhone(settings.phone);
          if (!email && settings.email) setEmail(settings.email);
          if (!address && settings.address) setAddress(settings.address);
          if (!taxNumber && settings.vatNumber) setTaxNumber(settings.vatNumber);
          if (!taxNumber && settings.kraPin) setTaxNumber(settings.kraPin);
        }
      } catch (e) {
        // API not available or not authenticated - that's fine
        console.log('Settings API not available, using local data');
      }

      // Note: Removed auto-redirect to allow users to visit this page to upgrade/renew license
      // The license status is shown in the header, and users can click to upgrade
      // This allows trial users to enter a purchased license key to upgrade
      
      setInitialLoading(false);
    };

    loadBusinessInfo();
  }, []);

  // Validate required fields
  const validateFields = (): boolean => {
    const errors: string[] = [];
    
    if (!businessName.trim()) {
      errors.push('Business name is required');
    }
    
    if (!email.trim()) {
      errors.push('Email address is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Please enter a valid email address');
    }
    
    if (!phone.trim()) {
      errors.push('Phone number is required');
    }
    
    // For non-trial plans, license key is required
    if (!isTrial && !licenseKey.trim()) {
      errors.push('License key is required');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorCode('');
    
    // Validate required fields
    if (!validateFields()) {
      return;
    }
    
    setLoading(true);

    try {
      // For trial plans, use a special activation endpoint or bypass validation
      if (isTrial) {
        // Create trial license
        const response = await fetch('/api/licenses/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            licenseKey: 'TRIAL-ACTIVATION',
            businessName,
            email,
            phone,
            address,
            taxNumber,
            industry,
            contactPerson,
            planType: 'trial',
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setSuccess(true);
          setLicenseInfo(data.license);
          
          // Store license info
          localStorage.setItem('pos-license', JSON.stringify(data.license));
          
          // For trial, redirect to login instead of dashboard
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        } else {
          setError(data.error || 'Failed to activate trial license');
          setErrorCode(data.code || '');
        }
      } else {
        // Regular license activation
        const response = await fetch('/api/licenses/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            licenseKey,
            businessName,
            email,
            phone,
            address,
            taxNumber,
            industry,
            contactPerson,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setSuccess(true);
          setLicenseInfo(data.license);
          
          // Store license info
          localStorage.setItem('pos-license', JSON.stringify(data.license));
          
          // Redirect after short delay
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else {
          setError(data.error || 'Failed to activate license');
          setErrorCode(data.code || '');
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/licenses/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey,
          businessName,
          email,
          phone,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setLicenseInfo(data.license);
        
        // Update stored license info
        localStorage.setItem('pos-license', JSON.stringify(data.license));
        
        // Redirect after short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setError(data.error || 'Failed to renew license');
        setErrorCode(data.code || '');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isRenewal = licenseKey.startsWith('REN-');

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading business information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-2xl mb-4 overflow-hidden">
            <img src="/Gemini_Generated_Image_iikvdoiikvdoiikv.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-white">
            {isTrial ? 'Start Your Free Trial' : 'License Activation'}
          </h1>
          <p className="text-slate-400 mt-2">
            {isTrial 
              ? '14-day free trial - No credit card required' 
              : isRenewal 
                ? 'Renew your POS license' 
                : 'Activate your POS system'}
          </p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur">
          {success && licenseInfo ? (
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {isTrial ? 'Trial Started!' : isRenewal ? 'License Renewed!' : 'License Activated!'}
              </h2>
              <p className="text-gray-600 mb-4">
                {isTrial 
                  ? 'Your 14-day trial is now active!' 
                  : `Your license is now active until ${new Date(licenseInfo.expirationDate).toLocaleDateString()}`}
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Business:</span>
                    <span className="font-medium">{licenseInfo.businessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type:</span>
                    <span className="font-medium capitalize">{licenseInfo.licenseType}</span>
                  </div>
                  {!isTrial && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Days Remaining:</span>
                      <span className="font-medium">{licenseInfo.daysRemaining}</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                {isTrial ? 'Redirecting to login...' : 'Redirecting to dashboard...'}
              </p>
            </CardContent>
          ) : (
            <form onSubmit={handleActivate}>
              <CardHeader className="pb-4">
                <CardTitle>
                  {isTrial ? 'Business Information' : 'Enter Your License Key'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-700">Please fix the following:</p>
                        <ul className="text-sm text-red-600 mt-1 list-disc list-inside">
                          {validationErrors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-700">{error}</p>
                        {errorCode === 'KEY_NOT_FOUND' && (
                          <p className="text-sm text-red-600 mt-1">
                            Please check your license key and try again, or contact support.
                          </p>
                        )}
                        {errorCode === 'ALREADY_ACTIVATED' && (
                          <p className="text-sm text-red-600 mt-1">
                            This key was activated on a different account.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* License Key Input - Only show for non-trial */}
                {!isTrial && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Key <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Key className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-opacity ${licenseKey ? 'opacity-0' : 'opacity-100'}`} />
                      <Input
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                        placeholder="POS-XXXX-XXXX-XXXX-XXXX"
                        className="pl-10 font-mono"
                        required={!isTrial}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Format: POS-XXXX-XXXX-XXXX-XXXX (or REN-XXXX-XXXX-XXXX for renewal)
                    </p>
                  </div>
                )}

                {/* Business Info Section */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-sm font-medium text-gray-500 mb-4">
                    {isTrial ? 'We found your business info from onboarding:' : 'Business Information'}
                  </p>
                  
                  {/* Business Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-opacity ${businessName ? 'opacity-0' : 'opacity-100'}`} />
                      <Input
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Your Business Name"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Contact Person */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person
                    </label>
                    <div className="relative">
                      <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-opacity ${contactPerson ? 'opacity-0' : 'opacity-100'}`} />
                      <Input
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        placeholder="Your Name (optional)"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-opacity ${email ? 'opacity-0' : 'opacity-100'}`} />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="business@example.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-opacity ${phone ? 'opacity-0' : 'opacity-100'}`} />
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+254 700 000 000"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Address
                    </label>
                    <div className="relative">
                      <MapPin className={`absolute left-3 top-3 w-5 h-5 text-gray-400 transition-opacity ${address ? 'opacity-0' : 'opacity-100'}`} />
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter your business address"
                        rows={2}
                        className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Tax / Business Registration Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax / Business Registration Number
                    </label>
                    <div className="relative">
                      <Hash className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-opacity ${taxNumber ? 'opacity-0' : 'opacity-100'}`} />
                      <Input
                        value={taxNumber}
                        onChange={(e) => setTaxNumber(e.target.value)}
                        placeholder="A0000000000"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Industry */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Industry
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        <option value="">Select your industry</option>
                        <option value="retail">Retail</option>
                        <option value="wholesale">Wholesale</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="cafe">Cafe / Coffee Shop</option>
                        <option value="beauty">Beauty & Salon</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="electronics">Electronics</option>
                        <option value="clothing">Clothing & Apparel</option>
                        <option value="pharmacy">Pharmacy</option>
                        <option value="supermarket">Supermarket</option>
                        <option value="hardware">Hardware</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full mt-6"
                  disabled={loading || !businessName.trim() || !email.trim() || !phone.trim() || (!isTrial && !licenseKey.trim())}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isTrial ? 'Starting Trial...' : 'Activating...'}
                    </>
                  ) : isRenewal ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Renew License
                    </>
                  ) : isTrial ? (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Start Free Trial
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Activate License
                    </>
                  )}
                </Button>

                {/* Help Text */}
                {!isTrial && (
                  <p className="text-center text-sm text-gray-500 mt-4">
                    Don't have a license key?{' '}
                    <a href="/pricing" className="text-emerald-600 hover:underline font-medium">
                      Get one here
                    </a>
                  </p>
                )}

                {/* Trial Help Text */}
                {isTrial && (
                  <p className="text-center text-sm text-gray-500 mt-4">
                    Already have a license?{' '}
                    <a href="/license/activate" className="text-emerald-600 hover:underline font-medium">
                      Activate with license key
                    </a>
                  </p>
                )}
              </CardContent>
            </form>
          )}
        </Card>

        {/* Back to Dashboard Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-8">
          © 2025 POS System. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function ActivateLicensePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    }>
      <ActivateLicenseContent />
    </Suspense>
  );
}
