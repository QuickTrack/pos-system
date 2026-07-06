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

interface Deduction {
  _id: string;
  name: string;
  description?: string;
  code: string;
  category: string;
  type: string;
  fixedAmount?: number;
  percentageOf?: string;
  formula?: string;
  tieredRates: any[];
  isPreTax: boolean;
  isTaxable: boolean;
  isActive: boolean;
  appliesToEmploymentTypes: string[];
  statutoryType?: string;
  priority: number;
  branch?: { name: string; code: string } | null;
}

const DEDUCTION_TABS = [
  { value: '', label: 'All' },
  { value: 'statutory', label: 'Statutory' },
  { value: 'company', label: 'Company' },
  { value: 'voluntary', label: 'Voluntary' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'pension', label: 'Pension' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'union', label: 'Union' },
  { value: 'loan', label: 'Loans' },
  { value: 'advance', label: 'Advances' },
];

const CATEGORY_OPTIONS = [
  { value: 'statutory', label: 'Statutory' },
  { value: 'company', label: 'Company' },
  { value: 'voluntary', label: 'Voluntary' },
  { value: 'loan', label: 'Loan' },
  { value: 'advance', label: 'Advance' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'pension', label: 'Pension' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'union', label: 'Union' },
];

const TYPE_OPTIONS = [
  { value: 'fixed_amount', label: 'Fixed Amount' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'formula', label: 'Formula' },
  { value: 'tiered', label: 'Tiered' },
];

const PERCENTAGE_OF_OPTIONS = [
  { value: 'basic_salary', label: 'Basic Salary' },
  { value: 'gross_salary', label: 'Gross Salary' },
];

const STATUTORY_TYPE_OPTIONS = [
  { value: 'paye', label: 'PAYE' },
  { value: 'nssf', label: 'NSSF' },
  { value: 'shif', label: 'SHIF' },
  { value: 'housing_levy', label: 'Housing Levy' },
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

export default function PayrollDeductionsPage() {
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDeduction, setSelectedDeduction] = useState<Deduction | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    category: 'statutory',
    type: 'percentage',
    fixedAmount: 0,
    percentageOf: 'basic_salary',
    formula: '',
    tieredRates: '',
    isPreTax: false,
    isTaxable: true,
    statutoryType: '',
    priority: 0,
    appliesToEmploymentTypes: '',
  });

  const fetchDeductions = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '20');
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (categoryFilter) params.set('category', categoryFilter);

      const response = await fetch(`/api/payroll/deductions?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setDeductions(result.deductions || []);
        setTotalPages(result.pagination?.pages || 1);
      } else {
        setError(result.error || 'Failed to fetch deductions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeductions();
  }, [currentPage, categoryFilter, searchQuery]);

  const openAddModal = () => {
    setSelectedDeduction(null);
    setFormData({
      name: '',
      description: '',
      code: '',
      category: 'statutory',
      type: 'percentage',
      fixedAmount: 0,
      percentageOf: 'basic_salary',
      formula: '',
      tieredRates: '',
      isPreTax: false,
      isTaxable: true,
      statutoryType: '',
      priority: 0,
      appliesToEmploymentTypes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (deduction: Deduction) => {
    setSelectedDeduction(deduction);
    setFormData({
      name: deduction.name,
      description: deduction.description || '',
      code: deduction.code,
      category: deduction.category,
      type: deduction.type,
      fixedAmount: deduction.fixedAmount || 0,
      percentageOf: deduction.percentageOf || 'basic_salary',
      formula: deduction.formula || '',
      tieredRates: JSON.stringify(deduction.tieredRates || []),
      isPreTax: deduction.isPreTax,
      isTaxable: deduction.isTaxable,
      statutoryType: deduction.statutoryType || '',
      priority: deduction.priority || 0,
      appliesToEmploymentTypes: deduction.appliesToEmploymentTypes?.join(', ') || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const url = selectedDeduction ? `/api/payroll/deductions/${selectedDeduction._id}` : '/api/payroll/deductions';
      const method = selectedDeduction ? 'PUT' : 'POST';
      let parsedTieredRates: any[] = [];
      try {
        parsedTieredRates = JSON.parse(formData.tieredRates || '[]');
      } catch {
        parsedTieredRates = [];
      }
      const body = selectedDeduction
        ? { ...formData, appliesToEmploymentTypes: formData.appliesToEmploymentTypes.split(',').map((s) => s.trim()).filter(Boolean), tieredRates: parsedTieredRates }
        : { ...formData, appliesToEmploymentTypes: formData.appliesToEmploymentTypes.split(',').map((s) => s.trim()).filter(Boolean), tieredRates: parsedTieredRates };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.success) {
        setShowModal(false);
        fetchDeductions();
      } else {
        setError(result.error || 'Failed to save deduction');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDeduction) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/payroll/deductions/${selectedDeduction._id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setShowDeleteModal(false);
        setSelectedDeduction(null);
        fetchDeductions();
      } else {
        setError(result.error || 'Failed to delete deduction');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    const classes: Record<string, string> = {
      statutory: 'badge-danger',
      company: 'badge-info',
      voluntary: 'badge-success',
      loan: 'badge-warning',
      advance: 'badge-yellow',
      cooperative: 'badge-purple',
      pension: 'badge-blue',
      insurance: 'badge-emerald',
      union: 'badge-gray',
    };
    return <span className={`badge ${classes[category] || 'badge-gray'}`}>{category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>;
  };

  const getTypeBadge = (type: string) => {
    const classes: Record<string, string> = {
      fixed_amount: 'badge-success',
      percentage: 'badge-info',
      formula: 'badge-warning',
      tiered: 'badge-purple',
    };
    return <span className={`badge ${classes[type] || 'badge-gray'}`}>{type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>;
  };

  const statutoryCount = deductions.filter((d) => d.category === 'statutory').length;
  const companyCount = deductions.filter((d) => d.category === 'company').length;
  const voluntaryCount = deductions.filter((d) => d.category === 'voluntary').length;
  const priorityCount = deductions.filter((d) => d.priority > 0).length;

  return (
    <div>
      <Header title="Deductions" subtitle="Manage deduction types" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDeductions}>Retry</Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Plus className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total Deductions</p><p className="text-lg font-bold text-gray-900">{deductions.length || 0}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><Plus className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-sm text-gray-500">Statutory</p><p className="text-lg font-bold text-gray-900">{statutoryCount}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><Plus className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-sm text-gray-500">Company</p><p className="text-lg font-bold text-gray-900">{companyCount}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><Plus className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-sm text-gray-500">Voluntary</p><p className="text-lg font-bold text-gray-900">{voluntaryCount}</p></div>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name or code..." className="w-64" />
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} options={DEDUCTION_TABS} className="w-40" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchDeductions} className="gap-2" disabled={loading}><RefreshCw className="w-4 h-4" /> Refresh</Button>
            <Button onClick={openAddModal} className="gap-2"><Plus className="w-4 h-4" /> Add Deduction</Button>
          </div>
        </div>

        <Card>
          <CardHeader title={`Showing ${deductions.length} of ${totalPages * 20} deductions`} />
          <DataTable
            columns={[
              { key: 'name', header: 'Name', className: 'font-medium' },
              { key: 'code', header: 'Code' },
              {
                key: 'category', header: 'Category',
                render: (item: Deduction) => getCategoryBadge(item.category),
              },
              {
                key: 'statutoryType', header: 'Statutory Type',
                render: (item: Deduction) => item.statutoryType ? <span className="text-sm">{item.statutoryType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span> : '-',
              },
              {
                key: 'type', header: 'Type',
                render: (item: Deduction) => getTypeBadge(item.type),
              },
              {
                key: 'isPreTax', header: 'Is Pre Tax',
                render: (item: Deduction) => <span className="text-sm">{item.isPreTax ? 'Yes' : 'No'}</span>,
              },
              {
                key: 'priority', header: 'Priority',
                render: (item: Deduction) => <span className="text-sm font-medium">{item.priority || 0}</span>,
              },
              {
                key: 'actions', header: 'Actions',
                render: (item: Deduction) => (
                  <div className="flex gap-1">
                    <button onClick={() => openEditModal(item)} disabled={saving} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Edit"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { setSelectedDeduction(item); setShowDeleteModal(true); }} disabled={saving} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ),
              },
            ]}
            data={deductions}
            keyExtractor={(item) => item._id}
            loading={loading}
            pagination={{ page: currentPage, total: totalPages, pages: totalPages, onPageChange: setCurrentPage }}
            emptyMessage="No deductions found"
          />
        </Card>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedDeduction ? 'Edit Deduction' : 'Add Deduction'} size="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input label="Code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
            <Select label="Category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} options={CATEGORY_OPTIONS} />
            <Select label="Type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} options={TYPE_OPTIONS} />
            <Select label="Statutory Type" value={formData.statutoryType} onChange={(e) => setFormData({ ...formData, statutoryType: e.target.value })} options={STATUTORY_TYPE_OPTIONS} />
            <Input label="Priority" value={formData.priority.toString()} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })} type="number" />
            <Select label="Percentage Of" value={formData.percentageOf} onChange={(e) => setFormData({ ...formData, percentageOf: e.target.value })} options={PERCENTAGE_OF_OPTIONS} />
            <Input label="Fixed Amount" value={formData.fixedAmount.toString()} onChange={(e) => setFormData({ ...formData, fixedAmount: parseFloat(e.target.value) || 0 })} type="number" step="0.01" />
            <Select label="Is Pre Tax" value={formData.isPreTax.toString()} onChange={(e) => setFormData({ ...formData, isPreTax: e.target.value === 'true' })} options={BOOLEAN_OPTIONS} />
            <Select label="Is Taxable" value={formData.isTaxable.toString()} onChange={(e) => setFormData({ ...formData, isTaxable: e.target.value === 'true' })} options={BOOLEAN_OPTIONS} />
            <Input label="Applies To Employment Types (comma separated)" value={formData.appliesToEmploymentTypes} onChange={(e) => setFormData({ ...formData, appliesToEmploymentTypes: e.target.value })} placeholder="permanent, contract, casual" className="md:col-span-2" />
            <Textarea label="Formula" value={formData.formula} onChange={(e) => setFormData({ ...formData, formula: e.target.value })} className="md:col-span-2" />
            <Textarea label="Tiered Rates (JSON)" value={formData.tieredRates} onChange={(e) => setFormData({ ...formData, tieredRates: e.target.value })} className="md:col-span-2" placeholder='[{"min":0,"max":10000,"rate":5,"amount":0}]' />
            <Textarea label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="md:col-span-2" />
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>{selectedDeduction ? 'Update' : 'Create'}</Button>
          </div>
        </Modal>

        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Deduction" size="sm">
          <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this deduction? This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={saving}>Delete</Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
