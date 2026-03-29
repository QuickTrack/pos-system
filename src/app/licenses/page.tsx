'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { 
  Key, 
  Plus, 
  Search, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Copy,
  Trash2,
  Shield,
  MoreVertical,
  ArrowUpCircle,
  ArrowDownCircle,
  PauseCircle,
  PlayCircle
} from 'lucide-react';

interface License {
  _id: string;
  licenseKey: string;
  businessName: string;
  email: string;
  phone?: string;
  activationDate?: string;
  expirationDate: string;
  status: 'active' | 'expired' | 'suspended';
  licenseType: 'trial' | 'annual' | 'lifetime';
  maxUsers: number;
  maxBranches: number;
  features: string[];
  createdAt: string;
}

export default function LicensesPage() {
  const router = useRouter();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeForm, setUpgradeForm] = useState({
    newLicenseType: 'annual',
    maxUsers: 10,
    maxBranches: 5,
  });
  // Downgrade state
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [downgradeForm, setDowngradeForm] = useState({
    newLicenseType: 'trial',
    maxUsers: 10,
    maxBranches: 5,
  });
  const [downgrading, setDowngrading] = useState(false);
  // Suspend state
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);
  // Restore state
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoring, setRestoring] = useState(false);
  
  // Regeneration state
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showBulkRegenerateModal, setShowBulkRegenerateModal] = useState(false);
  const [showRegenerationHistoryModal, setShowRegenerationHistoryModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedLicenses, setSelectedLicenses] = useState<string[]>([]);
  const [regenerateForm, setRegenerateForm] = useState({
    reason: '',
    newExpirationDate: '',
    features: [] as string[],
    maxUsers: 0,
    maxBranches: 0,
    notifyUsers: false,
  });
  const [regenerationHistory, setRegenerationHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleDowngradeClick = (license: License) => {
    setSelectedLicense(license);
    setDowngradeForm({
      newLicenseType: license.licenseType === 'lifetime' ? 'annual' : 'trial',
      maxUsers: license.maxUsers,
      maxBranches: license.maxBranches,
    });
    setShowDowngradeModal(true);
  };

  const handleDowngrade = async () => {
    if (!selectedLicense) return;
    setDowngrading(true);

    try {
      const response = await fetch('/api/licenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseId: selectedLicense._id,
          action: 'downgrade',
          ...downgradeForm,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update localStorage for real-time sync
        if (data.license) {
          localStorage.setItem('pos-license', JSON.stringify(data.license));
        }
        alert(`License downgraded successfully!\n\nNew Type: ${data.license.licenseType}`);
        setShowDowngradeModal(false);
        fetchLicenses();
      } else {
        alert(data.error || 'Failed to downgrade license');
      }
    } catch (error) {
      alert('Failed to downgrade license');
    } finally {
      setDowngrading(false);
    }
  };

  const handleSuspendClick = (license: License) => {
    setSelectedLicense(license);
    setSuspendReason('');
    setShowSuspendModal(true);
  };

  const handleSuspend = async () => {
    if (!selectedLicense) return;
    setSuspending(true);

    try {
      const response = await fetch('/api/licenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseId: selectedLicense._id,
          action: 'suspend',
          suspensionReason: suspendReason,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('License suspended successfully!');
        setShowSuspendModal(false);
        fetchLicenses();
      } else {
        alert(data.error || 'Failed to suspend license');
      }
    } catch (error) {
      alert('Failed to suspend license');
    } finally {
      setSuspending(false);
    }
  };

  const handleRestoreClick = (license: License) => {
    setSelectedLicense(license);
    setShowRestoreModal(true);
  };

  const handleRestore = async () => {
    if (!selectedLicense) return;
    setRestoring(true);

    try {
      const response = await fetch('/api/licenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseId: selectedLicense._id,
          action: 'restore',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update localStorage for real-time sync
        if (data.license) {
          localStorage.setItem('pos-license', JSON.stringify(data.license));
        }
        alert('License restored successfully!');
        setShowRestoreModal(false);
        fetchLicenses();
      } else {
        alert(data.error || 'Failed to restore license');
      }
    } catch (error) {
      alert('Failed to restore license');
    } finally {
      setRestoring(false);
    }
  };

  const handleRegenerateClick = (license: License) => {
    setSelectedLicense(license);
    setRegenerateForm({
      reason: '',
      newExpirationDate: '',
      features: license.features,
      maxUsers: license.maxUsers,
      maxBranches: license.maxBranches,
      notifyUsers: false,
    });
    setShowRegenerateModal(true);
  };

  const handleRegenerate = async () => {
    if (!selectedLicense) return;
    setRegenerating(true);

    try {
      const response = await fetch('/api/licenses/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseIds: [selectedLicense._id],
          ...regenerateForm,
        }),
      });

      const data = await response.json();

      if (response.ok && data.results.success.length > 0) {
        const result = data.results.success[0];
        await navigator.clipboard.writeText(result.newKey);
        alert(`License regenerated successfully!\n\nNew License Key: ${result.newKey}\nPrevious Key: ${result.previousKey}\n\nNew key copied to clipboard!`);
        setShowRegenerateModal(false);
        fetchLicenses();
      } else {
        const errorMsg = data.results?.failed?.[0]?.error || data.error || 'Failed to regenerate license';
        alert(errorMsg);
      }
    } catch (error) {
      alert('Failed to regenerate license');
    } finally {
      setRegenerating(false);
    }
  };

  const handleBulkRegenerateClick = () => {
    if (selectedLicenses.length === 0) {
      alert('Please select at least one license to regenerate');
      return;
    }
    setRegenerateForm({
      reason: '',
      newExpirationDate: '',
      features: [],
      maxUsers: 0,
      maxBranches: 0,
      notifyUsers: false,
    });
    setShowBulkRegenerateModal(true);
  };

  const handleBulkRegenerate = async () => {
    if (selectedLicenses.length === 0) return;
    setRegenerating(true);

    try {
      const response = await fetch('/api/licenses/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseIds: selectedLicenses,
          ...regenerateForm,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`${data.message}\n\nSuccess: ${data.results.success.length}\nFailed: ${data.results.failed.length}`);
        setShowBulkRegenerateModal(false);
        setSelectedLicenses([]);
        fetchLicenses();
      } else {
        alert(data.error || 'Failed to regenerate licenses');
      }
    } catch (error) {
      alert('Failed to regenerate licenses');
    } finally {
      setRegenerating(false);
    }
  };

  const handleViewRegenerationHistory = async (license: License) => {
    setSelectedLicense(license);
    setLoadingHistory(true);
    setShowRegenerationHistoryModal(true);

    try {
      const response = await fetch(`/api/licenses/regenerate?licenseId=${license._id}`);
      const data = await response.json();
      
      if (response.ok) {
        setRegenerationHistory(data.regenerationHistory || []);
      } else {
        alert(data.error || 'Failed to fetch regeneration history');
      }
    } catch (error) {
      alert('Failed to fetch regeneration history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleLicenseSelection = (licenseId: string) => {
    setSelectedLicenses(prev => 
      prev.includes(licenseId) 
        ? prev.filter(id => id !== licenseId)
        : [...prev, licenseId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLicenses.length === filteredLicenses.length) {
      setSelectedLicenses([]);
    } else {
      setSelectedLicenses(filteredLicenses.map(l => l._id));
    }
  };
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    phone: '',
    licenseType: 'annual',
    maxUsers: 10,
    maxBranches: 5,
  });

  useEffect(() => {
    fetchLicenses();
  }, [statusFilter]);

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const url = statusFilter 
        ? `/api/licenses?status=${statusFilter}` 
        : '/api/licenses';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.licenses) {
        setLicenses(data.licenses);
      }
    } catch (error) {
      console.error('Failed to fetch licenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);

    try {
      const response = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Copy license key to clipboard
        await navigator.clipboard.writeText(data.license.licenseKey);
        
        alert(`License generated and copied to clipboard!\n\nLicense Key: ${data.license.licenseKey}\nExpires: ${new Date(data.license.expirationDate).toLocaleDateString()}`);
        
        setShowModal(false);
        setFormData({
          businessName: '',
          email: '',
          phone: '',
          licenseType: 'annual',
          maxUsers: 10,
          maxBranches: 5,
        });
        
        fetchLicenses();
      } else {
        alert(data.error || 'Failed to generate license');
      }
    } catch (error) {
      alert('Failed to generate license');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const handleDownloadLicenseFile = (license: License) => {
    const licenseContent = [
      '=========================================',
      '           LICENSE FILE',
      '=========================================',
      '',
      `License Key: ${license.licenseKey}`,
      `Business Name: ${license.businessName}`,
      `Email: ${license.email}`,
      `Phone: ${license.phone || 'N/A'}`,
      `License Type: ${license.licenseType}`,
      `Status: ${license.status}`,
      `Activation Date: ${license.activationDate ? new Date(license.activationDate).toLocaleDateString() : 'Not activated'}`,
      `Expiration Date: ${license.expirationDate ? new Date(license.expirationDate).toLocaleDateString() : 'N/A'}`,
      `Max Users: ${license.maxUsers}`,
      `Max Branches: ${license.maxBranches}`,
      `Features: ${license.features.join(', ') || 'None'}`,
      `Created: ${new Date(license.createdAt).toLocaleDateString()}`,
      '',
      '=========================================',
      'This license file was generated by the POS System.',
      'Please keep this file secure and do not share it.',
      '=========================================',
    ].join('\n');

    const blob = new Blob([licenseContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'license.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUpgradeClick = (license: License) => {
    setSelectedLicense(license);
    setUpgradeForm({
      newLicenseType: 'annual',
      maxUsers: license.maxUsers,
      maxBranches: license.maxBranches,
    });
    setShowUpgradeModal(true);
  };

  const handleUpgrade = async () => {
    if (!selectedLicense) return;
    setUpgrading(true);

    try {
      const response = await fetch('/api/licenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseId: selectedLicense._id,
          ...upgradeForm,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update localStorage with the new license data for real-time sync
        localStorage.setItem('pos-license', JSON.stringify(data.license));
        
        alert(`License upgraded successfully!\n\nNew License Key: ${data.license.licenseKey}\nType: ${data.license.licenseType}\nExpires: ${new Date(data.license.expirationDate).toLocaleDateString()}`);
        setShowUpgradeModal(false);
        fetchLicenses();
      } else {
        alert(data.error || 'Failed to upgrade license');
      }
    } catch (error) {
      alert('Failed to upgrade license');
    } finally {
      setUpgrading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'suspended':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getDaysRemaining = (expirationDate: string) => {
    const now = new Date();
    const exp = new Date(expirationDate);
    const diff = exp.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const filteredLicenses = licenses.filter(license => 
    license.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    license.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    license.licenseKey.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">License Management</h1>
          <p className="text-gray-500">Generate and manage customer licenses</p>
        </div>
        <div className="flex gap-3">
          {selectedLicenses.length > 0 && (
            <Button variant="outline" onClick={handleBulkRegenerateClick}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Selected ({selectedLicenses.length})
            </Button>
          )}
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Generate License
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by business name, email, or license key..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
        </select>
        <Button variant="outline" onClick={fetchLicenses}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* License List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">Loading licenses...</p>
            </div>
          ) : filteredLicenses.length === 0 ? (
            <div className="p-8 text-center">
              <Key className="w-12 h-12 mx-auto text-gray-300" />
              <p className="text-gray-500 mt-2">No licenses found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                      <input
                        type="checkbox"
                        checked={selectedLicenses.length === filteredLicenses.length && filteredLicenses.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">License Key</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Business</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Email</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Type</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Expires</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Days Left</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLicenses.map((license) => {
                    const daysRemaining = license.licenseType === 'lifetime' 
                      ? '∞' 
                      : getDaysRemaining(license.expirationDate);
                    
                    return (
                      <tr key={license._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedLicenses.includes(license._id)}
                            onChange={() => toggleLicenseSelection(license._id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                              {license.licenseKey.slice(0, 8)}...
                            </code>
                            <button
                              onClick={() => copyToClipboard(license.licenseKey)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{license.businessName}</td>
                        <td className="px-4 py-3 text-gray-600">{license.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            license.licenseType === 'trial' 
                              ? 'bg-purple-100 text-purple-700'
                              : license.licenseType === 'lifetime'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}>
                            {license.licenseType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(license.status)}
                            <span className="capitalize">{license.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {license.expirationDate 
                            ? new Date(license.expirationDate).toLocaleDateString()
                            : 'Not activated'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${
                            daysRemaining === '∞'
                              ? 'text-amber-600'
                              : daysRemaining < 0 
                                ? 'text-red-600'
                                : daysRemaining < 30 
                                  ? 'text-amber-600'
                                  : 'text-green-600'
                          }`}>
                            {daysRemaining === '∞' ? '∞' : daysRemaining}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyToClipboard(license.licenseKey)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Copy license key"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            {license.licenseType === 'trial' && (
                              <button
                                onClick={() => handleUpgradeClick(license)}
                                className="p-1 text-purple-600 hover:text-purple-800"
                                title="Upgrade to paid license"
                              >
                                <ArrowUpCircle className="w-4 h-4" />
                              </button>
                            )}
                            {license.licenseType !== 'trial' && license.status !== 'suspended' && (
                              <button
                                onClick={() => handleDowngradeClick(license)}
                                className="p-1 text-amber-600 hover:text-amber-800"
                                title="Downgrade license"
                              >
                                <ArrowDownCircle className="w-4 h-4" />
                              </button>
                            )}
                            {license.status === 'suspended' ? (
                              <button
                                onClick={() => handleRestoreClick(license)}
                                className="p-1 text-green-600 hover:text-green-800"
                                title="Restore license"
                              >
                                <PlayCircle className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSuspendClick(license)}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Suspend license"
                              >
                                <PauseCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleRegenerateClick(license)}
                              className="p-1 text-blue-600 hover:text-blue-800"
                              title="Regenerate license key"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleViewRegenerationHistory(license)}
                              className="p-1 text-gray-600 hover:text-gray-800"
                              title="View regeneration history"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadLicenseFile(license)}
                              className="p-1 text-emerald-600 hover:text-emerald-800"
                              title="Download license file"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate License Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Generate New License</h2>
            </div>
            <form onSubmit={handleGenerateLicense}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name *
                  </label>
                  <Input
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="Business Name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="business@example.com"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+254 700 000 000"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      License Type
                    </label>
                    <select
                      value={formData.licenseType}
                      onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="trial">Trial (14 days)</option>
                      <option value="annual">Annual</option>
                      <option value="lifetime">Lifetime</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Users
                    </label>
                    <Input
                      type="number"
                      value={formData.maxUsers}
                      onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) })}
                      min={1}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Branches
                    </label>
                    <Input
                      type="number"
                      value={formData.maxBranches}
                      onChange={(e) => setFormData({ ...formData, maxBranches: parseInt(e.target.value) })}
                      min={1}
                    />
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={generating || !formData.businessName || !formData.email}>
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade License Modal */}
      {showUpgradeModal && selectedLicense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Upgrade Trial License</h2>
              <p className="text-sm text-gray-500 mt-1">
                Upgrading: {selectedLicense.businessName}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Plan
                </label>
                <select
                  value={upgradeForm.newLicenseType}
                  onChange={(e) => setUpgradeForm({ ...upgradeForm, newLicenseType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="annual">Annual ($199/year)</option>
                  <option value="lifetime">Lifetime ($499 one-time)</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Users
                  </label>
                  <Input
                    type="number"
                    value={upgradeForm.maxUsers}
                    onChange={(e) => setUpgradeForm({ ...upgradeForm, maxUsers: parseInt(e.target.value) })}
                    min={1}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Branches
                  </label>
                  <Input
                    type="number"
                    value={upgradeForm.maxBranches}
                    onChange={(e) => setUpgradeForm({ ...upgradeForm, maxBranches: parseInt(e.target.value) })}
                    min={1}
                  />
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium text-purple-900">Upgrade Summary</h3>
                <p className="text-sm text-purple-700 mt-1">
                  Current: Trial (14 days)<br />
                  New: {upgradeForm.newLicenseType === 'annual' ? 'Annual' : 'Lifetime'}
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <Button type="button" variant="outline" onClick={() => setShowUpgradeModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpgrade} 
                disabled={upgrading}
              >
                {upgrading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Upgrading...
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                    Upgrade License
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Downgrade License Modal */}
      {showDowngradeModal && selectedLicense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Downgrade License</h2>
              <p className="text-sm text-gray-500 mt-1">
                Downgrading: {selectedLicense.businessName}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Plan
                </label>
                <select
                  value={downgradeForm.newLicenseType}
                  onChange={(e) => setDowngradeForm({ ...downgradeForm, newLicenseType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {selectedLicense.licenseType === 'lifetime' && (
                    <option value="annual">Annual ($199/year)</option>
                  )}
                  <option value="trial">Trial (14 days free)</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Users
                  </label>
                  <Input
                    type="number"
                    value={downgradeForm.maxUsers}
                    onChange={(e) => setDowngradeForm({ ...downgradeForm, maxUsers: parseInt(e.target.value) })}
                    min={1}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Branches
                  </label>
                  <Input
                    type="number"
                    value={downgradeForm.maxBranches}
                    onChange={(e) => setDowngradeForm({ ...downgradeForm, maxBranches: parseInt(e.target.value) })}
                    min={1}
                  />
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-lg">
                <h3 className="font-medium text-amber-900">Downgrade Warning</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Current: {selectedLicense.licenseType === 'lifetime' ? 'Lifetime' : 'Annual'}<br />
                  New: {downgradeForm.newLicenseType === 'annual' ? 'Annual' : 'Trial'}
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <Button type="button" variant="outline" onClick={() => setShowDowngradeModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleDowngrade} 
                disabled={downgrading}
              >
                {downgrading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Downgrading...
                  </>
                ) : (
                  <>
                    <ArrowDownCircle className="w-4 h-4 mr-2" />
                    Downgrade License
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend License Modal */}
      {showSuspendModal && selectedLicense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-red-600">Suspend License</h2>
              <p className="text-sm text-gray-500 mt-1">
                Suspending: {selectedLicense.businessName}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Suspension (optional)
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Enter reason for suspension..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-medium text-red-900">Warning</h3>
                <p className="text-sm text-red-700 mt-1">
                  This will immediately restrict access for this license. The user will not be able to log in until the license is restored.
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <Button type="button" variant="outline" onClick={() => setShowSuspendModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSuspend} 
                disabled={suspending}
                className="bg-red-600 hover:bg-red-700"
              >
                {suspending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Suspending...
                  </>
                ) : (
                  <>
                    <PauseCircle className="w-4 h-4 mr-2" />
                    Suspend License
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Restore License Modal */}
      {showRestoreModal && selectedLicense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-green-600">Restore License</h2>
              <p className="text-sm text-gray-500 mt-1">
                Restoring: {selectedLicense.businessName}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-900">Restore Confirmation</h3>
                <p className="text-sm text-green-700 mt-1">
                  This will reactivate the license and restore access for this user.
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <Button type="button" variant="outline" onClick={() => setShowRestoreModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRestore} 
                disabled={restoring}
                className="bg-green-600 hover:bg-green-700"
              >
                {restoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Restore License
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate License Modal */}
      {showRegenerateModal && selectedLicense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-blue-600">Regenerate License Key</h2>
              <p className="text-sm text-gray-500 mt-1">
                Regenerating: {selectedLicense.businessName}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Regeneration (optional)
                </label>
                <textarea
                  value={regenerateForm.reason}
                  onChange={(e) => setRegenerateForm({ ...regenerateForm, reason: e.target.value })}
                  placeholder="Enter reason for regeneration..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Expiration Date (optional)
                </label>
                <Input
                  type="date"
                  value={regenerateForm.newExpirationDate}
                  onChange={(e) => setRegenerateForm({ ...regenerateForm, newExpirationDate: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Users
                  </label>
                  <Input
                    type="number"
                    value={regenerateForm.maxUsers}
                    onChange={(e) => setRegenerateForm({ ...regenerateForm, maxUsers: parseInt(e.target.value) })}
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Branches
                  </label>
                  <Input
                    type="number"
                    value={regenerateForm.maxBranches}
                    onChange={(e) => setRegenerateForm({ ...regenerateForm, maxBranches: parseInt(e.target.value) })}
                    min={1}
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900">Regeneration Summary</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Current Key: {selectedLicense.licenseKey.slice(0, 8)}...<br />
                  Type: {selectedLicense.licenseType}<br />
                  Status: {selectedLicense.status}
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <Button type="button" variant="outline" onClick={() => setShowRegenerateModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRegenerate} 
                disabled={regenerating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {regenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate License
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Regenerate Modal */}
      {showBulkRegenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-blue-600">Bulk Regenerate License Keys</h2>
              <p className="text-sm text-gray-500 mt-1">
                Regenerating {selectedLicenses.length} license(s)
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Regeneration (optional)
                </label>
                <textarea
                  value={regenerateForm.reason}
                  onChange={(e) => setRegenerateForm({ ...regenerateForm, reason: e.target.value })}
                  placeholder="Enter reason for regeneration..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Expiration Date (optional)
                </label>
                <Input
                  type="date"
                  value={regenerateForm.newExpirationDate}
                  onChange={(e) => setRegenerateForm({ ...regenerateForm, newExpirationDate: e.target.value })}
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900">Bulk Regeneration</h3>
                <p className="text-sm text-blue-700 mt-1">
                  This will regenerate license keys for all selected licenses. Each license will receive a new unique key.
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <Button type="button" variant="outline" onClick={() => setShowBulkRegenerateModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleBulkRegenerate} 
                disabled={regenerating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {regenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate {selectedLicenses.length} License(s)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Regeneration History Modal */}
      {showRegenerationHistoryModal && selectedLicense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Regeneration History</h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedLicense.businessName} - {selectedLicense.licenseKey.slice(0, 8)}...
              </p>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {loadingHistory ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">Loading history...</p>
                </div>
              ) : regenerationHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="w-12 h-12 mx-auto text-gray-300" />
                  <p className="text-gray-500 mt-2">No regeneration history found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {regenerationHistory.map((entry, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-gray-500">
                            {new Date(entry.date).toLocaleString()}
                          </p>
                          <p className="font-medium mt-1">{entry.reason || 'No reason provided'}</p>
                          <p className="text-sm text-gray-600 mt-1">By: {entry.performedBy}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Previous Key</p>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                            {entry.previousKey.slice(0, 8)}...
                          </code>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-gray-500">New Key</p>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-green-100 px-2 py-1 rounded font-mono text-green-700">
                            {entry.newKey.slice(0, 8)}...
                          </code>
                          <button
                            onClick={() => navigator.clipboard.writeText(entry.newKey)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end rounded-b-xl">
              <Button variant="outline" onClick={() => setShowRegenerationHistoryModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
