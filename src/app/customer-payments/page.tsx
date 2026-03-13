'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, RefreshCw, Eye, DollarSign, FileText, CheckCircle } from 'lucide-react';

interface Customer {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface CustomerPayment {
  _id: string;
  paymentId: string;
  customer: { _id: string; name: string };
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  invoiceNumbers: string[];
  status: string;
  notes?: string;
  createdAt: string;
}

interface CustomerInvoice {
  invoiceNumber: string;
  total: number;
  amountPaid: number;
  balance: number;
  status: string;
  paymentStatus: string;
  saleDate: string;
}

interface CustomerInvoices {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  invoices: CustomerInvoice[];
  totalOutstanding: number;
}

export default function CustomerPaymentsPage() {
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCustomerSelectModal, setShowCustomerSelectModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<CustomerPayment | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoices[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [searchedCustomers, setSearchedCustomers] = useState<Customer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const customerSearchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const [formData, setFormData] = useState({
    customerId: '',
    amount: 0,
    paymentDate: '',
    paymentMethod: 'cash',
    referenceNumber: '',
    notes: '',
  });

  useEffect(() => {
    fetchPayments();
    fetchCustomers();
    fetchCustomerInvoices();
  }, [status, startDate, endDate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.customer-dropdown')) {
        setShowCustomerDropdown(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Reset form when modal closes
  useEffect(() => {
    if (!showCreateModal) {
      setCustomerSearchQuery('');
      setSearchedCustomers([]);
      setShowCustomerDropdown(false);
      setFormData({
        customerId: '',
        amount: 0,
        paymentDate: '',
        paymentMethod: 'cash',
        referenceNumber: '',
        notes: '',
      });
    }
  }, [showCreateModal]);

  const fetchPayments = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (status) params.set('status', status);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/customer-payments?${params}`);
      const data = await response.json();

      if (data.success) setPayments(data.payments);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();
      if (data.success) setCustomers(data.customers);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const fetchCustomerInvoices = async () => {
    try {
      const response = await fetch('/api/sales/customer-invoices');
      const data = await response.json();
      if (data.success) setCustomerInvoices(data.customerInvoices);
    } catch (error) {
      console.error('Failed to fetch customer invoices:', error);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    setFormData({ ...formData, customerId });
    const customerData = customerInvoices.find(c => c.customerId === customerId);
    setSelectedInvoices(customerData?.invoices.map(i => i.invoiceNumber) || []);
  };

  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      setSearchedCustomers([]);
      return;
    }
    setSearchingCustomers(true);
    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data.success) {
        setSearchedCustomers(data.customers);
      }
    } catch (error) {
      console.error('Failed to search customers:', error);
    } finally {
      setSearchingCustomers(false);
    }
  };

  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearchQuery(value);
    setShowCustomerDropdown(true);
    
    // Debounce search
    if (customerSearchTimeout.current) {
      clearTimeout(customerSearchTimeout.current);
    }
    
    customerSearchTimeout.current = setTimeout(() => {
      searchCustomers(value);
    }, 300);
  };

  const selectCustomer = (customer: Customer) => {
    setFormData({ ...formData, customerId: customer._id });
    setCustomerSearchQuery(customer.name);
    setShowCustomerDropdown(false);
    setSearchedCustomers([]);
    
    const customerData = customerInvoices.find(c => c.customerId === customer._id);
    setSelectedInvoices(customerData?.invoices.map(i => i.invoiceNumber) || []);
  };

  const openCustomerSelect = () => {
    setCustomerSearchQuery('');
    setSearchedCustomers(customers);
    setShowCustomerSelectModal(true);
  };

  const toggleInvoice = (invoiceNumber: string) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceNumber) 
        ? prev.filter(n => n !== invoiceNumber)
        : [...prev, invoiceNumber]
    );
  };

  const createPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/customer-payments', {
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
        fetchCustomerInvoices();
        setFormData({
          customerId: '',
          amount: 0,
          paymentDate: '',
          paymentMethod: 'cash',
          referenceNumber: '',
          notes: '',
        });
      }
    } catch (error) {
      console.error('Failed to create payment:', error);
    }
  };

  const recordPayment = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/customer-payments/${paymentId}/record`, {
        method: 'POST',
      });
      
      if (response.ok) {
        fetchPayments();
        fetchCustomerInvoices();
      }
    } catch (error) {
      console.error('Failed to record payment:', error);
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    
    try {
      const response = await fetch(`/api/customer-payments/${paymentId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchPayments();
        fetchCustomerInvoices();
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
      key: 'paymentId',
      header: 'Payment ID',
      render: (item: CustomerPayment) => (
        <span className="font-medium text-sm">{item.paymentId}</span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (item: CustomerPayment) => (
        <span className="font-medium">{item.customer?.name || item.customerName}</span>
      ),
    },
    {
      key: 'invoiceNumbers',
      header: 'Invoices',
      render: (item: CustomerPayment) => (
        <span className="text-sm text-gray-600">
          {item.invoiceNumbers?.length || 0} invoice(s)
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: CustomerPayment) => (
        <span className="font-medium">{formatCurrency(item.amount)}</span>
      ),
    },
    {
      key: 'paymentDate',
      header: 'Date',
      render: (item: CustomerPayment) => (
        <span className="text-sm text-gray-500">{formatDate(item.paymentDate)}</span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      render: (item: CustomerPayment) => (
        <span className="capitalize text-sm">{item.paymentMethod}</span>
      ),
    },
    {
      key: 'referenceNumber',
      header: 'Reference',
      render: (item: CustomerPayment) => (
        <span className="text-sm text-gray-500">{item.referenceNumber || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: CustomerPayment) => (
        <span className={`badge ${getStatusBadge(item.status)} capitalize`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: CustomerPayment) => (
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

  // Get selected customer's pending invoices for display
  const selectedCustomerData = customerInvoices.find(c => c.customerId === formData.customerId);

  return (
    <div>
      <Header title="Customer Payments" subtitle="Manage Customer Payments" />
      
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
          />
          <input
            type="date"
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        title="Record Customer Payment"
        size="lg"
      >
        <form onSubmit={createPayment} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account / Customer</label>
              {formData.customerId ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="font-medium text-gray-900">
                      {customerInvoices.find(c => c.customerId === formData.customerId)?.customerName || 'Selected Customer'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Outstanding: {formatCurrency(customerInvoices.find(c => c.customerId === formData.customerId)?.totalOutstanding || 0)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openCustomerSelect}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openCustomerSelect}
                  className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  + Select Customer
                </button>
              )}
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
                  { value: 'cash', label: 'Cash' },
                  { value: 'mpesa', label: 'M-Pesa' },
                  { value: 'card', label: 'Card' },
                  { value: 'bank_transfer', label: 'Bank Transfer' },
                  { value: 'credit', label: 'Credit' },
                ]}
              />
            </div>
          </div>

          <Input
            label="Reference Number"
            value={formData.referenceNumber}
            onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
            placeholder="Transaction ID, receipt number, etc."
          />

          {/* Pending Invoices Selection */}
          {selectedCustomerData && selectedCustomerData.invoices.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Outstanding Invoices</h3>
              <p className="text-sm text-gray-500 mb-3">
                Outstanding: {formatCurrency(selectedCustomerData.totalOutstanding)}
              </p>
              <div className="space-y-2 max-h-48 overflow-auto">
                {selectedCustomerData.invoices.map((invoice) => (
                  <label
                    key={invoice.invoiceNumber}
                    className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 cursor-pointer hover:border-blue-500"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.includes(invoice.invoiceNumber)}
                        onChange={() => toggleInvoice(invoice.invoiceNumber)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm font-medium">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium">{formatCurrency(invoice.balance)}</span>
                      <span className={`text-xs ml-2 capitalize ${invoice.paymentStatus === 'unpaid' ? 'text-red-500' : 'text-amber-500'}`}>
                        {invoice.paymentStatus}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

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
                <p className="text-sm text-gray-500">Payment ID</p>
                <p className="font-medium">{selectedPayment.paymentId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`badge ${getStatusBadge(selectedPayment.status)} capitalize`}>
                  {selectedPayment.status}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{selectedPayment.customer?.name || selectedPayment.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="text-xl font-bold">{formatCurrency(selectedPayment.amount)}</p>
              </div>
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

            {selectedPayment.referenceNumber && (
              <div>
                <p className="text-sm text-gray-500">Reference Number</p>
                <p>{selectedPayment.referenceNumber}</p>
              </div>
            )}
            
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

      {/* Customer Selection Modal */}
      <Modal
        isOpen={showCustomerSelectModal}
        onClose={() => setShowCustomerSelectModal(false)}
        title="Select Customer"
        size="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={customerSearchQuery}
              onChange={(e) => {
                setCustomerSearchQuery(e.target.value);
                searchCustomers(e.target.value);
              }}
            />
          </div>
          
          <div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
            {searchedCustomers.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Phone</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Outstanding</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {searchedCustomers.map(customer => {
                    const customerData = customerInvoices.find(c => c.customerId === customer._id);
                    const outstanding = customerData?.totalOutstanding || 0;
                    return (
                      <tr key={customer._id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{customer.name}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{customer.email || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{customer.phone || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={outstanding > 0 ? 'text-amber-600 font-medium' : 'text-gray-500'}>
                            {formatCurrency(outstanding)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            onClick={() => {
                              setFormData({ ...formData, customerId: customer._id });
                              setCustomerSearchQuery(customer.name);
                              const custData = customerInvoices.find(c => c.customerId === customer._id);
                              setSelectedInvoices(custData?.invoices.map(i => i.invoiceNumber) || []);
                              setShowCustomerSelectModal(false);
                            }}
                          >
                            Select
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No customers found
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}