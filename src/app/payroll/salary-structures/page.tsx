'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency } from '@/lib/utils';
import { Plus, Eye, Edit, Trash2, RefreshCw, Layers } from 'lucide-react';

interface SalaryStructure {
  _id: string;
  name: string;
  description?: string;
  category: string;
  paymentFrequency: string;
  amount: number;
  rate: number;
  overtimeMultiplierNormal: number;
  overtimeMultiplierWeekend: number;
  overtimeMultiplierHoliday: number;
  isDefault: boolean;
  isActive: boolean;
}

const CATEGORY_OPTIONS = [
  { value: 'executive', label: 'Executive' },
  { value: 'senior_management', label: 'Senior Management' },
  { value: 'middle_management', label: 'Middle Management' },
  { value: 'supervisory', label: 'Supervisory' },
  { value: 'staff', label: 'Staff' },
  { value: 'casual', label: 'Casual' },
];

const PAYMENT_FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'daily', label: 'Daily' },
  { value: 'hourly', label: 'Hourly' },
];

const YES_NO_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

export default function SalaryStructuresPage() {
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '', description: '', category: 'staff', paymentFrequency: 'monthly',
    amount: 0, rate: 0, overtimeMultiplierNormal: 1.5, overtimeMultiplierWeekend: 1.5,
    overtimeMultiplierHoliday: 2, isDefault: 'false',
  });

  const fetchStructures = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '20');
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (categoryFilter !== 'all') params.set('category', categoryFilter);

      const response = await fetch(`/api/payroll/salary-structures?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setStructures(result.structures || []);
        setTotalPages(result.pagination?.pages || 1);
      } else {
        setError(result.error || 'Failed to fetch salary structures');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructures();
  }, [currentPage, categoryFilter, searchQuery]);

  const openAddModal = () => {
    setSelectedStructure(null);
    setFormData({
      name: '', description: '', category: 'staff', paymentFrequency: 'monthly',
      amount: 0, rate: 0, overtimeMultiplierNormal: 1.5, overtimeMultiplierWeekend: 1.5,
      overtimeMultiplierHoliday: 2, isDefault: 'false',
    });
    setShowModal(true);
  };

  const openEditModal = (structure: SalaryStructure) => {
    setSelectedStructure(structure);
    setFormData({
      name: structure.name, description: structure.description || '', category: structure.category,
      paymentFrequency: structure.paymentFrequency, amount: structure.amount || 0, rate: structure.rate || 0,
      overtimeMultiplierNormal: structure.overtimeMultiplierNormal ?? 1.5,
      overtimeMultiplierWeekend: structure.overtimeMultiplierWeekend ?? 1.5,
      overtimeMultiplierHoliday: structure.overtimeMultiplierHoliday ?? 2,
      isDefault: structure.isDefault ? 'true' : 'false',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const body = {
        name: formData.name, description: formData.description, category: formData.category,
        paymentFrequency: formData.paymentFrequency, amount: parseFloat(formData.amount.toString()) || 0,
        rate: parseFloat(formData.rate.toString()) || 0, overtimeMultiplierNormal: parseFloat(formData.overtimeMultiplierNormal.toString()) || 1.5,
        overtimeMultiplierWeekend: parseFloat(formData.overtimeMultiplierWeekend.toString()) || 1.5,
        overtimeMultiplierHoliday: parseFloat(formData.overtimeMultiplierHoliday.toString()) || 2,
        isDefault: formData.isDefault === 'true',
      };
      const url = selectedStructure ? `/api/payroll/salary-structures/${selectedStructure._id}` : '/api/payroll/salary-structures';
      const method = selectedStructure ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.success) {
        setShowModal(false);
        fetchStructures();
      } else {
        setError(result.error || 'Failed to save salary structure');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStructure) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/payroll/salary-structures/${selectedStructure._id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setShowDeleteModal(false);
        setSelectedStructure(null);
        fetchStructures();
      } else {
        setError(result.error || 'Failed to delete');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    const classes: Record<string, string> = {
      executive: 'badge-purple',
      senior_management: 'badge-info',
      middle_management: 'badge-blue',
      supervisory: 'badge-warning',
      staff: 'badge-success',
      casual: 'badge-gray',
    };
    return <span className={`badge ${classes[category] || 'badge-gray'}`}>{category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>;
  };

  const getFrequencyBadge = (frequency: string) => {
    const classes: Record<string, string> = {
      monthly: 'badge-success',
      bi_weekly: 'badge-info',
      weekly: 'badge-warning',
      daily: 'badge-purple',
      hourly: 'badge-gray',
    };
    return <span className={`badge ${classes[frequency] || 'badge-gray'}`}>{frequency.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>;
  };

  const getDefaultBadge = (isDefault: boolean) => {
    return isDefault
      ? <span className="badge badge-success">Default</span>
      : <span className="badge badge-gray">No</span>;
  };

  const totalCount = structures.length || 0;
  const defaultCount = structures.filter((s) => s.isDefault).length;

  return (
    <div>
      <Header title="Salary Structures" subtitle="Manage salary structure templates" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchStructures}>Retry</Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Layers className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total Structures</p><p className="text-lg font-bold text-gray-900">{totalCount}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><Layers className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-sm text-gray-500">Default Structure</p><p className="text-lg font-bold text-gray-900">{defaultCount}</p></div>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name..." className="w-64" />
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} options={[{ value: 'all', label: 'All Categories' }, ...CATEGORY_OPTIONS]} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchStructures} className="gap-2" disabled={loading}><RefreshCw className="w-4 h-4" /> Refresh</Button>
            <Button onClick={openAddModal} className="gap-2"><Plus className="w-4 h-4" /> Add Structure</Button>
          </div>
        </div>

        <Card>
          <CardHeader title={`Showing ${totalCount} of ${totalPages * 20} structures`} />
          <DataTable
            columns={[
              { key: 'name', header: 'Name', className: 'font-medium' },
              { key: 'category', header: 'Category', render: (item: SalaryStructure) => getCategoryBadge(item.category) },
              { key: 'paymentFrequency', header: 'Payment Frequency', render: (item: SalaryStructure) => getFrequencyBadge(item.paymentFrequency) },
              {
                key: 'amount', header: 'Amount/Rate',
                render: (item: SalaryStructure) => (
                  <div className="text-sm">
                    <div className="font-medium">{formatCurrency(item.amount)}</div>
                    {item.rate ? <div className="text-gray-500">Rate: {formatCurrency(item.rate)}</div> : null}
                  </div>
                ),
              },
              {
                key: 'overtime', header: 'Overtime Multipliers',
                render: (item: SalaryStructure) => (
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <div>Normal: {item.overtimeMultiplierNormal ?? 1.5}x</div>
                    <div>Weekend: {item.overtimeMultiplierWeekend ?? 1.5}x</div>
                    <div>Holiday: {item.overtimeMultiplierHoliday ?? 2}x</div>
                  </div>
                ),
              },
              { key: 'isDefault', header: 'Is Default', render: (item: SalaryStructure) => getDefaultBadge(item.isDefault) },
              {
                key: 'actions', header: 'Actions',
                render: (item: SalaryStructure) => (
                  <div className="flex gap-1">
                    <button onClick={() => openEditModal(item)} disabled={saving} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Edit"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { setSelectedStructure(item); setShowDeleteModal(true); }} disabled={saving} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ),
              },
            ]}
            data={structures}
            keyExtractor={(item) => item._id}
            loading={loading}
            pagination={{ page: currentPage, total: totalPages, pages: totalPages, onPageChange: setCurrentPage }}
            emptyMessage="No salary structures found"
          />
        </Card>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedStructure ? 'Edit Structure' : 'Add Structure'} size="lg">
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              <Input label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              <Select label="Category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} options={CATEGORY_OPTIONS} />
              <Select label="Payment Frequency" value={formData.paymentFrequency} onChange={(e) => setFormData({ ...formData, paymentFrequency: e.target.value })} options={PAYMENT_FREQUENCY_OPTIONS} />
              <Input label="Amount" value={formData.amount.toString()} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} type="number" />
              <Input label="Rate" value={formData.rate.toString()} onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })} type="number" />
              <Input label="Overtime (Normal)" value={formData.overtimeMultiplierNormal.toString()} onChange={(e) => setFormData({ ...formData, overtimeMultiplierNormal: parseFloat(e.target.value) || 1.5 })} type="number" step="0.1" />
              <Input label="Overtime (Weekend)" value={formData.overtimeMultiplierWeekend.toString()} onChange={(e) => setFormData({ ...formData, overtimeMultiplierWeekend: parseFloat(e.target.value) || 1.5 })} type="number" step="0.1" />
              <Input label="Overtime (Holiday)" value={formData.overtimeMultiplierHoliday.toString()} onChange={(e) => setFormData({ ...formData, overtimeMultiplierHoliday: parseFloat(e.target.value) || 2 })} type="number" step="0.1" />
              <Select label="Is Default" value={formData.isDefault} onChange={(e) => setFormData({ ...formData, isDefault: e.target.value })} options={YES_NO_OPTIONS} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>{selectedStructure ? 'Update' : 'Create'}</Button>
          </div>
        </Modal>

        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Structure" size="sm">
          <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this salary structure? This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={saving}>Delete</Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
