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
import { Users, Plus, Eye, Edit, Trash2, RefreshCw } from 'lucide-react';

interface PayrollProfile {
  _id: string;
  employeeNumber: string;
  employeeName: string;
  department: string;
  position: string;
  employmentType: string;
  paymentFrequency: string;
  basicSalary: number;
  bankName: string;
  status: string;
  branch: { _id: string; name: string; code: string } | null;
  nationalId?: string;
  kraPin?: string;
  nssfNumber?: string;
  shifNumber?: string;
  bankAccountNumber?: string;
  mobileMoneyNumber?: string;
  email?: string;
  contractType?: string;
  employmentDate?: string;
  salaryStructure?: { _id: string; name: string } | null;
  housingAllowance?: number;
  transportAllowance?: number;
  medicalAllowance?: number;
  responsibilityAllowance?: number;
  communicationAllowance?: number;
  otherAllowances?: number;
  overtimeEligible?: boolean;
  overtimeRateMultiplier?: number;
  weeklyOffDays?: string[];
}

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
  { value: 'casual', label: 'Casual' },
];

const PAYMENT_FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' },
  { value: 'weekly', label: 'Weekly' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'terminated', label: 'Terminated' },
];

export default function PayrollEmployeesPage() {
  const [profiles, setProfiles] = useState<PayrollProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProfile, setSelectedProfile] = useState<PayrollProfile | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalTab, setModalTab] = useState('personal');

  const [formData, setFormData] = useState({
    employeeNumber: '', employeeName: '', nationalId: '', kraPin: '', nssfNumber: '', shifNumber: '',
    bankName: '', bankBranch: '', bankAccountNumber: '', mobileMoneyNumber: '', email: '',
    department: '', position: '', branch: '', employmentType: 'permanent', contractType: '',
    employmentDate: '', salaryStructure: '', paymentFrequency: 'monthly',
    basicSalary: 0, housingAllowance: 0, transportAllowance: 0, medicalAllowance: 0,
    responsibilityAllowance: 0, communicationAllowance: 0, otherAllowances: 0,
    overtimeEligible: false, overtimeRateMultiplier: 1.5, weeklyOffDays: '', status: 'active',
  });

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '20');
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (branchFilter !== 'all') params.set('branch', branchFilter);
      if (departmentFilter !== 'all') params.set('department', departmentFilter);
      if (employmentTypeFilter !== 'all') params.set('employmentType', employmentTypeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/payroll/profile?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setProfiles(result.profiles || []);
        setTotalPages(result.pagination?.pages || 1);
      } else {
        setError(result.error || 'Failed to fetch profiles');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [currentPage, branchFilter, departmentFilter, employmentTypeFilter, statusFilter, searchQuery]);

  const openAddModal = () => {
    setSelectedProfile(null);
    setFormData({
      employeeNumber: '', employeeName: '', nationalId: '', kraPin: '', nssfNumber: '', shifNumber: '',
      bankName: '', bankBranch: '', bankAccountNumber: '', mobileMoneyNumber: '', email: '',
      department: '', position: '', branch: '', employmentType: 'permanent', contractType: '',
      employmentDate: '', salaryStructure: '', paymentFrequency: 'monthly',
      basicSalary: 0, housingAllowance: 0, transportAllowance: 0, medicalAllowance: 0,
      responsibilityAllowance: 0, communicationAllowance: 0, otherAllowances: 0,
      overtimeEligible: false, overtimeRateMultiplier: 1.5, weeklyOffDays: '', status: 'active',
    });
    setModalTab('personal');
    setShowModal(true);
  };

  const openEditModal = (profile: PayrollProfile) => {
    setSelectedProfile(profile);
    setFormData({
      employeeNumber: profile.employeeNumber, employeeName: profile.employeeName, nationalId: profile.nationalId || '',
      kraPin: profile.kraPin || '', nssfNumber: profile.nssfNumber || '', shifNumber: profile.shifNumber || '',
      bankName: profile.bankName || '', bankBranch: '', bankAccountNumber: profile.bankAccountNumber || '',
      mobileMoneyNumber: profile.mobileMoneyNumber || '', email: profile.email || '',
      department: profile.department || '', position: profile.position || '', branch: profile.branch?._id || profile.branch?.name || '',
      employmentType: profile.employmentType || 'permanent', contractType: profile.contractType || '',
      employmentDate: profile.employmentDate ? profile.employmentDate.split('T')[0] : '',
      salaryStructure: profile.salaryStructure?._id || '',
      paymentFrequency: profile.paymentFrequency || 'monthly',
      basicSalary: profile.basicSalary || 0, housingAllowance: profile.housingAllowance || 0,
      transportAllowance: profile.transportAllowance || 0, medicalAllowance: profile.medicalAllowance || 0,
      responsibilityAllowance: profile.responsibilityAllowance || 0, communicationAllowance: profile.communicationAllowance || 0,
      otherAllowances: profile.otherAllowances || 0, overtimeEligible: profile.overtimeEligible || false,
      overtimeRateMultiplier: profile.overtimeRateMultiplier || 1.5, weeklyOffDays: profile.weeklyOffDays?.join(',') || '',
      status: profile.status || 'active',
    });
    setModalTab('personal');
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const url = selectedProfile ? '/api/payroll/profile' : '/api/payroll/profile';
      const method = selectedProfile ? 'PUT' : 'POST';
      const body = selectedProfile ? { ...formData, id: selectedProfile._id } : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.success) {
        setShowModal(false);
        fetchProfiles();
      } else {
        setError(result.error || 'Failed to save profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProfile) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/payroll/profile?id=${selectedProfile._id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setShowDeleteModal(false);
        setSelectedProfile(null);
        fetchProfiles();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      active: 'badge-success',
      inactive: 'badge-gray',
      on_leave: 'badge-warning',
      terminated: 'badge-danger',
    };
    return <span className={`badge ${classes[status] || 'badge-gray'}`}>{status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>;
  };

  const getEmploymentTypeBadge = (type: string) => {
    const classes: Record<string, string> = {
      permanent: 'badge-success',
      contract: 'badge-info',
      intern: 'badge-warning',
      casual: 'badge-gray',
    };
    return <span className={`badge ${classes[type] || 'badge-gray'}`}>{type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>;
  };

  const activeCount = profiles.filter((p) => p.status === 'active').length;
  const leaveCount = profiles.filter((p) => p.status === 'on_leave').length;
  const terminatedCount = profiles.filter((p) => p.status === 'terminated').length;

  return (
    <div>
      <Header title="Employees" subtitle="Manage employee payroll profiles" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchProfiles}>Retry</Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total Employees</p><p className="text-lg font-bold text-gray-900">{profiles.length || 0}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><Users className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-sm text-gray-500">Active</p><p className="text-lg font-bold text-gray-900">{activeCount}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg"><Users className="w-5 h-5 text-yellow-600" /></div>
            <div><p className="text-sm text-gray-500">On Leave</p><p className="text-lg font-bold text-gray-900">{leaveCount}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><Users className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-sm text-gray-500">Terminated</p><p className="text-lg font-bold text-gray-900">{terminatedCount}</p></div>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, number, dept..." className="w-64" />
            <Input value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} placeholder="Department" className="w-40" />
            <Select value={employmentTypeFilter} onChange={(e) => setEmploymentTypeFilter(e.target.value)} options={[{ value: 'all', label: 'All Types' }, ...EMPLOYMENT_TYPE_OPTIONS]} />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: 'all', label: 'All Status' }, ...STATUS_OPTIONS]} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchProfiles} className="gap-2" disabled={loading}><RefreshCw className="w-4 h-4" /> Refresh</Button>
            <Button onClick={openAddModal} className="gap-2"><Plus className="w-4 h-4" /> Add Employee</Button>
          </div>
        </div>

        <Card>
          <CardHeader title={`Showing ${profiles.length} of ${totalPages * 20} employees`} />
          <DataTable
            columns={[
              { key: 'employeeNumber', header: 'Emp No.', className: 'font-medium' },
              { key: 'employeeName', header: 'Full Name', className: 'font-medium' },
              { key: 'department', header: 'Department' },
              { key: 'position', header: 'Position' },
              {
                key: 'employmentType', header: 'Employment Type',
                render: (item: PayrollProfile) => getEmploymentTypeBadge(item.employmentType),
              },
              { key: 'paymentFrequency', header: 'Frequency' },
              {
                key: 'basicSalary', header: 'Basic Salary',
                render: (item: PayrollProfile) => <span className="font-medium">{formatCurrency(item.basicSalary)}</span>,
              },
              { key: 'bankName', header: 'Bank' },
              { key: 'status', header: 'Status', render: (item: PayrollProfile) => getStatusBadge(item.status) },
              {
                key: 'actions', header: 'Actions',
                render: (item: PayrollProfile) => (
                  <div className="flex gap-1">
                    <button onClick={() => { setSelectedProfile(item); setModalTab('personal'); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="View"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => openEditModal(item)} disabled={saving} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Edit"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { setSelectedProfile(item); setShowDeleteModal(true); }} disabled={saving} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ),
              },
            ]}
            data={profiles}
            keyExtractor={(item) => item._id}
            loading={loading}
            pagination={{ page: currentPage, total: totalPages, pages: totalPages, onPageChange: setCurrentPage }}
            emptyMessage="No employees found"
          />
        </Card>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedProfile ? 'Edit Employee' : 'Add Employee'} size="xl">
          <div className="flex gap-2 border-b mb-4">
            {['personal', 'employment', 'salary', 'bank'].map((tab) => (
              <button key={tab} onClick={() => setModalTab(tab)} className={`px-3 py-2 text-sm font-medium capitalize ${modalTab === tab ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500'}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {modalTab === 'personal' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Employee Number" value={formData.employeeNumber} onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })} disabled={!!selectedProfile} required />
                <Input label="Full Name" value={formData.employeeName} onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })} required />
                <Input label="National ID" value={formData.nationalId} onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })} />
                <Input label="KRA PIN" value={formData.kraPin} onChange={(e) => setFormData({ ...formData, kraPin: e.target.value })} />
                <Input label="NSSF Number" value={formData.nssfNumber} onChange={(e) => setFormData({ ...formData, nssfNumber: e.target.value })} />
                <Input label="SHIF Number" value={formData.shifNumber} onChange={(e) => setFormData({ ...formData, shifNumber: e.target.value })} />
                <Input label="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                <Select label="Employment Type" value={formData.employmentType} onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })} options={EMPLOYMENT_TYPE_OPTIONS} />
              </div>
            )}
            {modalTab === 'employment' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
                <Input label="Position" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} />
                <Input label="Employment Date" value={formData.employmentDate} onChange={(e) => setFormData({ ...formData, employmentDate: e.target.value })} type="date" />
                <Input label="Contract Type" value={formData.contractType} onChange={(e) => setFormData({ ...formData, contractType: e.target.value })} />
                <Select label="Payment Frequency" value={formData.paymentFrequency} onChange={(e) => setFormData({ ...formData, paymentFrequency: e.target.value })} options={PAYMENT_FREQUENCY_OPTIONS} />
                <Select label="Status" value={formData.status || 'active'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} options={STATUS_OPTIONS} />
              </div>
            )}
            {modalTab === 'salary' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Basic Salary" value={formData.basicSalary.toString()} onChange={(e) => setFormData({ ...formData, basicSalary: parseFloat(e.target.value) || 0 })} type="number" />
                <Input label="Housing Allowance" value={formData.housingAllowance.toString()} onChange={(e) => setFormData({ ...formData, housingAllowance: parseFloat(e.target.value) || 0 })} type="number" />
                <Input label="Transport Allowance" value={formData.transportAllowance.toString()} onChange={(e) => setFormData({ ...formData, transportAllowance: parseFloat(e.target.value) || 0 })} type="number" />
                <Input label="Medical Allowance" value={formData.medicalAllowance.toString()} onChange={(e) => setFormData({ ...formData, medicalAllowance: parseFloat(e.target.value) || 0 })} type="number" />
                <Input label="Responsibility Allowance" value={formData.responsibilityAllowance.toString()} onChange={(e) => setFormData({ ...formData, responsibilityAllowance: parseFloat(e.target.value) || 0 })} type="number" />
                <Input label="Communication Allowance" value={formData.communicationAllowance.toString()} onChange={(e) => setFormData({ ...formData, communicationAllowance: parseFloat(e.target.value) || 0 })} type="number" />
                <Input label="Other Allowances" value={formData.otherAllowances.toString()} onChange={(e) => setFormData({ ...formData, otherAllowances: parseFloat(e.target.value) || 0 })} type="number" />
                <Select label="Overtime Eligible" value={formData.overtimeEligible.toString()} onChange={(e) => setFormData({ ...formData, overtimeEligible: e.target.value === 'true' })} options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} />
                <Input label="Overtime Rate Multiplier" value={formData.overtimeRateMultiplier.toString()} onChange={(e) => setFormData({ ...formData, overtimeRateMultiplier: parseFloat(e.target.value) || 1.5 })} type="number" step="0.1" />
                <Input label="Weekly Off Days (comma separated)" value={formData.weeklyOffDays} onChange={(e) => setFormData({ ...formData, weeklyOffDays: e.target.value })} />
              </div>
            )}
            {modalTab === 'bank' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Bank Name" value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} />
                <Input label="Bank Branch" value={formData.bankBranch} onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })} />
                <Input label="Bank Account Number" value={formData.bankAccountNumber} onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })} />
                <Input label="Mobile Money Number" value={formData.mobileMoneyNumber} onChange={(e) => setFormData({ ...formData, mobileMoneyNumber: e.target.value })} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>{selectedProfile ? 'Update' : 'Create'}</Button>
          </div>
        </Modal>

        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Employee" size="sm">
          <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this employee profile? This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={saving}>Delete</Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
