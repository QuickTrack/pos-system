'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Edit, Trash2, Search, Phone, Mail, Gift, DollarSign, FileText, Eye, CreditCard, ArrowLeft, CheckCircle, User } from 'lucide-react';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  customerType: 'retail' | 'wholesale' | 'distributor';
  loyaltyPoints: number;
  creditBalance: number;
  totalPurchases: number;
  totalSpent: number;
  lastPurchaseDate?: string;
  isActive: boolean;
  creditLimit?: number;
}

interface Payment {
  _id: string;
  paymentId: string;
  customer: { _id: string; name: string };
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  status: string;
  notes?: string;
}

interface Invoice {
  invoiceNumber: string;
  total: number;
  amountPaid: number;
  balance: number;
  status: string;
  dueDate: string;
  invoiceDate: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState('');
  
  // Customer detail view state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'payments' | 'invoices'>('info');
  const [customerPayments, setCustomerPayments] = useState<Payment[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  
  // Payment form state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    referenceNumber: '',
    notes: '',
  });

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    customerCategory: 'individual',
    customerType: 'retail',
    businessName: '',
    kraPin: '',
    creditLimit: 0,
    creditBalance: 0,
  });

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/customers?${params}`);
      const data = await response.json();

      if (data.success) setCustomers(data.customers);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open customer detail modal
  const openCustomerDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
    setActiveTab('info');
    
    // Fetch payments and invoices in parallel
    setLoadingPayments(true);
    setLoadingInvoices(true);
    
    try {
      const [paymentsRes, invoicesRes] = await Promise.all([
        fetch(`/api/customer-payments?search=${encodeURIComponent(customer.name)}`),
        fetch(`/api/sales/customer-invoices`)
      ]);
      
      const paymentsData = await paymentsRes.json();
      const invoicesData = await invoicesRes.json();
      
      if (paymentsData.success) {
        setCustomerPayments(paymentsData.payments.filter((p: any) => p.customer?._id === customer._id));
      }
      
      if (invoicesData.success) {
        const customerInvoicesList = invoicesData.customerInvoices.find((c: any) => c.customerId === customer._id);
        setCustomerInvoices(customerInvoicesList?.invoices || []);
      }
    } catch (error) {
      console.error('Failed to fetch customer data:', error);
    } finally {
      setLoadingPayments(false);
      setLoadingInvoices(false);
    }
  };

  // Record a new payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    
    try {
      const response = await fetch('/api/customer-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer._id,
          ...paymentForm,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowPaymentModal(false);
        setPaymentForm({
          amount: 0,
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'cash',
          referenceNumber: '',
          notes: '',
        });
        // Refresh payments
        const paymentsRes = await fetch(`/api/customer-payments?search=${encodeURIComponent(selectedCustomer.name)}`);
        const paymentsData = await paymentsRes.json();
        if (paymentsData.success) {
          setCustomerPayments(paymentsData.payments.filter((p: any) => p.customer?._id === selectedCustomer._id));
        }
        // Refresh customer data
        fetchCustomers();
      } else {
        alert(data.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Failed to record payment:', error);
      alert('Failed to record payment');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer._id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCustomerModal(false);
        setEditingCustomer(null);
        resetForm();
        fetchCustomers();
      } else {
        setError(data.error || 'Failed to save customer');
      }
    } catch (error) {
      console.error('Failed to save customer:', error);
      setError('An unexpected error occurred');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      customerCategory: (customer as any).customerCategory || 'individual',
      customerType: customer.customerType,
      businessName: '',
      kraPin: '',
      creditLimit: 0,
      creditBalance: 0,
    });
    setShowCustomerModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      fetchCustomers();
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      customerCategory: 'individual',
      customerType: 'retail',
      businessName: '',
      kraPin: '',
      creditLimit: 0,
      creditBalance: 0,
    });
  };

  const columns = [
    {
      key: 'name',
      header: 'Customer',
      render: (item: Customer) => (
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-gray-500">{item.customerType}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (item: Customer) => (
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400" />
          {item.phone}
        </div>
      ),
    },
    {
      key: 'loyaltyPoints',
      header: 'Loyalty Points',
      render: (item: Customer) => (
        <span className="badge badge-info flex items-center gap-1 w-fit">
          <Gift className="w-3 h-3" />
          {item.loyaltyPoints}
        </span>
      ),
    },
    {
      key: 'totalSpent',
      header: 'Total Spent',
      render: (item: Customer) => formatCurrency(item.totalSpent),
    },
    {
      key: 'creditBalance',
      header: 'Balance',
      render: (item: Customer) => (
        <span className={item.creditBalance > 0 ? 'text-amber-600' : ''}>
          {formatCurrency(item.creditBalance)}
        </span>
      ),
    },
    {
      key: 'lastPurchaseDate',
      header: 'Last Purchase',
      render: (item: Customer) => item.lastPurchaseDate ? formatDate(item.lastPurchaseDate) : '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Customer) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openCustomerDetail(item)} title="View Details">
            <Eye className="w-4 h-4 text-blue-600" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(item._id)} className="text-red-500">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header title="Customers" subtitle="Manage Customer Relationships" />
      
      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setEditingCustomer(null);
              setError('');
              setShowCustomerModal(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Customers</p>
            <p className="text-2xl font-bold">{customers.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Retail</p>
            <p className="text-2xl font-bold">{customers.filter(c => c.customerType === 'retail').length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Wholesale</p>
            <p className="text-2xl font-bold">{customers.filter(c => c.customerType === 'wholesale').length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">With Credit</p>
            <p className="text-2xl font-bold">{customers.filter(c => c.creditBalance > 0).length}</p>
          </Card>
        </div>

        {/* Customers Table */}
        <Card>
          <CardHeader 
            title="All Customers" 
            subtitle={`${customers.length} customers`}
          />
          <DataTable
            columns={columns}
            data={customers}
            keyExtractor={(item) => item._id}
            loading={loading}
            emptyMessage="No customers found"
          />
        </Card>
      </div>

      {/* Customer Modal */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => {
          setShowCustomerModal(false);
          setEditingCustomer(null);
          resetForm();
        }}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Customer Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Customer Category
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customerCategory"
                    value="individual"
                    checked={formData.customerCategory === 'individual'}
                    onChange={(e) => setFormData({ ...formData, customerCategory: 'individual' })}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span className="text-sm">Individual</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customerCategory"
                    value="company"
                    checked={formData.customerCategory === 'company'}
                    onChange={(e) => setFormData({ ...formData, customerCategory: 'company' })}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span className="text-sm">Company</span>
                </label>
              </div>
            </div>
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <Input
              label="Initial Account Balance"
              type="number"
              value={formData.creditBalance}
              onChange={(e) => setFormData({ ...formData, creditBalance: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Customer Type"
              value={formData.customerType}
              onChange={(e) => setFormData({ ...formData, customerType: e.target.value as any })}
              options={[
                { value: 'retail', label: 'Retail' },
                { value: 'wholesale', label: 'Wholesale' },
                { value: 'distributor', label: 'Distributor' },
              ]}
            />
            <Input
              label="Credit Limit"
              type="number"
              value={formData.creditLimit}
              onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>

          {(formData.customerCategory === 'company' || formData.customerType === 'wholesale' || formData.customerType === 'distributor') && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Business Name"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              />
              <Input
                label="KRA PIN"
                value={formData.kraPin}
                onChange={(e) => setFormData({ ...formData, kraPin: e.target.value })}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setShowCustomerModal(false);
                setEditingCustomer(null);
              }}
            >
              Cancel
            </Button>
            {!editingCustomer && (
              <Button 
                type="button"
                variant="outline"
                onClick={async () => {
                  setError('');
                  try {
                    const response = await fetch('/api/customers', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(formData),
                    });

                    const data = await response.json();

                    if (response.ok) {
                      resetForm();
                      fetchCustomers();
                    } else {
                      setError(data.error || 'Failed to save customer');
                    }
                  } catch (error) {
                    console.error('Failed to save customer:', error);
                    setError('An unexpected error occurred');
                  }
                }}
              >
                Add Next
              </Button>
            )}
            <Button type="submit">
              {editingCustomer ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Customer Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCustomer(null);
        }}
        title={selectedCustomer?.name || 'Customer Details'}
        size="full"
      >
        {selectedCustomer && (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex border-b">
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'info' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500'}`}
                onClick={() => setActiveTab('info')}
              >
                <User className="w-4 h-4 inline mr-1" />
                Info
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'payments' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500'}`}
                onClick={() => setActiveTab('payments')}
              >
                <DollarSign className="w-4 h-4 inline mr-1" />
                Payments
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'invoices' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500'}`}
                onClick={() => setActiveTab('invoices')}
              >
                <FileText className="w-4 h-4 inline mr-1" />
                Invoices
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'info' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-3">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                    {selectedCustomer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{selectedCustomer.email}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-3">Account Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Spent:</span>
                      <span className="font-medium">{formatCurrency(selectedCustomer.totalSpent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Credit Balance:</span>
                      <span className={`font-medium ${selectedCustomer.creditBalance > 0 ? 'text-amber-600' : ''}`}>
                        {formatCurrency(selectedCustomer.creditBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Loyalty Points:</span>
                      <span className="font-medium flex items-center gap-1">
                        <Gift className="w-4 h-4 text-purple-500" />
                        {selectedCustomer.loyaltyPoints}
                      </span>
                    </div>
                    {selectedCustomer.lastPurchaseDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Purchase:</span>
                        <span className="font-medium">{formatDate(selectedCustomer.lastPurchaseDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-gray-700">Payment History</h4>
                  <Button size="sm" onClick={() => setShowPaymentModal(true)} className="gap-1">
                    <CreditCard className="w-4 h-4" />
                    Record Payment
                  </Button>
                </div>
                
                {loadingPayments ? (
                  <div className="text-center py-8 text-gray-500">Loading payments...</div>
                ) : customerPayments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No payments found</div>
                ) : (
                  <div className="space-y-2">
                    {customerPayments.map((payment) => (
                      <div key={payment._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{payment.paymentId}</div>
                          <div className="text-xs text-gray-500">
                            {formatDate(payment.paymentDate)} • {payment.paymentMethod}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-emerald-600">{formatCurrency(payment.amount)}</div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                            payment.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Payment Summary */}
                <div className="bg-emerald-50 p-4 rounded-lg mt-4">
                  <h4 className="font-semibold text-emerald-800 mb-2">Payment Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total Payments:</span>
                      <div className="font-bold text-lg text-emerald-600">
                        {formatCurrency(customerPayments.reduce((sum, p) => sum + p.amount, 0))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Recorded:</span>
                      <div className="font-bold text-lg">
                        {customerPayments.filter(p => p.status === 'paid').length}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Pending:</span>
                      <div className="font-bold text-lg text-amber-600">
                        {customerPayments.filter(p => p.status !== 'paid').length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'invoices' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">Outstanding Invoices</h4>
                
                {loadingInvoices ? (
                  <div className="text-center py-8 text-gray-500">Loading invoices...</div>
                ) : customerInvoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No outstanding invoices</div>
                ) : (
                  <div className="space-y-2">
                    {customerInvoices.map((invoice, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{invoice.invoiceNumber}</div>
                          <div className="text-xs text-gray-500">
                            {formatDate(invoice.invoiceDate)} • Due: {formatDate(invoice.dueDate)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(invoice.total)}</div>
                          <div className="text-xs text-gray-500">
                            Paid: {formatCurrency(invoice.amountPaid)} • Balance: {formatCurrency(invoice.balance)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Invoice Summary */}
                <div className="bg-amber-50 p-4 rounded-lg mt-4">
                  <h4 className="font-semibold text-amber-800 mb-2">Invoice Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total Due:</span>
                      <div className="font-bold text-lg text-amber-600">
                        {formatCurrency(customerInvoices.reduce((sum, i) => sum + i.balance, 0))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Invoices:</span>
                      <div className="font-bold text-lg">{customerInvoices.length}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Overdue:</span>
                      <div className="font-bold text-lg text-red-600">
                        {customerInvoices.filter(i => new Date(i.dueDate) < new Date()).length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={`Record Payment - ${selectedCustomer?.name}`}
        size="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
            required
          />
          <Input
            label="Payment Date"
            type="date"
            value={paymentForm.paymentDate}
            onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
            required
          />
          <Select
            label="Payment Method"
            value={paymentForm.paymentMethod}
            onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'mpesa', label: 'M-Pesa' },
              { value: 'bank', label: 'Bank Transfer' },
              { value: 'card', label: 'Card' },
              { value: 'cheque', label: 'Cheque' },
            ]}
          />
          <Input
            label="Reference Number"
            value={paymentForm.referenceNumber}
            onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
            placeholder="Optional"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
