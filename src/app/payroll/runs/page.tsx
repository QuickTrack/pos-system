'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Eye, Trash2, RefreshCw, Calculator, CheckCircle, Lock, ClipboardList, TrendingUp } from 'lucide-react';

interface PayrollApproval {
  approverId: { name: string } | null;
  approverName: string;
  role: string;
  action: string;
  comments?: string;
  timestamp: string;
}

interface PayrollItemRow {
  _id: string;
  employeeName: string;
  employeeNumber?: string;
  department?: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  paye: number;
  nssf: number;
  shif: number;
}

interface PayrollRun {
  _id: string;
  name: string;
  description?: string;
  periodStart: string;
  periodEnd: string;
  payPeriod: string;
  branch: { name: string; code: string } | null;
  department?: string;
  status: string;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalPAYE: number;
  totalNSSF: number;
  totalSHIF: number;
  currentStep: string;
  processedBy: { name: string } | null;
  processedByName?: string;
  approvals: PayrollApproval[];
  payrollItems: PayrollItemRow[];
}

const STEP_ORDER = ['select_period', 'import_data', 'calculate', 'preview', 'approval', 'finalize', 'payslips'];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'processing', label: 'Processing' },
  { value: 'calculated', label: 'Calculated' },
  { value: 'review', label: 'Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'finalized', label: 'Finalized' },
  { value: 'published', label: 'Published' },
  { value: 'reversed', label: 'Reversed' },
];

export default function PayrollRunsPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewTab, setViewTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '', description: '', periodStart: '', periodEnd: '', payPeriod: 'monthly', branch: '', department: '',
  });

  const fetchRuns = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '20');
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/payroll/runs?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setRuns(result.runs || []);
        setTotalPages(result.pagination?.pages || 1);
      } else {
        setError(result.error || 'Failed to fetch payroll runs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [currentPage, statusFilter, searchQuery]);

  const fetchRunDetail = async (id: string) => {
    const response = await fetch(`/api/payroll/runs/${id}`);
    const result = await response.json();
    if (result.success) {
      setSelectedRun(result.run);
    }
    return result;
  };

  const openViewModal = async (run: PayrollRun) => {
    setSelectedRun(run);
    setViewTab('overview');
    setShowViewModal(true);
    await fetchRunDetail(run._id);
  };

  const runAction = async (id: string, action: 'calculate' | 'approve' | 'finalize') => {
    try {
      setSaving(true);
      setActionError(null);
      const response = await fetch(`/api/payroll/runs/${id}/${action}`, { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        if (showViewModal) {
          setSelectedRun(result.run);
        }
        fetchRuns();
      } else {
        setActionError(result.error || `Failed to ${action} payroll run`);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    setCreateForm({ name: '', description: '', periodStart: '', periodEnd: '', payPeriod: 'monthly', branch: '', department: '' });
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      setActionError(null);
      const response = await fetch('/api/payroll/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const result = await response.json();
      if (result.success) {
        setShowCreateModal(false);
        fetchRuns();
      } else {
        setActionError(result.error || 'Failed to create payroll run');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRun) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/payroll/runs/${selectedRun._id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setShowDeleteModal(false);
        setSelectedRun(null);
        fetchRuns();
      } else {
        setError(result.error || 'Failed to delete');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      draft: 'badge-gray',
      processing: 'badge-warning',
      calculated: 'badge-info',
      review: 'badge-purple',
      approved: 'badge-blue',
      finalized: 'badge-success',
      published: 'badge-emerald',
      reversed: 'badge-danger',
    };
    return <span className={`badge ${classes[status] || 'badge-gray'}`}>{status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>;
  };

  const getStepLabel = (step: string) => {
    const index = STEP_ORDER.indexOf(step);
    const display = step.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    if (index < 0) return display;
    return `Step ${index + 1} / ${STEP_ORDER.length}`;
  };

  const totalRuns = runs.length || 0;
  const finalizedCount = runs.filter((r) => r.status === 'finalized').length;
  const draftCount = runs.filter((r) => r.status === 'draft').length;
  const approvedCount = runs.filter((r) => r.status === 'approved').length;
  const totalPaid = runs.reduce((sum, r) => sum + (r.totalNet || 0), 0);

  return (
    <div>
      <Header title="Payroll Runs" subtitle="Process and manage payroll" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchRuns}>Retry</Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><ClipboardList className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total Runs</p><p className="text-lg font-bold text-gray-900">{totalRuns}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><Lock className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-sm text-gray-500">Finalized</p><p className="text-lg font-bold text-gray-900">{finalizedCount}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-lg"><ClipboardList className="w-5 h-5 text-gray-600" /></div>
            <div><p className="text-sm text-gray-500">Draft</p><p className="text-lg font-bold text-gray-900">{draftCount}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><CheckCircle className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Approved</p><p className="text-lg font-bold text-gray-900">{approvedCount}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><TrendingUp className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-sm text-gray-500">Total Paid</p><p className="text-lg font-bold text-gray-900">{formatCurrency(totalPaid)}</p></div>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name..." className="w-64" />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={STATUS_OPTIONS} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchRuns} className="gap-2" disabled={loading}><RefreshCw className="w-4 h-4" /> Refresh</Button>
            <Button onClick={openCreateModal} className="gap-2"><Plus className="w-4 h-4" /> Process New Payroll</Button>
          </div>
        </div>

        <Card>
          <CardHeader title={`Showing ${totalRuns} of ${totalPages * 20} runs`} />
          <DataTable
            columns={[
              { key: 'name', header: 'Name', className: 'font-medium' },
              {
                key: 'period', header: 'Period',
                render: (item: PayrollRun) => (
                  <span className="text-sm">{formatDate(item.periodStart)} - {formatDate(item.periodEnd)}</span>
                ),
              },
              { key: 'branch', header: 'Branch', render: (item: PayrollRun) => item.branch?.name || '-' },
              { key: 'department', header: 'Department', render: (item: PayrollRun) => item.department || '-' },
              { key: 'totalEmployees', header: 'Employees', render: (item: PayrollRun) => item.totalEmployees || 0 },
              { key: 'totalGross', header: 'Gross Payroll', render: (item: PayrollRun) => <span className="font-medium">{formatCurrency(item.totalGross)}</span> },
              { key: 'totalNet', header: 'Net Payroll', render: (item: PayrollRun) => <span className="font-medium">{formatCurrency(item.totalNet)}</span> },
              { key: 'totalDeductions', header: 'Total Deductions', render: (item: PayrollRun) => formatCurrency(item.totalDeductions) },
              { key: 'status', header: 'Status', render: (item: PayrollRun) => getStatusBadge(item.status) },
              { key: 'currentStep', header: 'Current Step', render: (item: PayrollRun) => <span className="text-xs text-gray-600">{getStepLabel(item.currentStep)}</span> },
              { key: 'processedBy', header: 'Processed By', render: (item: PayrollRun) => item.processedBy?.name || item.processedByName || '-' },
              {
                key: 'actions', header: 'Actions',
                render: (item: PayrollRun) => (
                  <div className="flex gap-1">
                    <button onClick={() => openViewModal(item)} disabled={saving} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="View"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => runAction(item._id, 'calculate')} disabled={saving || (item.status !== 'draft' && item.status !== 'processing')} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600" title="Calculate"><Calculator className="w-4 h-4" /></button>
                    <button onClick={() => runAction(item._id, 'approve')} disabled={saving || (item.status !== 'calculated' && item.status !== 'review')} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                    <button onClick={() => runAction(item._id, 'finalize')} disabled={saving || item.status !== 'approved'} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600" title="Finalize"><Lock className="w-4 h-4" /></button>
                    <button onClick={() => { setSelectedRun(item); setShowDeleteModal(true); }} disabled={saving} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ),
              },
            ]}
            data={runs}
            keyExtractor={(item) => item._id}
            loading={loading}
            pagination={{ page: currentPage, total: totalPages, pages: totalPages, onPageChange: setCurrentPage }}
            emptyMessage="No payroll runs found"
          />
        </Card>

        <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title={selectedRun ? selectedRun.name : 'Payroll Run'} size="xl">
          {actionError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{actionError}</div>
          )}
          <div className="flex gap-2 border-b mb-4">
            {['overview', 'items', 'approvals'].map((tab) => (
              <button key={tab} onClick={() => setViewTab(tab)} className={`px-3 py-2 text-sm font-medium capitalize ${viewTab === tab ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500'}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {viewTab === 'overview' && selectedRun && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-3"><p className="text-xs text-gray-500">Total Employees</p><p className="text-lg font-bold">{selectedRun.totalEmployees || 0}</p></Card>
                  <Card className="p-3"><p className="text-xs text-gray-500">Gross Payroll</p><p className="text-lg font-bold">{formatCurrency(selectedRun.totalGross)}</p></Card>
                  <Card className="p-3"><p className="text-xs text-gray-500">Net Payroll</p><p className="text-lg font-bold">{formatCurrency(selectedRun.totalNet)}</p></Card>
                  <Card className="p-3"><p className="text-xs text-gray-500">Deductions</p><p className="text-lg font-bold">{formatCurrency(selectedRun.totalDeductions)}</p></Card>
                  <Card className="p-3"><p className="text-xs text-gray-500">PAYE</p><p className="text-lg font-bold">{formatCurrency(selectedRun.totalPAYE)}</p></Card>
                  <Card className="p-3"><p className="text-xs text-gray-500">NSSF</p><p className="text-lg font-bold">{formatCurrency(selectedRun.totalNSSF)}</p></Card>
                  <Card className="p-3"><p className="text-xs text-gray-500">SHIF</p><p className="text-lg font-bold">{formatCurrency(selectedRun.totalSHIF)}</p></Card>
                  <Card className="p-3"><p className="text-xs text-gray-500">Status</p><p className="text-lg font-bold">{getStatusBadge(selectedRun.status)}</p></Card>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={() => runAction(selectedRun._id, 'calculate')} isLoading={saving} disabled={selectedRun.status !== 'draft' && selectedRun.status !== 'processing'} className="gap-2"><Calculator className="w-4 h-4" /> Calculate</Button>
                  <Button onClick={() => runAction(selectedRun._id, 'approve')} isLoading={saving} disabled={selectedRun.status !== 'calculated' && selectedRun.status !== 'review'} className="gap-2"><CheckCircle className="w-4 h-4" /> Approve</Button>
                  <Button onClick={() => runAction(selectedRun._id, 'finalize')} isLoading={saving} disabled={selectedRun.status !== 'approved'} className="gap-2"><Lock className="w-4 h-4" /> Finalize</Button>
                </div>
              </>
            )}
            {viewTab === 'items' && selectedRun && (
              <DataTable
                columns={[
                  { key: 'employeeName', header: 'Employee', className: 'font-medium' },
                  { key: 'employeeNumber', header: 'Emp No.', render: (i: PayrollItemRow) => i.employeeNumber || '-' },
                  { key: 'department', header: 'Department', render: (i: PayrollItemRow) => i.department || '-' },
                  { key: 'grossPay', header: 'Gross', render: (i: PayrollItemRow) => formatCurrency(i.grossPay) },
                  { key: 'totalDeductions', header: 'Deductions', render: (i: PayrollItemRow) => formatCurrency(i.totalDeductions) },
                  { key: 'netPay', header: 'Net', render: (i: PayrollItemRow) => formatCurrency(i.netPay) },
                ]}
                data={selectedRun.payrollItems || []}
                keyExtractor={(i) => i._id}
                emptyMessage="No payroll items"
              />
            )}
            {viewTab === 'approvals' && selectedRun && (
              <div className="space-y-4">
                {(selectedRun.approvals && selectedRun.approvals.length > 0) ? (
                  selectedRun.approvals.map((a, idx) => (
                    <div key={idx} className="flex gap-3 border-l-2 border-emerald-200 pl-4 pb-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{a.approverName}</p>
                        <p className="text-xs text-gray-500 capitalize">{a.role} &middot; {a.action} &middot; {formatDate(a.timestamp)}</p>
                        {a.comments && <p className="text-sm text-gray-600 mt-1">{a.comments}</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No approvals yet</p>
                )}
              </div>
            )}
          </div>
        </Modal>

        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Process New Payroll" size="lg">
          {actionError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{actionError}</div>
          )}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
              <Input label="Department" value={createForm.department} onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })} />
              <Input label="Period Start" value={createForm.periodStart} onChange={(e) => setCreateForm({ ...createForm, periodStart: e.target.value })} type="date" required />
              <Input label="Period End" value={createForm.periodEnd} onChange={(e) => setCreateForm({ ...createForm, periodEnd: e.target.value })} type="date" required />
              <Input label="Pay Period" value={createForm.payPeriod} onChange={(e) => setCreateForm({ ...createForm, payPeriod: e.target.value })} as="select" options={[{ value: 'monthly', label: 'Monthly' }, { value: 'weekly', label: 'Weekly' }, { value: 'bi_weekly', label: 'Bi-Weekly' }, { value: 'custom', label: 'Custom' }]} />
              <Input label="Branch" value={createForm.branch} onChange={(e) => setCreateForm({ ...createForm, branch: e.target.value })} />
            </div>
            <Textarea label="Description" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={saving}>Create Run</Button>
          </div>
        </Modal>

        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Payroll Run" size="sm">
          <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this payroll run? This will also delete all its payroll items. This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={saving}>Delete</Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
