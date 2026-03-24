'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { 
  Building2, 
  Receipt, 
  Globe, 
  FileText, 
  CreditCard, 
  Printer, 
  Wallet,
  ChevronRight,
  ChevronLeft,
  Check,
  Upload,
  SkipForward,
  Sparkles
} from 'lucide-react';

interface OnboardingData {
  // Step 1: Business Profile
  businessName: string;
  businessTagline: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  businessLogo: string;
  
  // Step 2: Tax Configuration
  taxRate: number;
  taxNumber: string;
  includeInPrice: boolean;
  
  // Step 3: Currency & Regional
  currency: string;
  dateFormat: string;
  language: string;
  timeZone: string;
  
  // Step 4: Invoice Numbering
  invoicePrefix: string;
  cashSalePrefix: string;
  financialYearStartMonth: number;
  currentFinancialYear: string;
  
  // Step 5: Payment Methods
  paymentMethods: {
    cash: boolean;
    mpesa: boolean;
    card: boolean;
    bankTransfer: boolean;
    credit: boolean;
  };
  
  // Step 6: Receipt & Printing
  receiptHeader: string;
  receiptFooter: string;
  autoPrint: boolean;
  showLogoOnReceipt: boolean;
  
  // Step 7: Opening Balances
  openingCashBalance: number;
  openingBankBalance: number;
}

const STEPS = [
  { id: 'business', title: 'Business Profile', icon: Building2, required: true },
  { id: 'tax', title: 'Tax Configuration', icon: Receipt, required: true },
  { id: 'regional', title: 'Currency & Region', icon: Globe, required: true },
  { id: 'numbering', title: 'Invoice Numbering', icon: FileText, required: false },
  { id: 'payment', title: 'Payment Methods', icon: CreditCard, required: false },
  { id: 'printing', title: 'Receipt & Printing', icon: Printer, required: false },
  { id: 'balance', title: 'Opening Balances', icon: Wallet, required: false },
];

const CURRENCIES = [
  { code: 'KES', name: 'Kenyan Shilling (KES)', symbol: 'KSh' },
  { code: 'USD', name: 'US Dollar (USD)', symbol: '$' },
  { code: 'EUR', name: 'Euro (EUR)', symbol: '€' },
  { code: 'GBP', name: 'British Pound (GBP)', symbol: '£' },
  { code: 'TZS', name: 'Tanzanian Shilling (TZS)', symbol: 'TSh' },
  { code: 'UGX', name: 'Ugandan Shilling (UGX)', symbol: 'USh' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2025)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2025)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-12-31)' },
];

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    businessName: '',
    businessTagline: '',
    businessPhone: '',
    businessEmail: '',
    businessAddress: '',
    businessLogo: '',
    taxRate: 16,
    taxNumber: '',
    includeInPrice: false,
    currency: 'KES',
    dateFormat: 'DD/MM/YYYY',
    language: 'en',
    timeZone: 'Africa/Nairobi',
    invoicePrefix: 'INV',
    cashSalePrefix: 'CSH',
    financialYearStartMonth: 7,
    currentFinancialYear: '2025-2026',
    paymentMethods: {
      cash: true,
      mpesa: false,
      card: false,
      bankTransfer: false,
      credit: false,
    },
    receiptHeader: 'Thank you for shopping with us!',
    receiptFooter: 'Please come again',
    autoPrint: false,
    showLogoOnReceipt: true,
    openingCashBalance: 0,
    openingBankBalance: 0,
  });

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem('onboarding-progress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData({ ...data, ...parsed });
        if (parsed.currentStep) {
          setCurrentStep(parsed.currentStep);
        }
      } catch (e) {
        console.error('Failed to load onboarding progress:', e);
      }
    }
  }, []);

  // Save progress
  const saveProgress = async (stepData?: Partial<OnboardingData>) => {
    const newData = stepData ? { ...data, ...stepData } : data;
    localStorage.setItem('onboarding-progress', JSON.stringify({ ...newData, currentStep }));
  };

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
    saveProgress({ ...data, ...updates });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      saveProgress();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      saveProgress();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding-complete', 'true');
    router.push('/dashboard');
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Save all settings
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: data.businessName,
          businessTagline: data.businessTagline,
          phone: data.businessPhone,
          email: data.businessEmail,
          address: data.businessAddress,
          logo: data.businessLogo,
          taxRate: data.taxRate,
          enableTax: true,
          includeInPrice: data.includeInPrice,
          vatNumber: data.taxNumber,
          invoicePrefix: data.invoicePrefix,
          cashSalePrefix: data.cashSalePrefix,
          financialYearStartMonth: data.financialYearStartMonth,
          currentFinancialYear: data.currentFinancialYear,
          receiptHeader: data.receiptHeader,
          receiptFooter: data.receiptFooter,
          showLogoOnReceipt: data.showLogoOnReceipt,
        }),
      });

      if (response.ok) {
        // Clear onboarding progress
        localStorage.removeItem('onboarding-progress');
        localStorage.setItem('onboarding-complete', 'true');
        
        // Redirect to dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateData({ businessLogo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const currentStepInfo = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Welcome to Your POS System</h1>
                <p className="text-sm text-gray-500">Let's get your business set up</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Step {currentStep + 1} of {STEPS.length}</p>
              <p className="text-lg font-semibold text-gray-900">{Math.round(progress)}% Complete</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Step Indicators */}
          <div className="flex items-center justify-between mt-4 overflow-x-auto pb-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div 
                  key={step.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap ${
                    isActive 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : isCompleted 
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="text-xs font-medium">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur">
          <CardHeader className="border-b border-gray-100 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
                {(() => {
                  const Icon = currentStepInfo.icon;
                  return <Icon className="w-6 h-6 text-white" />;
                })()}
              </div>
              <div>
                <CardTitle className="text-xl">{currentStepInfo.title}</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {currentStepInfo.required ? 'Required' : 'Optional - You can skip this'}
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-6">
            {/* Step 1: Business Profile */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name *
                    </label>
                    <Input
                      value={data.businessName}
                      onChange={(e) => updateData({ businessName: e.target.value })}
                      placeholder="Enter your business name"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Tagline
                    </label>
                    <Input
                      value={data.businessTagline}
                      onChange={(e) => updateData({ businessTagline: e.target.value })}
                      placeholder="e.g., Your One-Stop Shop"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <Input
                      value={data.businessPhone}
                      onChange={(e) => updateData({ businessPhone: e.target.value })}
                      placeholder="+254 700 000 000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={data.businessEmail}
                      onChange={(e) => updateData({ businessEmail: e.target.value })}
                      placeholder="business@example.com"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Address
                    </label>
                    <textarea
                      value={data.businessAddress}
                      onChange={(e) => updateData({ businessAddress: e.target.value })}
                      placeholder="Enter your business address"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Logo
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                        {data.businessLogo ? (
                          <img src={data.businessLogo} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <Upload className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          Upload Logo
                        </span>
                      </label>
                      {data.businessLogo && (
                        <button 
                          onClick={() => updateData({ businessLogo: '' })}
                          className="text-red-500 text-sm hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Tax Configuration */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    Configure how your business handles VAT or GST. This affects how prices are displayed and calculated.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Rate (%)
                  </label>
                  <Input
                    type="number"
                    value={data.taxRate}
                    onChange={(e) => updateData({ taxRate: parseFloat(e.target.value) || 0 })}
                    placeholder="16"
                  />
                  <p className="text-xs text-gray-500 mt-1">Kenya uses 16% VAT. Enter 0 if you don't charge tax.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Number (VAT/GST Registration)
                  </label>
                  <Input
                    value={data.taxNumber}
                    onChange={(e) => updateData({ taxNumber: e.target.value })}
                    placeholder="A0000000000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional - Required if you need to claim tax credits</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.includeInPrice}
                      onChange={(e) => updateData({ includeInPrice: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Prices include tax</span>
                      <p className="text-sm text-gray-500">
                        {data.includeInPrice 
                          ? 'Product prices you enter already have tax included' 
                          : 'Tax will be added on top of product prices'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Step 3: Currency & Regional */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency *
                    </label>
                    <select
                      value={data.currency}
                      onChange={(e) => updateData({ currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {CURRENCIES.map((currency) => (
                        <option key={currency.code} value={currency.code}>
                          {currency.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Format
                    </label>
                    <select
                      value={data.dateFormat}
                      onChange={(e) => updateData({ dateFormat: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {DATE_FORMATS.map((format) => (
                        <option key={format.value} value={format.value}>
                          {format.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Zone
                    </label>
                    <select
                      value={data.timeZone}
                      onChange={(e) => updateData({ timeZone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Africa/Nairobi">East Africa Time (EAT)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      value={data.language}
                      onChange={(e) => updateData({ language: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="en">English</option>
                      <option value="sw">Swahili</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Invoice Numbering */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-700">
                    Configure how your invoice and receipt numbers are generated. Numbers reset each financial year.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invoice Prefix
                    </label>
                    <Input
                      value={data.invoicePrefix}
                      onChange={(e) => updateData({ invoicePrefix: e.target.value })}
                      placeholder="INV"
                    />
                    <p className="text-xs text-gray-500 mt-1">Example: INV2526-00001</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cash Sale Prefix
                    </label>
                    <Input
                      value={data.cashSalePrefix}
                      onChange={(e) => updateData({ cashSalePrefix: e.target.value })}
                      placeholder="CSH"
                    />
                    <p className="text-xs text-gray-500 mt-1">Example: CSH2526-00001</p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Financial Year Starts In
                    </label>
                    <select
                      value={data.financialYearStartMonth}
                      onChange={(e) => updateData({ financialYearStartMonth: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {MONTHS.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Your financial year will run from {MONTHS.find(m => m.value === data.financialYearStartMonth)?.label} to the following June
                    </p>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Preview</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice:</span>
                      <span className="font-mono">{data.invoicePrefix}{data.currentFinancialYear.replace('-', '').slice(-4)}-00001</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cash Sale:</span>
                      <span className="font-mono">{data.cashSalePrefix}{data.currentFinancialYear.replace('-', '').slice(-4)}-00001</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Payment Methods */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <p className="text-gray-600">Select the payment methods you want to accept in your business.</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { id: 'cash', label: 'Cash', description: 'Physical cash payments' },
                    { id: 'mpesa', label: 'M-Pesa', description: 'Mobile money payments' },
                    { id: 'card', label: 'Card', description: 'Credit/Debit card payments' },
                    { id: 'bankTransfer', label: 'Bank Transfer', description: 'Direct bank transfers' },
                    { id: 'credit', label: 'Credit/Account', description: 'Buy now pay later' },
                  ].map((method) => (
                    <label 
                      key={method.id}
                      className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        data.paymentMethods[method.id as keyof typeof data.paymentMethods]
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={data.paymentMethods[method.id as keyof typeof data.paymentMethods]}
                        onChange={(e) => updateData({
                          paymentMethods: {
                            ...data.paymentMethods,
                            [method.id]: e.target.checked
                          }
                        })}
                        className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">{method.label}</span>
                        <p className="text-sm text-gray-500">{method.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6: Receipt & Printing */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt Header
                  </label>
                  <textarea
                    value={data.receiptHeader}
                    onChange={(e) => updateData({ receiptHeader: e.target.value })}
                    placeholder="Thank you for shopping with us!"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt Footer
                  </label>
                  <textarea
                    value={data.receiptFooter}
                    onChange={(e) => updateData({ receiptFooter: e.target.value })}
                    placeholder="Please come again"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.showLogoOnReceipt}
                      onChange={(e) => updateData({ showLogoOnReceipt: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-medium text-gray-900">Show logo on receipts</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.autoPrint}
                      onChange={(e) => updateData({ autoPrint: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-medium text-gray-900">Auto-print receipts after sale</span>
                  </label>
                </div>
              </div>
            )}

            {/* Step 7: Opening Balances */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    Set your opening cash and bank balances. This helps track your starting position for financial reports.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opening Cash Balance
                    </label>
                    <Input
                      type="number"
                      value={data.openingCashBalance}
                      onChange={(e) => updateData({ openingCashBalance: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opening Bank Balance
                    </label>
                    <Input
                      type="number"
                      value={data.openingBankBalance}
                      onChange={(e) => updateData({ openingBankBalance: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">You can skip this</h4>
                  <p className="text-sm text-gray-500">
                    Opening balances are optional. You can set them up later from the accounting section if needed.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          
          {/* Footer Actions */}
          <div className="border-t border-gray-100 p-6 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <div>
                {currentStep > 0 ? (
                  <Button variant="outline" onClick={handleBack}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {currentStep > 0 && (
                  <Button variant="outline" onClick={handleBack}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
                
                {/* Always show Skip All - allows users to skip entire onboarding */}
                <Button variant="ghost" onClick={handleSkip} className="text-gray-500 hover:text-gray-700">
                  Skip All
                </Button>
                
                {currentStep < STEPS.length - 1 ? (
                  <Button 
                    onClick={handleNext}
                    disabled={currentStep === 0 && !data.businessName}
                  >
                    Continue
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleComplete}
                    disabled={saving || !data.businessName}
                  >
                    {saving ? 'Setting up...' : 'Complete Setup'}
                    <Check className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
