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
import { Wallet, Plus, Eye, CheckCircle, XCircle, RefreshCw, FileText } from 'lucide-react';

interface Advance {
  _id: string;
  employeeName: string;
  employeeNumber: string;
  amount: number;
  reason: string;
  requestedDate: string;
  approvedBy: { name: string } | null;
  approvedByName?: string;
  repaymentStartDate: string;
  repaymentAmount: number;
  approvalStatus: string;
  remainingBalance: number;
  notes?: string;
  branch?: { name: string; code: string } | null;
}

interface EmployeeOption {
  _id: string;
  name: string;
  employeeNumber?: string;
}

interface AdvanceStats {
  total: number;
  pending: number;
  approved: number;
  paid: number;
  outstanding: number;
}

const STATUS_CLASSES: Record<string, string> = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
  disbursed: 'badge-info',
  completed: 'badge-gray',
};

const REPAYMENT_FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'one_time', label: 'One Time' },
];

export default function PayrollAdvancesPage() {
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<Advance | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employee: '',
    amount: '0',
    reason: '',
    repaymentStartDate: '',
    repaymentAmount: '0',
    repaymentFrequency: 'monthly',
    notes: '',
  });

  const fetchAdvances = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '20');
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (statusFilter !== 'all') params.set('approvalStatus', statusFilter);

      const response = await fetch(`/api/payroll/advances?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setAdvances(result.advances || []);
        setTotalPages(result.pagination?.pages || 1);
      } else {
        setError(result.error || 'Failed to fetch advances');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/payroll/profile?limit=1000');
      const result = await response.json();
      if (result.success) {
        setEmployees(
          (result.profiles || []).map((p: any) => ({
            _id: p._id,
            name: p.employeeName,
            employeeNumber: p.employeeNumber,
          }))
        );
      }
    } catch {
      setEmployees([]);
    }
  };

  useEffect(() => {
    fetchAdvances();
    fetchEmployees();
  }, [currentPage, statusFilter, searchQuery]);

  const openAddModal = () => {
    setFormData({
      employee: '',
      amount: '0',
      reason: '',
      repaymentStartDate: '',
      repaymentAmount: '0',
      repaymentFrequency: 'monthly',
      notes: '',
    });
    setShowModal(true);
  };

  const openDetailModal = (advance: Advance) => {
    setSelectedAdvance(advance);
    setShowDetailModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const response = await fetch('/api/payroll/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: formData.employee,
          amount: parseFloat(formData.amount) || 0,
          reason: formData.reason,
          repaymentStartDate: formData.repaymentStartDate,
          repaymentAmount: parseFloat(formData.repaymentAmount) || 0,
          repaymentFrequency: formData.repaymentFrequency,
          notes: formData.notes,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setShowModal(false);
        fetchAdvances();
      } else {
        setError(result.error || 'Failed to record advance');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      setActionLoading(id + action);
      setError(null);
      const response = await fetch('/api/payroll/advances', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const result = await response.json();
      if (result.success) {
        fetchAdvances();
      } else {
        setError(result.error || 'Action failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const stats: AdvanceStats = {
    total: advances.reduce((s, a) => s + (a.amount || 0), 0),
    pending: advances.filter((a) => a.approvalStatus === 'pending').length,
    approved: advances.filter((a) => a.approvalStatus === 'approved' || a.approvalStatus === 'disbursed').length,
    paid: advances.filter((a) => a.approvalStatus === 'disbursed' || a.approvalStatus === 'completed').length,
    outstanding: advances.reduce((s, a) => s + (a.remainingBalance || 0), 0),
  };

  const getStatusBadge = (status: string) => (
    <Badge variant={STATUS_CLASSES[status] === 'badge-success' ? 'success' : STATUS_CLASSES[status] === 'badge-danger' ? 'danger' : STATUS_CLASSES[status] === 'badge-info' ? 'blue' : STATUS_CLASSES[status] === 'badge-warning' ? 'warning' : 'gray'}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
    </Badge>
  );

  return (
    <div>
      <Header title="Advances" subtitle="Manage employee salary advances" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAdvances}>Retry</Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><Wallet className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-sm text-gray-500">Total Advances</p><p className="text-lg font-bold text-gray-900">{formatCurrency(stats.total)}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg"><Wallet className="w-5 h-5 text-yellow-600" /></div>
            <div><p className="text-sm text-gray-500">Pending</p><p className="text-lg font-bold text-gray-900">{stats.pending}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><Wallet className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-sm text-gray-500">Approved</p><p className="text-lg font-bold text-gray-900">{stats.approved}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Wallet className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Paid</p><p className="text-lg font-bold text-gray-900">{stats.paid}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><Wallet className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-sm text-gray-500">Outstanding Balance</p><p className="text-lg font-bold text-gray-900">{formatCurrency(stats.outstanding)}</p></div>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search employee or reason..." className="w-64" />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'disbursed', label: 'Disbursed' },
              { value: 'completed', label: 'Completed' },
            ]} className="w-40" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchAdvances} className="gap-2" disabled={loading}><RefreshCw className="w-4 h-4" /> Refresh</Button>
            <Button onClick={openAddModal} className="gap-2"><Plus className="w-4 h-4" /> Record Advance</Button>
          </div>
        </div>

        <Card>
          <CardHeader title={`Showing ${advances.length} of ${totalPages * 20} advances`} />
          <DataTable
            columns={[
              { key: 'employeeName', header: 'Employee Name', className: 'font-medium' },
              { key: 'amount', header: 'Amount', render: (item: Advance) => <span className="font-medium">{formatCurrency(item.amount)}</span> },
              { key: 'reason', header: 'Reason' },
              { key: 'requestedDate', header: 'Requested Date', render: (item: Advance) => formatDate(item.requestedDate) },
              { key: 'approvedBy', header: 'Approved By', render: (item: Advance) => item.approvedByName || item.approvedBy?.name || '-' },
              { key: 'repaymentStartDate', header: 'Repayment Start', render: (item: Advance) => formatDate(item.repaymentStartDate) },
              { key: 'repaymentAmount', header: 'Repayment Amount', render: (item: Advance) => formatCurrency(item.repaymentAmount) },
              { key: 'approvalStatus', header: 'Status', render: (item: Advance) => getStatusBadge(item.approvalStatus) },
              { key: 'remainingBalance', header: 'Remaining Balance', render: (item: Advance) => <span className="font-medium">{formatCurrency(item.remainingBalance)}</span> },
              {
                key: 'actions', header: 'Actions',
                render: (item: Advance) => (
                  <div className="flex gap-1">
                    {item.approvalStatus === 'pending' && (
                      <>
                        <button onClick={() => handleAction(item._id, 'approve')} disabled={actionLoading === item._id + 'approve'} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => handleAction(item._id, 'reject')} disabled={actionLoading === item._id + 'reject'} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Reject"><XCircle className="w-4 h-4" /></button>
                      </>
                    )}
                    <button onClick={() => openDetailModal(item)} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600" title="View"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => openDetailModal(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Details"><FileText className="w-4 h-4" /></button>
                  </div>
                ),
              },
            ]}
            data={advances}
            keyExtractor={(item) => item._id}
            loading={loading}
            pagination={{ page: currentPage, total: totalPages, pages: totalPages, onPageChange: setCurrentPage }}
            emptyMessage="No advances found"
          />
        </Card>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Advance" size="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Employee" value={formData.employee} onChange={(e) => setFormData({ ...formData, employee: e.target.value })} options={[{ value: '', label: 'Select Employee' }, ...employees.map((e) => ({ value: e._id, label: e.name }))]} required />
            <Input label="Amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} type="number" step="0.01" required />
            <Input label="Reason" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="md:col-span-2" />
            <Input label="Repayment Start Date" value={formData.repaymentStartDate} onChange={(e) => setFormData({ ...formData, repaymentStartDate: e.target.value })} type="date" />
            <Input label="Repayment Amount" value={formData.repaymentAmount} onChange={(e) => setFormData({ ...formData, repaymentAmount: e.target.value })} type="number" step="0.01" />
            <Select label="Repayment Frequency" value={formData.repaymentFrequency} onChange={(e) => setFormData({ ...formData, repaymentFrequency: e.target.value })} options={REPAYMENT_FREQUENCY_OPTIONS} />
            <Textarea label="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="md:col-span-2" />
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>Record</Button>
          </div>
        </Modal>

        <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Advance Details" size="lg">
          {selectedAdvance && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">Employee</p><p className="font-medium text-gray-900">{selectedAdvance.employeeName}</p></div>
                <div><p className="text-sm text-gray-500">Amount</p><p className="font-medium text-gray-900">{formatCurrency(selectedAdvance.amount)}</p></div>
                <div><p className="text-sm text-gray-500">Reason</p><p className="font-medium text-gray-900">{selectedAdvance.reason}</p></div>
                <div><p className="text-sm text-gray-500">Requested Date</p><p className="font-medium text-gray-900">{formatDate(selectedAdvance.requestedDate)}</p></div>
                <div><p className="text-sm text-gray-500">Repayment Start</p><p className="font-medium text-gray-900">{formatDate(selectedAdvance.repaymentStartDate)}</p></div>
                <div><p className="text-sm text-gray-500">Repayment Amount</p><p className="font-medium text-gray-900">{formatCurrency(selectedAdvance.repaymentAmount)}</p></div>
                <div><p className="text-sm text-gray-500">Status</p><div>{getStatusBadge(selectedAdvance.approvalStatus)}</div></div>
                <div><p className="text-sm text-gray-500">Approved By</p><p className="font-medium text-gray-900">{selectedAdvance.approvedByName || selectedAdvance.approvedBy?.name || '-'}</p></div>
                <div><p className="text-sm text-gray-500">Remaining Balance</p><p className="font-medium text-gray-900">{formatCurrency(selectedAdvance.remainingBalance)}</p></div>
                {selectedAdvance.branch && <div><p className="text-sm text-gray-500">Branch</p><p className="font-medium text-gray-900">{selectedAdvance.branch.name}</p></div>}
              </div>
              {selectedAdvance.notes && (
                <div><p className="text-sm text-gray-500">Notes</p><p className="font-medium text-gray-900">{selectedAdvance.notes}</p></div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>Close</Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
