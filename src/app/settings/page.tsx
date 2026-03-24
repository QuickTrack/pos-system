'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Save, Building2, Receipt, Bell, Shield, Palette, Calendar, Monitor, Smartphone, Globe, X, Trash2, RefreshCw, Settings2 } from 'lucide-react';

interface Settings {
  business: {
    name: string;
    tagline: string;
    email: string;
    phone: string;
    address: string;
    taxNumber: string;
    currency: string;
    logo?: string;
  };
  tax: {
    enabled: boolean;
    rate: number;
    includeInPrice: boolean;
    invoiceTerms: string;
  };
  notifications: {
    email: boolean;
    lowStock: boolean;
    dailySales: boolean;
    allowNegativeStock: boolean;
  };
  appearance: {
    darkMode: boolean;
    colorScheme: string;
  };
  financialYear: {
    startMonth: number;
    endMonth: number;
    currentFinancialYear: string;
    fiscalYearStartDate: string;
    invoicePrefix: string;
    cashSalePrefix: string;
  };
}

const TABS = [
  { id: 'business', label: 'Business', icon: Building2 },
  { id: 'tax', label: 'Tax', icon: Receipt },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'financialYear', label: 'Financial Year', icon: Calendar },
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('business');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Session management state
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState('');
  
  const [settings, setSettings] = useState<Settings>({
    business: {
      name: '',
      tagline: '',
      email: '',
      phone: '',
      address: '',
      taxNumber: '',
      currency: 'KES',
      logo: '',
    },
    tax: {
      enabled: true,
      rate: 16,
      includeInPrice: false,
      invoiceTerms: '',
    },
    notifications: {
      email: true,
      lowStock: true,
      dailySales: false,
      allowNegativeStock: false,
    },
    appearance: {
      darkMode: false,
      colorScheme: 'emerald',
    },
    financialYear: {
      startMonth: 7,
      endMonth: 6,
      currentFinancialYear: '2025-2026',
      fiscalYearStartDate: '2025-07-01',
      invoicePrefix: 'INV',
      cashSalePrefix: 'CSH',
    },
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadFromLocalStorage = () => {
      if (typeof window === 'undefined') return null;
      try {
        const saved = localStorage.getItem('pos-settings');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.error('Failed to load settings from localStorage:', e);
      }
      return null;
    };

    // First load from localStorage for immediate display
    const cachedSettings = loadFromLocalStorage();
    if (cachedSettings) {
      setSettings(cachedSettings);
    }
    
    // Then fetch from API to get latest server data (but merge with localStorage)
    fetchSettings(loadFromLocalStorage);
  }, []);

  const fetchSettings = async (getLocalStorage?: () => any) => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          // Get localStorage data for merging
          const localData = getLocalStorage ? getLocalStorage() : null;
          
          // Map flat database fields to nested frontend structure
          // Merge with localStorage, preferring localStorage values for settings not in DB
          setSettings({
            business: {
              name: data.settings.businessName || localData?.business?.name || '',
              tagline: data.settings.businessTagline || localData?.business?.tagline || '',
              email: data.settings.email || localData?.business?.email || '',
              phone: data.settings.phone || localData?.business?.phone || '',
              address: data.settings.address || localData?.business?.address || '',
              taxNumber: data.settings.kraPin || localData?.business?.taxNumber || '',
              currency: 'KES',
              logo: data.settings.logo || localData?.business?.logo || '',
            },
            tax: {
              enabled: data.settings.enableTax ?? localData?.tax?.enabled ?? true,
              rate: data.settings.taxRate ?? localData?.tax?.rate ?? 16,
              includeInPrice: data.settings.includeInPrice ?? localData?.tax?.includeInPrice ?? false,
              invoiceTerms: data.settings.invoiceTerms || localData?.tax?.invoiceTerms || '',
            },
            notifications: {
              email: localData?.notifications?.email ?? true,
              lowStock: data.settings.lowStockAlert ?? localData?.notifications?.lowStock ?? true,
              dailySales: localData?.notifications?.dailySales ?? false,
              allowNegativeStock: data.settings.allowNegativeStock ?? localData?.notifications?.allowNegativeStock ?? false,
            },
            appearance: {
              darkMode: localData?.appearance?.darkMode ?? false,
              colorScheme: localData?.appearance?.colorScheme ?? 'emerald',
            },
            financialYear: {
              startMonth: data.settings.financialYearStartMonth ?? localData?.financialYear?.startMonth ?? 7,
              endMonth: data.settings.financialYearEndMonth ?? localData?.financialYear?.endMonth ?? 6,
              currentFinancialYear: data.settings.currentFinancialYear ?? localData?.financialYear?.currentFinancialYear ?? '2025-2026',
              fiscalYearStartDate: data.settings.fiscalYearStartDate ? new Date(data.settings.fiscalYearStartDate).toISOString().split('T')[0] : localData?.financialYear?.fiscalYearStartDate ?? '2025-07-01',
              invoicePrefix: data.settings.invoicePrefix ?? localData?.financialYear?.invoicePrefix ?? 'INV',
              cashSalePrefix: data.settings.cashSalePrefix ?? localData?.financialYear?.cashSalePrefix ?? 'CSH',
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      // Map nested frontend structure to flat database format
      const dbSettings = {
        businessName: settings.business.name,
        businessTagline: settings.business.tagline || 'Your One-Stop Shop',
        email: settings.business.email,
        phone: settings.business.phone,
        address: settings.business.address,
        kraPin: settings.business.taxNumber,
        logo: settings.business.logo,
        taxRate: settings.tax.rate,
        enableTax: settings.tax.enabled,
        includeInPrice: settings.tax.includeInPrice,
        taxName: 'VAT',
        lowStockAlert: settings.notifications.lowStock,
        allowNegativeStock: settings.notifications.allowNegativeStock,
        invoiceTerms: settings.tax.invoiceTerms,
        // Financial Year settings
        financialYearStartMonth: settings.financialYear.startMonth,
        financialYearEndMonth: settings.financialYear.endMonth,
        currentFinancialYear: settings.financialYear.currentFinancialYear,
        fiscalYearStartDate: settings.financialYear.fiscalYearStartDate,
        invoicePrefix: settings.financialYear.invoicePrefix,
        cashSalePrefix: settings.financialYear.cashSalePrefix,
      };

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbSettings),
      });

      if (response.ok) {
        // Also save to localStorage for offline persistence
        try {
          localStorage.setItem('pos-settings', JSON.stringify(settings));
        } catch (e) {
          console.error('Failed to save settings to localStorage:', e);
        }
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  // Session management functions
  const fetchSessions = async () => {
    setSessionsLoading(true);
    setSessionsError('');
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions || []);
      } else {
        setSessionsError(data.error || 'Failed to fetch sessions');
      }
    } catch (error) {
      setSessionsError('Failed to connect to server');
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', sessionId }),
      });
      const data = await response.json();
      if (data.success) {
        fetchSessions();
      }
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('Are you sure you want to revoke all your sessions? You will be logged out everywhere except this device.')) {
      return;
    }
    try {
      const response = await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revokeAll' }),
      });
      const data = await response.json();
      if (data.success) {
        fetchSessions();
      }
    } catch (error) {
      console.error('Failed to revoke all sessions:', error);
    }
  };

  const handleRunOnboarding = () => {
    localStorage.removeItem('onboarding-complete');
    router.push('/onboarding');
  };

  const updateBusinessField = (field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      business: { ...prev.business, [field]: value },
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    // Check file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('File must be PNG, JPG, or SVG');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      updateBusinessField('logo', base64);
    };
    reader.onerror = () => {
      alert('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const updateTaxField = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      tax: { ...prev.tax, [field]: value },
    }));
  };

  const updateNotificationField = (field: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [field]: value },
    }));
  };

  const updateAppearanceField = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      appearance: { ...prev.appearance, [field]: value },
    }));
  };

  const updateFinancialYearField = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      financialYear: { ...prev.financialYear, [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title="Settings" subtitle="Manage your business settings" />

      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <Card>
            <div className="p-2">
              <nav className="space-y-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          <Card>
            <CardHeader title={`${TABS.find(t => t.id === activeTab)?.label} Settings`} />
            <div className="p-6">
              {activeTab === 'business' && (
                <div className="space-y-4">
                  {/* Logo Upload */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Logo
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                        {settings.business.logo ? (
                          <img 
                            src={settings.business.logo} 
                            alt="Business Logo" 
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs text-center p-2">No Logo</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                          onChange={handleLogoUpload}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-emerald-50 file:text-emerald-700
                            hover:file:bg-emerald-100
                          "
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG, or SVG. Max 2MB.
                        </p>
                        {settings.business.logo && (
                          <button
                            type="button"
                            onClick={() => updateBusinessField('logo', '')}
                            className="text-xs text-red-600 mt-2 hover:underline"
                          >
                            Remove logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business Name
                      </label>
                      <Input
                        type="text"
                        value={settings.business.name}
                        onChange={(e) => updateBusinessField('name', e.target.value)}
                        placeholder="Your Business Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tagline
                      </label>
                      <Input
                        type="text"
                        value={settings.business.tagline}
                        onChange={(e) => updateBusinessField('tagline', e.target.value)}
                        placeholder="Your One-Stop Shop"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={settings.business.email}
                        onChange={(e) => updateBusinessField('email', e.target.value)}
                        placeholder="business@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <Input
                        type="tel"
                        value={settings.business.phone}
                        onChange={(e) => updateBusinessField('phone', e.target.value)}
                        placeholder="+254 700 000 000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={settings.business.currency}
                        onChange={(e) => updateBusinessField('currency', e.target.value)}
                      >
                        <option value="KES">Kenya Shilling (KES)</option>
                        <option value="USD">US Dollar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                        <option value="GBP">British Pound (GBP)</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        rows={2}
                        value={settings.business.address}
                        onChange={(e) => updateBusinessField('address', e.target.value)}
                        placeholder="Your business address"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Number (KRA PIN)
                      </label>
                      <Input
                        type="text"
                        value={settings.business.taxNumber}
                        onChange={(e) => updateBusinessField('taxNumber', e.target.value)}
                        placeholder="A0000000000"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tax' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">Enable Tax</h3>
                      <p className="text-sm text-gray-500">Apply VAT/Tax to sales</p>
                    </div>
                    <button
                      onClick={() => updateTaxField('enabled', !settings.tax.enabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                        settings.tax.enabled ? 'bg-emerald-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white ${
                        settings.tax.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Rate (%)
                    </label>
                    <Input
                      type="number"
                      value={settings.tax.rate}
                      onChange={(e) => updateTaxField('rate', parseFloat(e.target.value) || 0)}
                      placeholder="16"
                      min="0"
                      max="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice Terms & Payment Terms
                    </label>
                    <textarea
                      value={settings.tax.invoiceTerms}
                      onChange={(e) => updateTaxField('invoiceTerms', e.target.value)}
                      placeholder="e.g., Payment due within 30 days. Late payments may attract a penalty of 2% per month."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">These terms will appear on invoices</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">Include Tax in Price</h3>
                      <p className="text-sm text-gray-500">Display prices with tax included</p>
                    </div>
                    <button
                      onClick={() => updateTaxField('includeInPrice', !settings.tax.includeInPrice)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                        settings.tax.includeInPrice ? 'bg-emerald-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white ${
                        settings.tax.includeInPrice ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">Email Notifications</h3>
                      <p className="text-sm text-gray-500">Receive notifications via email</p>
                    </div>
                    <button
                      onClick={() => updateNotificationField('email', !settings.notifications.email)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                        settings.notifications.email ? 'bg-emerald-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white ${
                        settings.notifications.email ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">Low Stock Alerts</h3>
                      <p className="text-sm text-gray-500">Get notified when products are running low</p>
                    </div>
                    <button
                      onClick={() => updateNotificationField('lowStock', !settings.notifications.lowStock)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                        settings.notifications.lowStock ? 'bg-emerald-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white ${
                        settings.notifications.lowStock ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">Daily Sales Summary</h3>
                      <p className="text-sm text-gray-500">Receive daily sales report</p>
                    </div>
                    <button
                      onClick={() => updateNotificationField('dailySales', !settings.notifications.dailySales)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                        settings.notifications.dailySales ? 'bg-emerald-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white ${
                        settings.notifications.dailySales ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">Allow Sale of Negative Stock</h3>
                      <p className="text-sm text-gray-500">Allow sales even when product stock is 0 or negative</p>
                    </div>
                    <button
                      onClick={() => updateNotificationField('allowNegativeStock', !settings.notifications.allowNegativeStock)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                        settings.notifications.allowNegativeStock ? 'bg-emerald-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white ${
                        settings.notifications.allowNegativeStock ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">Dark Mode</h3>
                      <p className="text-sm text-gray-500">Use dark theme for the interface</p>
                    </div>
                    <button
                      onClick={() => updateAppearanceField('darkMode', !settings.appearance.darkMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                        settings.appearance.darkMode ? 'bg-emerald-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white ${
                        settings.appearance.darkMode ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color Scheme
                    </label>
                    <div className="flex gap-3">
                      {['emerald', 'blue', 'purple', 'orange'].map((color) => (
                        <button
                          key={color}
                          onClick={() => updateAppearanceField('colorScheme', color)}
                          className={`w-10 h-10 rounded-lg ${
                            color === 'emerald' ? 'bg-emerald-500' :
                            color === 'blue' ? 'bg-blue-500' :
                            color === 'purple' ? 'bg-purple-500' : 'bg-orange-500'
                          } ${settings.appearance.colorScheme === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Change Password</h3>
                    <p className="text-sm text-gray-500 mb-4">Update your account password</p>
                    <Button variant="outline" size="sm">
                      Change Password
                    </Button>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-500 mb-4">Add an extra layer of security</p>
                    <Button variant="outline" size="sm">
                      Enable 2FA
                    </Button>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Active Sessions</h3>
                    <p className="text-sm text-gray-500 mb-4">Manage your active login sessions</p>
                    <Button variant="outline" size="sm" onClick={() => { fetchSessions(); setSessionsModalOpen(true); }}>
                      View Sessions
                    </Button>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-medium text-gray-900 mb-2">Setup Wizard</h3>
                    <p className="text-sm text-gray-500 mb-4">Re-run the business setup wizard</p>
                    <Button variant="outline" size="sm" onClick={handleRunOnboarding}>
                      <Settings2 className="w-4 h-4 mr-1" />
                      Run Setup Wizard
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'financialYear' && (
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <h3 className="font-medium text-gray-900 mb-2">Current Financial Year</h3>
                    <p className="text-2xl font-bold text-emerald-600">{settings.financialYear.currentFinancialYear}</p>
                    <p className="text-sm text-gray-500 mt-1">Invoice and cash sale numbers include this year</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Financial Year Start Month</label>
                    <select
                      value={settings.financialYear.startMonth}
                      onChange={(e) => updateFinancialYearField('startMonth', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value={1}>January</option>
                      <option value={2}>February</option>
                      <option value={3}>March</option>
                      <option value={4}>April</option>
                      <option value={5}>May</option>
                      <option value={6}>June</option>
                      <option value={7}>July</option>
                      <option value={8}>August</option>
                      <option value={9}>September</option>
                      <option value={10}>October</option>
                      <option value={11}>November</option>
                      <option value={12}>December</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Month when your financial year begins</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Prefix</label>
                    <Input
                      value={settings.financialYear.invoicePrefix}
                      onChange={(e) => updateFinancialYearField('invoicePrefix', e.target.value)}
                      placeholder="INV"
                    />
                    <p className="text-xs text-gray-500 mt-1">Prefix for account/credit sale invoices (e.g., INV-2025-2026-00001)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cash Sale Prefix</label>
                    <Input
                      value={settings.financialYear.cashSalePrefix}
                      onChange={(e) => updateFinancialYearField('cashSalePrefix', e.target.value)}
                      placeholder="CSH"
                    />
                    <p className="text-xs text-gray-500 mt-1">Prefix for cash sales (e.g., CSH-2025-2026-00001)</p>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <h3 className="font-medium text-amber-800 mb-2">Year Transition</h3>
                    <p className="text-sm text-amber-700">
                      When the financial year changes, invoice and cash sale numbers will automatically reset to 00001 for the new year.
                      A system log entry will be created to track the year transition.
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Numbering Format Examples</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Invoice:</span>
                        <span className="font-mono text-gray-900">{settings.financialYear.invoicePrefix}{settings.financialYear.currentFinancialYear.replace('-', '').slice(-4)}-00001</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cash Sale:</span>
                        <span className="font-mono text-gray-900">{settings.financialYear.cashSalePrefix}{settings.financialYear.currentFinancialYear.replace('-', '').slice(-4)}-00001</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Sessions Modal */}
      <Modal isOpen={sessionsModalOpen} onClose={() => setSessionsModalOpen(false)} title="Active Sessions" size="lg">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {sessions.filter(s => s.isActive).length} active session(s)
            </p>
            <Button variant="outline" size="sm" onClick={handleRevokeAllSessions} className="text-red-600 border-red-300 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-1" />
              Revoke All
            </Button>
          </div>

          {sessionsLoading ? (
            <div className="flex justify-center py-8">
              <div className="spinner" />
            </div>
          ) : sessionsError ? (
            <div className="text-center py-8 text-red-600">
              {sessionsError}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No sessions found
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {sessions.map((session: any) => (
                <div key={session._id} className={`p-3 rounded-lg border ${session.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {session.deviceInfo?.includes('Mobile') || session.userAgent?.includes('Mobile') ? (
                          <Smartphone className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Monitor className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="font-medium text-sm">{session.userName}</span>
                        {!session.isActive && (
                          <span className="text-xs text-gray-400">(Revoked)</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{session.deviceInfo || session.userAgent?.substring(0, 50) || 'Unknown device'}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <Globe className="w-3 h-3" />
                        <span>{session.ipAddress || 'Unknown IP'}</span>
                        <span>•</span>
                        <span>Last active: {new Date(session.lastActivity).toLocaleString()}</span>
                      </div>
                    </div>
                    {session.isActive && (
                      <Button variant="outline" size="sm" onClick={() => handleRevokeSession(session._id)} className="text-red-600 hover:bg-red-50">
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}