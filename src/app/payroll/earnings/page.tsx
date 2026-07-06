'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';

interface Earning {
  _id: string;
  name: string;
  description?: string;
  code: string;
  category: string;
  type: string;
  percentageOf?: string;
  fixedAmount?: number;
  formula?: string;
  isPercentage: boolean;
  rate?: number;
  isTaxable: boolean;
  isPensionable: boolean;
  isActive: boolean;
  appliesToEmploymentTypes: string[];
  branch?: { name: string; code: string } | null;
}

const EARNING_TABS = [
  { value: '', label: 'All' },
  { value: 'fixed', label: 'Fixed Earnings' },
  { value: 'variable', label: 'Variable Earnings' },
  { value: 'commission', label: 'Commission' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'allowance', label: 'Allowances' },
  { value: 'overtime', label: 'Overtime' },
  { value: 'leave_pay', label: 'Leave Pay' },
];

const CATEGORY_OPTIONS = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'variable', label: 'Variable' },
  { value: 'overtime', label: 'Overtime' },
  { value: 'commission', label: 'Commission' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'leave_pay', label: 'Leave Pay' },
  { value: 'holiday_pay', label: 'Holiday Pay' },
  { value: 'night_shift', label: 'Night Shift' },
  { value: 'allowance', label: 'Allowance' },
];

const TYPE_OPTIONS = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed_amount', label: 'Fixed Amount' },
  { value: 'formula', label: 'Formula' },
  { value: 'formula_based', label: 'Formula Based' },
];

const PERCENTAGE_OF_OPTIONS = [
  { value: 'basic_salary', label: 'Basic Salary' },
  { value: 'gross_salary', label: 'Gross Salary' },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
  { value: 'casual', label: 'Casual' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'intern', label: 'Intern' },
  { value: 'consultant', label: 'Consultant' },
];

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

export default function PayrollEarningsPage() {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEarning, setSelectedEarning] = useState<Earning | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    category: 'fixed',
    type: 'percentage',
    percentageOf: 'basic_salary',
    fixedAmount: 0,
    formula: '',
    isPercentage: false,
    rate: 0,
    isTaxable: true,
    isPensionable: false,
    appliesToEmploymentTypes: '',
  });

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '20');
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (categoryFilter) params.set('category', categoryFilter);

      const response = await fetch(`/api/payroll/earnings?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setEarnings(result.earnings || []);
        setTotalPages(result.pagination?.pages || 1);
      } else {
        setError(result.error || 'Failed to fetch earnings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, [currentPage, categoryFilter, searchQuery]);

  const openAddModal = () => {
    setSelectedEarning(null);
    setFormData({
      name: '',
      description: '',
      code: '',
      category: 'fixed',
      type: 'percentage',
      percentageOf: 'basic_salary',
      fixedAmount: 0,
      formula: '',
      isPercentage: false,
      rate: 0,
      isTaxable: true,
      isPensionable: false,
      appliesToEmploymentTypes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (earning: Earning) => {
    setSelectedEarning(earning);
    setFormData({
      name: earning.name,
      description: earning.description || '',
      code: earning.code,
      category: earning.category,
      type: earning.type,
      percentageOf: earning.percentageOf || 'basic_salary',
      fixedAmount: earning.fixedAmount || 0,
      formula: earning.formula || '',
      isPercentage: earning.isPercentage,
      rate: earning.rate || 0,
      isTaxable: earning.isTaxable,
      isPensionable: earning.isPensionable,
      appliesToEmploymentTypes: earning.appliesToEmploymentTypes?.join(', ') || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const url = selectedEarning ? `/api/payroll/earnings/${selectedEarning._id}` : '/api/payroll/earnings';
      const method = selectedEarning ? 'PUT' : 'POST';
      const body = selectedEarning
        ? { ...formData, appliesToEmploymentTypes: formData.appliesToEmploymentTypes.split(',').map((s) => s.trim()).filter(Boolean) }
        : { ...formData, appliesToEmploymentTypes: formData.appliesToEmploymentTypes.split(',').map((s) => s.trim()).filter(Boolean) };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.success) {
        setShowModal(false);
        fetchEarnings();
      } else {
        setError(result.error || 'Failed to save earning');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEarning) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/payroll/earnings/${selectedEarning._id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setShowDeleteModal(false);
        setSelectedEarning(null);
        fetchEarnings();
      } else {
        setError(result.error || 'Failed to delete earning');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    const classes: Record<string, string> = {
      fixed: 'badge-success',
      variable: 'badge-info',
      overtime: 'badge-warning',
      commission: 'badge-purple',
      bonus: 'badge-yellow',
      leave_pay: 'badge-blue',
      holiday_pay: 'badge-emerald',
      night_shift: 'badge-gray',
      allowance: 'badge-success',
    };
    return <span className={`badge ${classes[category] || 'badge-gray'}`}>{category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>;
  };

  const getTypeBadge = (type: string) => {
    const classes: Record<string, string> = {
      percentage: 'badge-info',
      fixed_amount: 'badge-success',
      formula: 'badge-warning',
      formula_based: 'badge-purple',
    };
    return <span className={`badge ${classes[type] || 'badge-gray'}`}>{type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>;
  };

  const fixedCount = earnings.filter((e) => e.category === 'fixed').length;
  const variableCount = earnings.filter((e) => e.category === 'variable').length;
  const commissionCount = earnings.filter((e) => e.category === 'commission').length;
  const taxableCount = earnings.filter((e) => e.isTaxable).length;

  return (
    <div>
      <Header title="Earnings" subtitle="Manage earnings types" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchEarnings}>Retry</Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Plus className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total Earnings</p><p className="text-lg font-bold text-gray-900">{earnings.length || 0}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><Plus className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-sm text-gray-500">Fixed Types</p><p className="text-lg font-bold text-gray-900">{fixedCount}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><Plus className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-sm text-gray-500">Variable Types</p><p className="text-lg font-bold text-gray-900">{variableCount}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg"><Plus className="w-5 h-5 text-yellow-600" /></div>
            <div><p className="text-sm text-gray-500">Commission Types</p><p className="text-lg font-bold text-gray-900">{commissionCount}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><Plus className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-sm text-gray-500">Taxable Types</p><p className="text-lg font-bold text-gray-900">{taxableCount}</p></div>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name or code..." className="w-64" />
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} options={EARNING_TABS} className="w-40" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchEarnings} className="gap-2" disabled={loading}><RefreshCw className="w-4 h-4" /> Refresh</Button>
            <Button onClick={openAddModal} className="gap-2"><Plus className="w-4 h-4" /> Add Earning</Button>
          </div>
        </div>

        <Card>
          <CardHeader title={`Showing ${earnings.length} of ${totalPages * 20} earnings`} />
          <DataTable
            columns={[
              { key: 'name', header: 'Name', className: 'font-medium' },
              { key: 'code', header: 'Code' },
              {
                key: 'category', header: 'Category',
                render: (item: Earning) => getCategoryBadge(item.category),
              },
              {
                key: 'type', header: 'Type',
                render: (item: Earning) => getTypeBadge(item.type),
              },
              {
                key: 'isPercentage', header: 'Is Percentage',
                render: (item: Earning) => <span className="text-sm">{item.isPercentage ? 'Yes' : 'No'}</span>,
              },
              {
                key: 'isTaxable', header: 'Is Taxable',
                render: (item: Earning) => <span className="text-sm">{item.isTaxable ? 'Yes' : 'No'}</span>,
              },
              {
                key: 'appliesToEmploymentTypes', header: 'Employment Types',
                render: (item: Earning) => (
                  <span className="text-sm text-gray-600 truncate block max-w-[200px]" title={item.appliesToEmploymentTypes?.join(', ') || '-'}>
                    {item.appliesToEmploymentTypes?.slice(0, 2).join(', ') || '-'}{item.appliesToEmploymentTypes?.length > 2 ? '...' : ''}
                  </span>
                ),
              },
              {
                key: 'actions', header: 'Actions',
                render: (item: Earning) => (
                  <div className="flex gap-1">
                    <button onClick={() => openEditModal(item)} disabled={saving} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Edit"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { setSelectedEarning(item); setShowDeleteModal(true); }} disabled={saving} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ),
              },
            ]}
            data={earnings}
            keyExtractor={(item) => item._id}
            loading={loading}
            pagination={{ page: currentPage, total: totalPages, pages: totalPages, onPageChange: setCurrentPage }}
            emptyMessage="No earnings found"
          />
        </Card>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedEarning ? 'Edit Earning' : 'Add Earning'} size="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input label="Code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
            <Select label="Category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} options={CATEGORY_OPTIONS} />
            <Select label="Type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} options={TYPE_OPTIONS} />
            <Select label="Percentage Of" value={formData.percentageOf} onChange={(e) => setFormData({ ...formData, percentageOf: e.target.value })} options={PERCENTAGE_OF_OPTIONS} />
            <Input label="Fixed Amount" value={formData.fixedAmount.toString()} onChange={(e) => setFormData({ ...formData, fixedAmount: parseFloat(e.target.value) || 0 })} type="number" step="0.01" />
            <Input label="Rate" value={formData.rate.toString()} onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })} type="number" step="0.01" />
            <Select label="Is Percentage" value={formData.isPercentage.toString()} onChange={(e) => setFormData({ ...formData, isPercentage: e.target.value === 'true' })} options={BOOLEAN_OPTIONS} />
            <Select label="Is Taxable" value={formData.isTaxable.toString()} onChange={(e) => setFormData({ ...formData, isTaxable: e.target.value === 'true' })} options={BOOLEAN_OPTIONS} />
            <Select label="Is Pensionable" value={formData.isPensionable.toString()} onChange={(e) => setFormData({ ...formData, isPensionable: e.target.value === 'true' })} options={BOOLEAN_OPTIONS} />
            <Input label="Applies To Employment Types (comma separated)" value={formData.appliesToEmploymentTypes} onChange={(e) => setFormData({ ...formData, appliesToEmploymentTypes: e.target.value })} placeholder="permanent, contract, casual" className="md:col-span-2" />
            <Textarea label="Formula" value={formData.formula} onChange={(e) => setFormData({ ...formData, formula: e.target.value })} className="md:col-span-2" />
            <Textarea label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="md:col-span-2" />
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>{selectedEarning ? 'Update' : 'Create'}</Button>
          </div>
        </Modal>

        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Earning" size="sm">
          <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this earning? This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={saving}>Delete</Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
