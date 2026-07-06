'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileText, Eye, Printer, Download, RefreshCw, Search } from 'lucide-react';

interface Payslip {
  _id: string;
  referenceNumber: string;
  employeeName: string;
  employeeNumber: string;
  payPeriodStart?: string;
  payPeriodEnd?: string;
  payrollRun?: { name: string; periodStart: string; periodEnd: string } | null;
  grossEarnings?: number;
  totalDeductions?: number;
  netSalary?: number;
  paye?: number;
  nssfEmployee?: number;
  shifEmployee?: number;
  housingLevy?: number;
  paymentMethod?: string;
  paymentStatus: string;
  paymentDate?: string;
  branch?: { name: string; code: string } | null;
}

interface PayslipStats {
  total: number;
  paid: number;
  pending: number;
  totalPaid: number;
}

const PAYMENT_METHOD_OPTIONS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
];

const STATUS_CLASSES: Record<string, string> = {
  pending: 'badge-warning',
  paid: 'badge-success',
  failed: 'badge-danger',
  processing: 'badge-info',
};

export default function PayrollPayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '20');
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (statusFilter !== 'all') params.set('paymentStatus', statusFilter);

      const response = await fetch(`/api/payroll/payslips?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setPayslips(result.payslips || []);
        setTotalPages(result.pagination?.pages || 1);
      } else {
        setError(result.error || 'Failed to fetch payslips');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, [currentPage, statusFilter, searchQuery]);

  const openViewModal = (payslip: Payslip) => {
    setSelectedPayslip(payslip);
    setShowModal(true);
  };

  const handlePrint = (payslip: Payslip) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Payslip ${payslip.referenceNumber}</title></head><body style="font-family:sans-serif;padding:24px">`);
    win.document.write(`<h2>Payslip ${payslip.referenceNumber}</h2>`);
    win.document.write(`<p>Employee: ${payslip.employeeName}</p>`);
    win.document.write(`<p>Period: ${formatDate(payslip.payPeriodStart)} - ${formatDate(payslip.payPeriodEnd)}</p>`);
    win.document.write(`<p>Gross Pay: ${formatCurrency(payslip.grossEarnings || 0)}</p>`);
    win.document.write(`<p>Deductions: ${formatCurrency(payslip.totalDeductions || 0)}</p>`);
    win.document.write(`<p>Net Pay: ${formatCurrency(payslip.netSalary || 0)}</p>`);
    win.document.write(`</body></html>`);
    win.document.close();
    win.print();
  };

  const handleDownload = (payslip: Payslip) => {
    const content = `Payslip ${payslip.referenceNumber}\nEmployee: ${payslip.employeeName}\nPeriod: ${formatDate(payslip.payPeriodStart)} - ${formatDate(payslip.payPeriodEnd)}\nGross Pay: ${formatCurrency(payslip.grossEarnings || 0)}\nDeductions: ${formatCurrency(payslip.totalDeductions || 0)}\nNet Pay: ${formatCurrency(payslip.netSalary || 0)}\nPAYE: ${formatCurrency(payslip.paye || 0)}\nNSSF: ${formatCurrency(payslip.nssfEmployee || 0)}\nSHIF: ${formatCurrency(payslip.shifEmployee || 0)}\nHousing Levy: ${formatCurrency(payslip.housingLevy || 0)}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip-${payslip.referenceNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats: PayslipStats = {
    total: payslips.length,
    paid: payslips.filter((p) => p.paymentStatus === 'paid').length,
    pending: payslips.filter((p) => p.paymentStatus === 'pending' || p.paymentStatus === 'processing').length,
    totalPaid: payslips.filter((p) => p.paymentStatus === 'paid').reduce((s, p) => s + (p.netSalary || 0), 0),
  };

  const getStatusBadge = (status: string) => (
    <Badge variant={STATUS_CLASSES[status] === 'badge-success' ? 'success' : STATUS_CLASSES[status] === 'badge-danger' ? 'danger' : STATUS_CLASSES[status] === 'badge-info' ? 'blue' : 'warning'}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
    </Badge>
  );

  const getPeriodLabel = (p: Payslip) => {
    const start = p.payrollRun?.periodStart || p.payPeriodStart;
    const end = p.payrollRun?.periodEnd || p.payPeriodEnd;
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  return (
    <div>
      <Header title="Payslips" subtitle="Manage and view payslips" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchPayslips}>Retry</Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><FileText className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-sm text-gray-500">Total Payslips</p><p className="text-lg font-bold text-gray-900">{stats.total}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><FileText className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-sm text-gray-500">Paid</p><p className="text-lg font-bold text-gray-900">{stats.paid}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg"><FileText className="w-5 h-5 text-yellow-600" /></div>
            <div><p className="text-sm text-gray-500">Pending</p><p className="text-lg font-bold text-gray-900">{stats.pending}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><FileText className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total Paid Amount</p><p className="text-lg font-bold text-gray-900">{formatCurrency(stats.totalPaid)}</p></div>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by reference no..." className="w-64 pl-9" />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[
              { value: 'all', label: 'All Status' },
              { value: 'paid', label: 'Paid' },
              { value: 'pending', label: 'Pending' },
              { value: 'processing', label: 'Processing' },
              { value: 'failed', label: 'Failed' },
            ]} className="w-40" />
            <Select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} options={[
              { value: 'all', label: 'All Periods' },
              { value: 'current', label: 'Current Period' },
              { value: 'last', label: 'Last Period' },
            ]} className="w-40" />
          </div>
          <Button variant="outline" onClick={fetchPayslips} className="gap-2" disabled={loading}><RefreshCw className="w-4 h-4" /> Refresh</Button>
        </div>

        <Card>
          <CardHeader title={`Showing ${payslips.length} of ${totalPages * 20} payslips`} />
          <DataTable
            columns={[
              { key: 'referenceNumber', header: 'Reference Number', className: 'font-medium' },
              { key: 'employeeName', header: 'Employee Name', className: 'font-medium' },
              { key: 'period', header: 'Period', render: (item: Payslip) => getPeriodLabel(item) },
              { key: 'grossEarnings', header: 'Gross Pay', render: (item: Payslip) => formatCurrency(item.grossEarnings || 0) },
              { key: 'totalDeductions', header: 'Deductions', render: (item: Payslip) => formatCurrency(item.totalDeductions || 0) },
              { key: 'netSalary', header: 'Net Pay', render: (item: Payslip) => <span className="font-medium">{formatCurrency(item.netSalary || 0)}</span> },
              { key: 'paye', header: 'PAYE', render: (item: Payslip) => formatCurrency(item.paye || 0) },
              { key: 'nssfEmployee', header: 'NSSF', render: (item: Payslip) => formatCurrency(item.nssfEmployee || 0) },
              { key: 'shifEmployee', header: 'SHIF', render: (item: Payslip) => formatCurrency(item.shifEmployee || 0) },
              { key: 'housingLevy', header: 'Housing Levy', render: (item: Payslip) => formatCurrency(item.housingLevy || 0) },
              { key: 'paymentMethod', header: 'Payment Method', render: (item: Payslip) => item.paymentMethod?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || '-' },
              { key: 'paymentStatus', header: 'Payment Status', render: (item: Payslip) => getStatusBadge(item.paymentStatus) },
              { key: 'paymentDate', header: 'Payment Date', render: (item: Payslip) => formatDate(item.paymentDate) },
              {
                key: 'actions', header: 'Actions',
                render: (item: Payslip) => (
                  <div className="flex gap-1">
                    <button onClick={() => openViewModal(item)} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600" title="View"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => handlePrint(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Print"><Printer className="w-4 h-4" /></button>
                    <button onClick={() => handleDownload(item)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Download"><Download className="w-4 h-4" /></button>
                  </div>
                ),
              },
            ]}
            data={payslips}
            keyExtractor={(item) => item._id}
            loading={loading}
            pagination={{ page: currentPage, total: totalPages, pages: totalPages, onPageChange: setCurrentPage }}
            emptyMessage="No payslips found"
          />
        </Card>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Payslip Details" size="lg">
          {selectedPayslip && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">Reference Number</p><p className="font-medium text-gray-900">{selectedPayslip.referenceNumber}</p></div>
                <div><p className="text-sm text-gray-500">Employee</p><p className="font-medium text-gray-900">{selectedPayslip.employeeName}</p></div>
                <div><p className="text-sm text-gray-500">Period</p><p className="font-medium text-gray-900">{getPeriodLabel(selectedPayslip)}</p></div>
                <div><p className="text-sm text-gray-500">Payment Method</p><p className="font-medium text-gray-900">{selectedPayslip.paymentMethod?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || '-'}</p></div>
                <div><p className="text-sm text-gray-500">Gross Pay</p><p className="font-medium text-gray-900">{formatCurrency(selectedPayslip.grossEarnings || 0)}</p></div>
                <div><p className="text-sm text-gray-500">Deductions</p><p className="font-medium text-gray-900">{formatCurrency(selectedPayslip.totalDeductions || 0)}</p></div>
                <div><p className="text-sm text-gray-500">Net Pay</p><p className="font-medium text-gray-900">{formatCurrency(selectedPayslip.netSalary || 0)}</p></div>
                <div><p className="text-sm text-gray-500">Payment Status</p><div>{getStatusBadge(selectedPayslip.paymentStatus)}</div></div>
                <div><p className="text-sm text-gray-500">PAYE</p><p className="font-medium text-gray-900">{formatCurrency(selectedPayslip.paye || 0)}</p></div>
                <div><p className="text-sm text-gray-500">NSSF</p><p className="font-medium text-gray-900">{formatCurrency(selectedPayslip.nssfEmployee || 0)}</p></div>
                <div><p className="text-sm text-gray-500">SHIF</p><p className="font-medium text-gray-900">{formatCurrency(selectedPayslip.shifEmployee || 0)}</p></div>
                <div><p className="text-sm text-gray-500">Housing Levy</p><p className="font-medium text-gray-900">{formatCurrency(selectedPayslip.housingLevy || 0)}</p></div>
                <div><p className="text-sm text-gray-500">Payment Date</p><p className="font-medium text-gray-900">{formatDate(selectedPayslip.paymentDate)}</p></div>
                {selectedPayslip.branch && <div><p className="text-sm text-gray-500">Branch</p><p className="font-medium text-gray-900">{selectedPayslip.branch.name}</p></div>}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowModal(false)}>Close</Button>
            {selectedPayslip && <Button onClick={() => handlePrint(selectedPayslip)} className="gap-2"><Printer className="w-4 h-4" /> Print</Button>}
          </div>
        </Modal>
      </div>
    </div>
  );
}
