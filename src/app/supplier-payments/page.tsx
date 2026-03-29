'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, RefreshCw, Eye, DollarSign, FileText, CheckCircle } from 'lucide-react';
import { InvoiceSelectionModal } from '@/components/supplier/InvoiceSelectionModal';

interface Supplier {
  _id: string;
  name: string;
  phone?: string;
}

interface SupplierPayment {
  _id: string;
  supplier: { _id: string; name: string };
  supplierName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  invoiceNumbers: string[];
  status: string;
  notes?: string;
  createdAt: string;
}

interface SupplierInvoice {
  orderNumber: string;
  total: number;
  amountPaid: number;
  balance: number;
  status: string;
  paymentStatus: string;
  orderDate: string;
}

interface SupplierInvoices {
  supplierId: string;
  supplierName: string;
  invoices: SupplierInvoice[];
  totalOutstanding: number;
}

export default function SupplierPaymentsPage() {
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showInvoiceSelectionModal, setShowInvoiceSelectionModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<SupplierPayment | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoices[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    supplierId: '',
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cheque',
    notes: '',
    // Cheque fields
    chequeNumber: '',
    bankName: '',
    bankBranch: '',
    // M-Pesa fields
    mpesaTransactionId: '',
  });

  useEffect(() => {
    fetchPayments();
    fetchSuppliers();
    fetchSupplierInvoices();
  }, [status, startDate, endDate]);

  const fetchPayments = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (status) params.set('status', status);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/supplier-payments?${params}`);
      const data = await response.json();

      if (data.success) setPayments(data.payments);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers');
      const data = await response.json();
      if (data.success) setSuppliers(data.suppliers);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const fetchSupplierInvoices = async () => {
    try {
      const response = await fetch('/api/purchases/supplier-invoices');
      const data = await response.json();
      if (data.success) setSupplierInvoices(data.supplierInvoices);
    } catch (error) {
      console.error('Failed to fetch supplier invoices:', error);
    }
  };

  const handleSupplierChange = (supplierId: string) => {
    setFormData({ ...formData, supplierId });
    const supplierData = supplierInvoices.find(s => s.supplierId === supplierId);
    setSelectedInvoices(supplierData?.invoices.map(i => i.orderNumber) || []);
  };

  const handleInvoiceSelection = (invoices: any[], totalAmount: number) => {
    setSelectedInvoiceDetails(invoices);
    setSelectedInvoices(invoices.map(inv => inv.invoiceNumber));
    setFormData({ ...formData, amount: totalAmount });
  };

  const toggleInvoice = (orderNumber: string) => {
    setSelectedInvoices(prev => 
      prev.includes(orderNumber) 
        ? prev.filter(n => n !== orderNumber)
        : [...prev, orderNumber]
    );
  };

  const createPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          invoiceNumbers: selectedInvoices,
        }),
      });
      
      if (response.ok) {
        setShowCreateModal(false);
        fetchPayments();
        fetchSupplierInvoices();
        setFormData({
          supplierId: '',
          amount: 0,
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'cheque',
          notes: '',
          chequeNumber: '',
          bankName: '',
          bankBranch: '',
          mpesaTransactionId: '',
        });
      }
    } catch (error) {
      console.error('Failed to create payment:', error);
    }
  };

  const recordPayment = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/supplier-payments/${paymentId}/record`, {
        method: 'POST',
      });
      
      if (response.ok) {
        fetchPayments();
        fetchSupplierInvoices();
      }
    } catch (error) {
      console.error('Failed to record payment:', error);
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    
    try {
      const response = await fetch(`/api/supplier-payments/${paymentId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchPayments();
        fetchSupplierInvoices();
      }
    } catch (error) {
      console.error('Failed to delete payment:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      partial: 'bg-purple-100 text-purple-700',
      paid: 'bg-emerald-100 text-emerald-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const columns = [
    {
      key: 'supplierName',
      header: 'Supplier',
      render: (item: SupplierPayment) => (
        <span className="font-medium">{item.supplier?.name || item.supplierName}</span>
      ),
    },
    {
      key: 'invoiceNumbers',
      header: 'Invoices',
      render: (item: SupplierPayment) => (
        <span className="text-sm text-gray-600">
          {item.invoiceNumbers?.length || 0} invoice(s)
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: SupplierPayment) => (
        <span className="font-medium">{formatCurrency(item.amount)}</span>
      ),
    },
    {
      key: 'paymentDate',
      header: 'Date',
      render: (item: SupplierPayment) => (
        <span className="text-sm text-gray-500">{formatDate(item.paymentDate)}</span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      render: (item: SupplierPayment) => (
        <span className="capitalize text-sm">{item.paymentMethod}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: SupplierPayment) => (
        <span className={`badge ${getStatusBadge(item.status)} capitalize`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: SupplierPayment) => (
        <div className="flex gap-2">
          {item.status !== 'paid' && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => recordPayment(item._id)}
              title="Record Payment"
            >
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setSelectedPayment(item);
              setShowDetailsModal(true);
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => deletePayment(item._id)}
          >
            <span className="text-red-500">×</span>
          </Button>
        </div>
      ),
    },
  ];

  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  const pendingPayments = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const paidPayments = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

  // Get selected supplier's pending invoices for display
  const selectedSupplierData = supplierInvoices.find(s => s.supplierId === formData.supplierId);

  return (
    <div>
      <Header title="Supplier Payments" subtitle="Manage Supplier Payments" />
      
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
          <input
            type="date"
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
          />
          <input
            type="date"
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
          />
          <Button variant="outline" onClick={fetchPayments} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Payment
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Payments</p>
            <p className="text-2xl font-bold">{formatCurrency(totalPayments)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(pendingPayments)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Recorded</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(paidPayments)}</p>
          </Card>
        </div>

        {/* Payments Table */}
        <Card>
          <CardHeader 
            title="All Payments" 
            subtitle={`${payments.length} payments`}
          />
          <DataTable
            columns={columns}
            data={payments}
            keyExtractor={(item) => item._id}
            loading={loading}
            emptyMessage="No payments found"
          />
        </Card>
      </div>

      {/* Create Payment Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Record Supplier Payment"
        size="lg"
      >
        <form onSubmit={createPayment} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={formData.supplierId}
                onChange={(e) => handleSupplierChange(e.target.value)}
                required
              >
                <option value="">Select a supplier</option>
                {suppliers.map(supplier => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Input
                label="Payment Amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Payment Date"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              />
            </div>
            <div>
              <Select
                label="Payment Method"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                options={[
                  { value: 'cheque', label: 'Cheque' },
                  { value: 'cash', label: 'Cash' },
                  { value: 'mpesa', label: 'M-Pesa' },
                  { value: 'card', label: 'Card' },
                  { value: 'bank_transfer', label: 'Bank Transfer' },
                  { value: 'credit', label: 'Credit' },
                ]}
              />
            </div>
          </div>

          {/* Cheque Fields */}
          {formData.paymentMethod === 'cheque' && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Input
                  label="Cheque Number"
                  value={formData.chequeNumber}
                  onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                  placeholder="Enter cheque number"
                  required
                />
              </div>
              <div>
                <Input
                  label="Bank Name"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="Enter bank name"
                  required
                />
              </div>
              <div>
                <Input
                  label="Bank Branch"
                  value={formData.bankBranch}
                  onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                  placeholder="Enter bank branch"
                  required
                />
              </div>
            </div>
          )}

          {/* M-Pesa Fields */}
          {formData.paymentMethod === 'mpesa' && (
            <div>
              <Input
                label="M-Pesa Transaction ID"
                value={formData.mpesaTransactionId}
                onChange={(e) => setFormData({ ...formData, mpesaTransactionId: e.target.value })}
                placeholder="Enter M-Pesa transaction ID"
                required
              />
            </div>
          )}

          {/* Invoice Selection */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Invoices for Payment</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowInvoiceSelectionModal(true)}
                disabled={!formData.supplierId}
              >
                Select Invoices
              </Button>
            </div>
            
            {selectedInvoiceDetails.length > 0 ? (
              <div className="space-y-2">
                {selectedInvoiceDetails.map((invoice) => (
                  <div
                    key={invoice._id}
                    className="flex items-center justify-between p-3 bg-white rounded border border-gray-200"
                  >
                    <div>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(invoice.invoiceDate)} • Due: {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(invoice.balance)}</p>
                      <p className="text-xs text-gray-400">
                        {invoice.items?.length || 0} item(s)
                      </p>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Total Selected:</span>
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(selectedInvoiceDetails.reduce((sum, inv) => sum + inv.balance, 0))}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                {formData.supplierId 
                  ? 'Click "Select Invoices" to choose invoices for payment'
                  : 'Select a supplier first'}
              </p>
            )}
          </div>

          <Input
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Optional notes"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payment Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Payment Details"
        size="md"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Supplier</p>
                <p className="font-medium">{selectedPayment.supplier?.name || selectedPayment.supplierName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`badge ${getStatusBadge(selectedPayment.status)} capitalize`}>
                  {selectedPayment.status}
                </span>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="text-xl font-bold">{formatCurrency(selectedPayment.amount)}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{formatDate(selectedPayment.paymentDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Method</p>
                <p className="capitalize">{selectedPayment.paymentMethod}</p>
              </div>
            </div>
            
            {selectedPayment.invoiceNumbers && selectedPayment.invoiceNumbers.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Linked Invoices</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPayment.invoiceNumbers.map(inv => (
                    <span key={inv} className="badge bg-gray-100 text-gray-700">{inv}</span>
                  ))}
                </div>
              </div>
            )}
            
            {selectedPayment.notes && (
              <div>
                <p className="text-sm text-gray-500">Notes</p>
                <p>{selectedPayment.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              {selectedPayment.status !== 'paid' && (
                <Button onClick={() => {
                  recordPayment(selectedPayment._id);
                  setShowDetailsModal(false);
                }}>
                  Mark as Recorded
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Invoice Selection Modal */}
      <InvoiceSelectionModal
        isOpen={showInvoiceSelectionModal}
        onClose={() => setShowInvoiceSelectionModal(false)}
        onSelect={handleInvoiceSelection}
        supplierId={formData.supplierId}
        supplierName={suppliers.find(s => s._id === formData.supplierId)?.name}
      />
    </div>
  );
}