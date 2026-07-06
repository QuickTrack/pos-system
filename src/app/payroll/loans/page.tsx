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
import { Landmark, Plus, Eye, CheckCircle, XCircle, RefreshCw, FileText } from 'lucide-react';

interface Loan {
  _id: string;
  employeeName: string;
  employeeNumber: string;
  loanType: string;
  amount: number;
  interestRate: number;
  totalRepayment: number;
  approvedBy: { name: string } | null;
  approvedByName?: string;
  startDate: string;
  endDate?: string;
  approvalStatus: string;
  remainingBalance: number;
  purpose?: string;
  notes?: string;
  branch?: { name: string; code: string } | null;
}

interface EmployeeOption {
  _id: string;
  name: string;
  employeeNumber?: string;
}

interface LoanStats {
  total: number;
  pending: number;
  active: number;
  completed: number;
  outstanding: number;
}

const LOAN_TYPE_OPTIONS = [
  { value: 'company_loan', label: 'Company Loan' },
  { value: 'emergency_loan', label: 'Emergency Loan' },
  { value: 'welfare_loan', label: 'Welfare Loan' },
];

const INSTALLMENT_FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'one_time', label: 'One Time' },
];

const STATUS_CLASSES: Record<string, string> = {
  pending: 'badge-warning',
  approved: 'badge-info',
  rejected: 'badge-danger',
  active: 'badge-success',
  completed: 'badge-gray',
};

export default function PayrollLoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loanTypeFilter, setLoanTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employee: '',
    amount: '0',
    loanType: 'company_loan',
    interestRate: '0',
    purpose: '',
    installmentAmount: '0',
    installmentFrequency: 'monthly',
    totalInstallments: '1',
    startDate: '',
    notes: '',
  });

  const fetchLoans = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '20');
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (statusFilter !== 'all') params.set('approvalStatus', statusFilter);
      if (loanTypeFilter !== 'all') params.set('loanType', loanTypeFilter);

      const response = await fetch(`/api/payroll/loans?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setLoans(result.loans || []);
        setTotalPages(result.pagination?.pages || 1);
      } else {
        setError(result.error || 'Failed to fetch loans');
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
    fetchLoans();
    fetchEmployees();
  }, [currentPage, statusFilter, loanTypeFilter, searchQuery]);

  const openAddModal = () => {
    setFormData({
      employee: '',
      amount: '0',
      loanType: 'company_loan',
      interestRate: '0',
      purpose: '',
      installmentAmount: '0',
      installmentFrequency: 'monthly',
      totalInstallments: '1',
      startDate: '',
      notes: '',
    });
    setShowModal(true);
  };

  const openDetailModal = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowDetailModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const response = await fetch('/api/payroll/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: formData.employee,
          amount: parseFloat(formData.amount) || 0,
          loanType: formData.loanType,
          interestRate: parseFloat(formData.interestRate) || 0,
          purpose: formData.purpose,
          installmentAmount: parseFloat(formData.installmentAmount) || 0,
          installmentFrequency: formData.installmentFrequency,
          totalInstallments: parseInt(formData.totalInstallments) || 1,
          startDate: formData.startDate,
          notes: formData.notes,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setShowModal(false);
        fetchLoans();
      } else {
        setError(result.error || 'Failed to create loan');
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
      const response = await fetch('/api/payroll/loans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const result = await response.json();
      if (result.success) {
        fetchLoans();
      } else {
        setError(result.error || 'Action failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const stats: LoanStats = {
    total: loans.reduce((s, l) => s + (l.amount || 0), 0),
    pending: loans.filter((l) => l.approvalStatus === 'pending').length,
    active: loans.filter((l) => l.approvalStatus === 'active').length,
    completed: loans.filter((l) => l.approvalStatus === 'completed').length,
    outstanding: loans.reduce((s, l) => s + (l.remainingBalance || 0), 0),
  };

  const getLoanTypeBadge = (type: string) => {
    const classes: Record<string, any> = {
      company_loan: 'blue',
      emergency_loan: 'warning',
      welfare_loan: 'purple',
    };
    const label = LOAN_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;
    return <Badge variant={classes[type] || 'gray'}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => (
    <Badge variant={STATUS_CLASSES[status] === 'badge-success' ? 'success' : STATUS_CLASSES[status] === 'badge-danger' ? 'danger' : STATUS_CLASSES[status] === 'badge-info' ? 'blue' : STATUS_CLASSES[status] === 'badge-warning' ? 'warning' : 'gray'}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
    </Badge>
  );

  return (
    <div>
      <Header title="Loans" subtitle="Manage employee loans" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLoans}>Retry</Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><Landmark className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-sm text-gray-500">Total Loans</p><p className="text-lg font-bold text-gray-900">{formatCurrency(stats.total)}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg"><Landmark className="w-5 h-5 text-yellow-600" /></div>
            <div><p className="text-sm text-gray-500">Pending</p><p className="text-lg font-bold text-gray-900">{stats.pending}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><Landmark className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-sm text-gray-500">Active</p><p className="text-lg font-bold text-gray-900">{stats.active}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-lg"><Landmark className="w-5 h-5 text-gray-600" /></div>
            <div><p className="text-sm text-gray-500">Completed</p><p className="text-lg font-bold text-gray-900">{stats.completed}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><Landmark className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-sm text-gray-500">Outstanding Balance</p><p className="text-lg font-bold text-gray-900">{formatCurrency(stats.outstanding)}</p></div>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search employee or purpose..." className="w-64" />
            <Select value={loanTypeFilter} onChange={(e) => setLoanTypeFilter(e.target.value)} options={[{ value: 'all', label: 'All Loan Types' }, ...LOAN_TYPE_OPTIONS]} className="w-48" />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'rejected', label: 'Rejected' },
            ]} className="w-40" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchLoans} className="gap-2" disabled={loading}><RefreshCw className="w-4 h-4" /> Refresh</Button>
            <Button onClick={openAddModal} className="gap-2"><Plus className="w-4 h-4" /> Create Loan</Button>
          </div>
        </div>

        <Card>
          <CardHeader title={`Showing ${loans.length} of ${totalPages * 20} loans`} />
          <DataTable
            columns={[
              { key: 'employeeName', header: 'Employee Name', className: 'font-medium' },
              { key: 'loanType', header: 'Loan Type', render: (item: Loan) => getLoanTypeBadge(item.loanType) },
              { key: 'amount', header: 'Amount', render: (item: Loan) => <span className="font-medium">{formatCurrency(item.amount)}</span> },
              { key: 'interestRate', header: 'Interest Rate', render: (item: Loan) => `${item.interestRate || 0}%` },
              { key: 'totalRepayment', header: 'Total Repayment', render: (item: Loan) => formatCurrency(item.totalRepayment) },
              { key: 'approvedBy', header: 'Approved By', render: (item: Loan) => item.approvedByName || item.approvedBy?.name || '-' },
              { key: 'startDate', header: 'Start Date', render: (item: Loan) => formatDate(item.startDate) },
              { key: 'endDate', header: 'End Date', render: (item: Loan) => formatDate(item.endDate) },
              { key: 'approvalStatus', header: 'Status', render: (item: Loan) => getStatusBadge(item.approvalStatus) },
              { key: 'remainingBalance', header: 'Remaining Balance', render: (item: Loan) => <span className="font-medium">{formatCurrency(item.remainingBalance)}</span> },
              {
                key: 'actions', header: 'Actions',
                render: (item: Loan) => (
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
            data={loans}
            keyExtractor={(item) => item._id}
            loading={loading}
            pagination={{ page: currentPage, total: totalPages, pages: totalPages, onPageChange: setCurrentPage }}
            emptyMessage="No loans found"
          />
        </Card>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Loan" size="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Employee" value={formData.employee} onChange={(e) => setFormData({ ...formData, employee: e.target.value })} options={[{ value: '', label: 'Select Employee' }, ...employees.map((e) => ({ value: e._id, label: e.name }))]} required />
            <Select label="Loan Type" value={formData.loanType} onChange={(e) => setFormData({ ...formData, loanType: e.target.value })} options={LOAN_TYPE_OPTIONS} required />
            <Input label="Amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} type="number" step="0.01" required />
            <Input label="Interest Rate (%)" value={formData.interestRate} onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })} type="number" step="0.01" />
            <Input label="Purpose" value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} className="md:col-span-2" />
            <Input label="Installment Amount" value={formData.installmentAmount} onChange={(e) => setFormData({ ...formData, installmentAmount: e.target.value })} type="number" step="0.01" />
            <Select label="Installment Frequency" value={formData.installmentFrequency} onChange={(e) => setFormData({ ...formData, installmentFrequency: e.target.value })} options={INSTALLMENT_FREQUENCY_OPTIONS} />
            <Input label="Total Installments" value={formData.totalInstallments} onChange={(e) => setFormData({ ...formData, totalInstallments: e.target.value })} type="number" />
            <Input label="Start Date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} type="date" />
            <Textarea label="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="md:col-span-2" />
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>Create</Button>
          </div>
        </Modal>

        <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Loan Details" size="lg">
          {selectedLoan && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">Employee</p><p className="font-medium text-gray-900">{selectedLoan.employeeName}</p></div>
                <div><p className="text-sm text-gray-500">Loan Type</p><div>{getLoanTypeBadge(selectedLoan.loanType)}</div></div>
                <div><p className="text-sm text-gray-500">Amount</p><p className="font-medium text-gray-900">{formatCurrency(selectedLoan.amount)}</p></div>
                <div><p className="text-sm text-gray-500">Interest Rate</p><p className="font-medium text-gray-900">{selectedLoan.interestRate || 0}%</p></div>
                <div><p className="text-sm text-gray-500">Total Repayment</p><p className="font-medium text-gray-900">{formatCurrency(selectedLoan.totalRepayment)}</p></div>
                <div><p className="text-sm text-gray-500">Start Date</p><p className="font-medium text-gray-900">{formatDate(selectedLoan.startDate)}</p></div>
                <div><p className="text-sm text-gray-500">End Date</p><p className="font-medium text-gray-900">{formatDate(selectedLoan.endDate)}</p></div>
                <div><p className="text-sm text-gray-500">Status</p><div>{getStatusBadge(selectedLoan.approvalStatus)}</div></div>
                <div><p className="text-sm text-gray-500">Approved By</p><p className="font-medium text-gray-900">{selectedLoan.approvedByName || selectedLoan.approvedBy?.name || '-'}</p></div>
                <div><p className="text-sm text-gray-500">Remaining Balance</p><p className="font-medium text-gray-900">{formatCurrency(selectedLoan.remainingBalance)}</p></div>
                {selectedLoan.branch && <div><p className="text-sm text-gray-500">Branch</p><p className="font-medium text-gray-900">{selectedLoan.branch.name}</p></div>}
              </div>
              {selectedLoan.purpose && <div><p className="text-sm text-gray-500">Purpose</p><p className="font-medium text-gray-900">{selectedLoan.purpose}</p></div>}
              {selectedLoan.notes && <div><p className="text-sm text-gray-500">Notes</p><p className="font-medium text-gray-900">{selectedLoan.notes}</p></div>}
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
