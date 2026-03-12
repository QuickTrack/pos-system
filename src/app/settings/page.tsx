'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Save, Building2, Receipt, Bell, Shield, Palette } from 'lucide-react';

interface Settings {
  business: {
    name: string;
    email: string;
    phone: string;
    address: string;
    taxNumber: string;
    currency: string;
  };
  tax: {
    enabled: boolean;
    rate: number;
    includeInPrice: boolean;
  };
  notifications: {
    email: boolean;
    lowStock: boolean;
    dailySales: boolean;
  };
  appearance: {
    darkMode: boolean;
    colorScheme: string;
  };
}

const TABS = [
  { id: 'business', label: 'Business', icon: Building2 },
  { id: 'tax', label: 'Tax', icon: Receipt },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('business');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [settings, setSettings] = useState<Settings>({
    business: {
      name: '',
      email: '',
      phone: '',
      address: '',
      taxNumber: '',
      currency: 'KES',
    },
    tax: {
      enabled: true,
      rate: 16,
      includeInPrice: false,
    },
    notifications: {
      email: true,
      lowStock: true,
      dailySales: false,
    },
    appearance: {
      darkMode: false,
      colorScheme: 'emerald',
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          // Map flat database fields to nested frontend structure
          setSettings({
            business: {
              name: data.settings.businessName || '',
              email: data.settings.email || '',
              phone: data.settings.phone || '',
              address: data.settings.address || '',
              taxNumber: data.settings.kraPin || '',
              currency: 'KES',
            },
            tax: {
              enabled: data.settings.enableTax ?? true,
              rate: data.settings.taxRate || 16,
              includeInPrice: false,
            },
            notifications: {
              email: true,
              lowStock: data.settings.lowStockAlert ?? true,
              dailySales: false,
            },
            appearance: {
              darkMode: false,
              colorScheme: 'emerald',
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
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
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

  const updateBusinessField = (field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      business: { ...prev.business, [field]: value },
    }));
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
                    <Button variant="outline" size="sm">
                      View Sessions
                    </Button>
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
    </div>
  );
}