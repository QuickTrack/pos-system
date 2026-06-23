'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  Eye,
  CheckCircle2,
  XCircle,
  Trash2,
  Plus,
  Download,
  RefreshCw,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

interface Expense {
  _id: string;
  transactionNumber: string;
  dateTime: string;
  branch: { name: string; code: string } | null;
  department?: string;
  expenseCategory: { name: string } | null;
  expenseSubcategory?: string;
  description: string;
  amount: number;
  paymentSource: string;
  payeeType: string;
  payeeName: string;
  status: string;
  approvedAt?: string;
  approvedByName?: string;
  rejectedAt?: string;
  rejectedByName?: string;
  rejectionReason?: string;
  createdByName: string;
  createdAt: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '20');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (paymentFilter !== 'all') params.set('paymentSource', paymentFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const response = await fetch(`/api/expenses?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setExpenses(result.expenses);
        setTotalPages(result.pagination.pages);
      } else {
        setError(result.error || 'Failed to fetch expenses');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [currentPage, statusFilter, paymentFilter, searchQuery]);

  const handleApprove = async (expense: Expense) => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: expense._id, action: 'approve' }),
      });
      const result = await response.json();
      if (result.success) {
        fetchExpenses();
        setSelectedExpense(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve expense');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedExpense || !rejectionReason.trim()) return;
    try {
      setActionLoading(true);
      const response = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedExpense._id, action: 'reject', rejectionReason }),
      });
      const result = await response.json();
      if (result.success) {
        fetchExpenses();
        setShowRejectionModal(false);
        setRejectionReason('');
        setSelectedExpense(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject expense');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      setActionLoading(true);
      const response = await fetch(`/api/expenses?id=${expense._id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        fetchExpenses();
        setSelectedExpense(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', '1000');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (paymentFilter !== 'all') params.set('paymentSource', paymentFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const response = await fetch(`/api/expenses?${params.toString()}`);
      const result = await response.json();
      if (!result.success) return;

      const worksheetData = [
        ['Expenses Report'],
        [`Generated: ${new Date().toLocaleDateString()}`],
        [''],
        ['Transaction No', 'Date & Time', 'Branch', 'Category', 'Subcategory', 'Description', 'Amount', 'Payment Source', 'Payee', 'Status', 'Created By'],
        ...(result.expenses || []).map((e: Expense) => [
          e.transactionNumber,
          e.dateTime ? new Date(e.dateTime).toLocaleString() : '-',
          e.branch?.name || '-',
          e.expenseCategory?.name || '-',
          e.expenseSubcategory || '-',
          e.description,
          e.amount,
          e.paymentSource.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          e.payeeName,
          e.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          e.createdByName,
        ]),
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      ws['!cols'] = worksheetData[0].map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
      XLSX.writeFile(wb, `expenses_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      pending: 'badge badge-warning',
      approved: 'badge badge-success',
      rejected: 'badge badge-error',
      cancelled: 'badge badge-info',
    };
    return <span className={classes[status] || 'badge'}>{status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>;
  };

  const getPayeeTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const isUserActionable = (expense: Expense) => expense.status === 'pending';
  const canDelete = (expense: Expense) => expense.status === 'pending';

  return (
    <div>
      <Header title="Expenses" subtitle="Manage all business payouts and expenses" />

      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Error loading expenses</p>
            <p className="text-sm">{error}</p>
            <button onClick={fetchExpenses} className="mt-2 text-sm underline hover:text-red-800">
              Retry
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transaction no, description, payee..."
              className="w-64"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
            <Select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Payment Sources' },
                { value: 'cash_drawer', label: 'Cash Drawer' },
                { value: 'main_till', label: 'Main Till' },
                { value: 'petty_cash', label: 'Petty Cash' },
                { value: 'bank_account', label: 'Bank Account' },
                { value: 'mpesa_paybill', label: 'M-Pesa Paybill' },
                { value: 'mpesa_till', label: 'M-Pesa Till' },
                { value: 'business_number', label: 'Business Number' },
              ]}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="gap-2" disabled={loading}>
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button variant="outline" onClick={fetchExpenses} className="gap-2" disabled={loading}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Link href="/expenses/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Expense
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader
            title="Expenses List"
            subtitle={`Showing ${expenses.length} of ${totalPages * 20} expense records`}
          />
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction No</th>
                  <th>Date & Time</th>
                  <th>Branch</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Payment Source</th>
                  <th>Payee</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length > 0 ? (
                  expenses.map((expense) => (
                    <tr key={expense._id}>
                      <td className="font-medium">{expense.transactionNumber}</td>
                      <td className="text-gray-500">{formatDateTime(expense.dateTime)}</td>
                      <td>{expense.branch?.name || '-'}</td>
                      <td>{expense.expenseCategory?.name || '-'}</td>
                      <td className="max-w-xs truncate" title={expense.description}>
                        {expense.description}
                      </td>
                      <td className="font-medium">{formatCurrency(expense.amount)}</td>
                      <td>
                        <span className="badge badge-info">
                          {expense.paymentSource.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </td>
                      <td>{expense.payeeName}</td>
                      <td>{getStatusBadge(expense.status)}</td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setSelectedExpense(expense)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isUserActionable(expense) && (
                            <>
                              <button
                                onClick={() => handleApprove(expense)}
                                disabled={actionLoading}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
                                title="Approve"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedExpense(expense);
                                  setShowRejectionModal(true);
                                }}
                                disabled={actionLoading}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {canDelete(expense) && (
                            <button
                              onClick={() => handleDelete(expense)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-gray-500">
                      No expenses found. <Link href="/expenses/new" className="text-emerald-600 hover:underline">Create your first expense</Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {selectedExpense && !showRejectionModal && (
          <Modal
            isOpen={!!selectedExpense && !showRejectionModal}
            onClose={() => setSelectedExpense(null)}
            title="Expense Details"
            size="lg"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Transaction Number</p>
                  <p className="font-medium">{selectedExpense.transactionNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedExpense.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date & Time</p>
                  <p className="font-medium">{formatDateTime(selectedExpense.dateTime)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Branch</p>
                  <p className="font-medium">{selectedExpense.branch?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium">{selectedExpense.expenseCategory?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Subcategory</p>
                  <p className="font-medium">{selectedExpense.expenseSubcategory || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium">{selectedExpense.department || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-medium text-lg">{formatCurrency(selectedExpense.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Source</p>
                  <p className="font-medium capitalize">
                    {selectedExpense.paymentSource.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payee Type</p>
                  <p className="font-medium">{getPayeeTypeLabel(selectedExpense.payeeType)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="font-medium">{selectedExpense.description}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created By</p>
                  <p className="font-medium">{selectedExpense.createdByName}</p>
                </div>
                {selectedExpense.approvedByName && (
                  <div>
                    <p className="text-sm text-gray-500">Approved By</p>
                    <p className="font-medium">{selectedExpense.approvedByName}</p>
                  </div>
                )}
                {selectedExpense.approvedAt && (
                  <div>
                    <p className="text-sm text-gray-500">Approved At</p>
                    <p className="font-medium">{formatDateTime(selectedExpense.approvedAt)}</p>
                  </div>
                )}
                {selectedExpense.rejectedByName && (
                  <div>
                    <p className="text-sm text-gray-500">Rejected By</p>
                    <p className="font-medium">{selectedExpense.rejectedByName}</p>
                  </div>
                )}
                {selectedExpense.rejectionReason && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Rejection Reason</p>
                    <p className="font-medium text-red-600">{selectedExpense.rejectionReason}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                {isUserActionable(selectedExpense) && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleApprove(selectedExpense)}
                      disabled={actionLoading}
                      className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowRejectionModal(true)}
                      disabled={actionLoading}
                      className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => setSelectedExpense(null)}>
                  Close
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {showRejectionModal && selectedExpense && (
          <Modal
            isOpen={showRejectionModal}
            onClose={() => {
              setShowRejectionModal(false);
              setRejectionReason('');
            }}
            title="Reject Expense"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                You are about to reject expense <strong>{selectedExpense.transactionNumber}</strong> for{' '}
                <strong>{formatCurrency(selectedExpense.amount)}</strong>.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px]"
                  disabled={actionLoading}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectionModal(false);
                    setRejectionReason('');
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
