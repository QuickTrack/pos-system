'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import PrintPreview from '@/components/print/PrintPreview';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  FileText, 
  Send,
  DollarSign,
  Printer,
  Eye,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  creditLimit: number;
  creditBalance: number;
}

interface InvoiceItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType?: 'percentage' | 'fixed';
  total: number;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  customer: Customer;
  customerName: string;
  customerPhone: string;
  invoiceDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  paymentTerms: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  partial: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-400',
};

export default function BackofficeInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [summary, setSummary] = useState({ totalAmount: 0, totalPaid: 0, totalBalance: 0 });
  
  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  
  // Invoice number state
  const [invoiceNumberSuffix, setInvoiceNumberSuffix] = useState('0001');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState(30);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  
  // Product search
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const productSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Filter products based on search query
    if (productSearchQuery && selectedCustomer) {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(productSearchQuery.toLowerCase()))
      );
      setFilteredProducts(filtered);
    } else if (selectedCustomer) {
      setFilteredProducts(products);
    } else {
      setFilteredProducts([]);
    }
  }, [productSearchQuery, selectedCustomer, products]);

  // Initialize filteredProducts when customer changes
  useEffect(() => {
    if (selectedCustomer && products.length > 0) {
      setFilteredProducts(products);
    }
  }, [selectedCustomer, products]);

  // Focus search input when modal opens
  useEffect(() => {
    if (showInvoiceModal) {
      const timer = setTimeout(() => {
        productSearchRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showInvoiceModal]);

  // Calculate due date based on payment terms
  useEffect(() => {
    if (invoiceDate && paymentTerms) {
      const date = new Date(invoiceDate);
      date.setDate(date.getDate() + paymentTerms);
      setDueDate(date.toISOString().split('T')[0]);
    }
  }, [invoiceDate, paymentTerms]);

  // Fetch data on initial load and when filters change
  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const [invoicesRes, customersRes, productsRes] = await Promise.all([
        fetch(`/api/customer-invoices?${params}`),
        fetch('/api/customers'),
        fetch('/api/products?limit=100'),
      ]);

      const invoicesData = await invoicesRes.json();
      const customersData = await customersRes.json();
      const productsData = await productsRes.json();

      if (invoicesData.success) {
        setInvoices(invoicesData.invoices);
        setSummary(invoicesData.summary);
      }
      if (customersData.success) setCustomers(customersData.customers);
      if (productsData.success) setProducts(productsData.products);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = () => {
    setSelectedCustomer(null);
    setInvoiceItems([]);
    setInvoiceNotes('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setPaymentTerms(30);
    setProductSearchQuery('');
    setFilteredProducts([]);
    // Generate new invoice number based on last invoice
    const lastInvoice = invoices[0];
    let newSuffix = '0001';
    if (lastInvoice?.invoiceNumber) {
      const parts = lastInvoice.invoiceNumber.split('-');
      if (parts.length >= 2) {
        const num = parseInt(parts[parts.length - 1]) || 0;
        newSuffix = String(num + 1).padStart(4, '0');
      }
    }
    setInvoiceNumberSuffix(newSuffix);
    setInvoiceNumber(`INV-${newSuffix}`);
    setShowInvoiceModal(true);
  };

  const addItem = (product: any) => {
    const existing = invoiceItems.find(item => item.productId === product._id);
    if (existing) {
      setInvoiceItems(invoiceItems.map(item => 
        item.productId === product._id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
          : item
      ));
    } else {
      setInvoiceItems([...invoiceItems, {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        unitPrice: product.retailPrice,
        discount: 0,
        total: product.retailPrice,
      }]);
    }
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    setInvoiceItems(invoiceItems.map(item => 
      item.productId === productId 
        ? { ...item, quantity, total: quantity * item.unitPrice }
        : item
    ));
  };

  const updateItemPrice = (productId: string, unitPrice: number) => {
    setInvoiceItems(invoiceItems.map(item => 
      item.productId === productId 
        ? { ...item, unitPrice, total: item.quantity * unitPrice }
        : item
    ));
  };

  const removeItem = (productId: string) => {
    setInvoiceItems(invoiceItems.filter(item => item.productId !== productId));
  };

  const calculateSubtotal = () => invoiceItems.reduce((sum, item) => sum + item.total, 0);
  const calculateTax = (subtotal: number) => subtotal * 0.16;
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal + calculateTax(subtotal);
  };

  const handleSubmitInvoice = async () => {
    if (!selectedCustomer || invoiceItems.length === 0) return;

    try {
      const payload = {
        customerId: selectedCustomer._id,
        items: invoiceItems,
        notes: invoiceNotes,
        taxRate: 16,
      };

      const response = await fetch('/api/customer-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        setShowInvoiceModal(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create invoice:', error);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await fetch(`/api/customer-invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to send invoice:', error);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;

    try {
      await fetch(`/api/customer-invoices/${selectedInvoice._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment: {
            amount: parseFloat(paymentAmount),
            method: paymentMethod,
            reference: paymentReference,
          },
        }),
      });

      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentReference('');
      fetchData();
    } catch (error) {
      console.error('Failed to record payment:', error);
    }
  };

  const getStatusBadge = (status: string) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );

  const columns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (item: Invoice) => (
        <span className="font-medium">{item.invoiceNumber}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (item: Invoice) => (
        <div>
          <p className="font-medium">{item.customerName}</p>
          <p className="text-xs text-gray-500">{item.customerPhone}</p>
        </div>
      ),
    },
    {
      key: 'invoiceDate',
      header: 'Date',
      render: (item: Invoice) => formatDate(item.invoiceDate),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (item: Invoice) => (
        <span className={item.balanceDue > 0 && new Date(item.dueDate) < new Date() ? 'text-red-500' : ''}>
          {formatDate(item.dueDate)}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (item: Invoice) => formatCurrency(item.total),
    },
    {
      key: 'balanceDue',
      header: 'Balance',
      render: (item: Invoice) => (
        <span className={item.balanceDue > 0 ? 'font-medium text-red-600' : 'text-green-600'}>
          {formatCurrency(item.balanceDue)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Invoice) => getStatusBadge(item.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Invoice) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedInvoice(item); setShowViewModal(true); }}>
            <Eye className="w-4 h-4" />
          </Button>
          {item.status === 'draft' && (
            <Button variant="ghost" size="sm" onClick={() => handleSendInvoice(item._id)} title="Send Invoice">
              <Send className="w-4 h-4" />
            </Button>
          )}
          {item.balanceDue > 0 && item.status !== 'cancelled' && (
            <Button variant="ghost" size="sm" onClick={() => { setSelectedInvoice(item); setShowPaymentModal(true); }} title="Record Payment">
              <DollarSign className="w-4 h-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            title="Print Invoice"
            onClick={() => { setSelectedInvoice(item); setShowPrintPreview(true); }}
          >
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header title="Credit Invoices" subtitle="Backoffice Invoice Management" />
      
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-blue-50">
            <div className="text-center py-4">
              <p className="text-blue-600 font-medium">Total Invoiced</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(summary.totalAmount)}</p>
            </div>
          </Card>
          <Card className="bg-green-50">
            <div className="text-center py-4">
              <p className="text-green-600 font-medium">Total Paid</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.totalPaid)}</p>
            </div>
          </Card>
          <Card className="bg-red-50">
            <div className="text-center py-4">
              <p className="text-red-600 font-medium">Outstanding</p>
              <p className="text-2xl font-bold text-red-700">{formatCurrency(summary.totalBalance)}</p>
            </div>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <Button onClick={handleCreateInvoice} className="gap-2">
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
        </div>

        {/* Invoices Table */}
        <Card>
          <DataTable
            columns={columns}
            data={invoices}
            keyExtractor={(item) => item._id}
            loading={loading}
            emptyMessage="No invoices found"
          />
        </Card>
      </div>

      {/* Create Invoice Modal - Full Screen */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-gray-900">
          <div className="h-full flex flex-col max-w-7xl mx-auto bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0 gap-4">
              <div className="flex items-center gap-6 flex-1">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Create Credit Invoice</h2>
                  <p className="text-sm text-gray-500">Issue invoice to credit customer</p>
                </div>
                <div className="max-w-40">
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-gray-100 text-gray-600 border border-r-0 border-gray-200 rounded-l-lg text-sm">INV-</span>
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={invoiceNumberSuffix}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setInvoiceNumberSuffix(val);
                        setInvoiceNumber(`INV-${val}`);
                      }}
                      placeholder="0001"
                    />
                  </div>
                </div>
                <div className="flex-1 max-w-sm">
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={selectedCustomer?._id || ''}
                    onChange={(e) => {
                      const customer = customers.find(c => c._id === e.target.value);
                      setSelectedCustomer(customer || null);
                      setInvoiceItems([]);
                      setProductSearchQuery('');
                    }}
                    required
                  >
                    <option value="">Select a customer</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form Content - Scrollable */}
            <div className="flex-1 overflow-auto p-6">
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedCustomer || invoiceItems.length === 0) return;
                
                setShowInvoiceModal(false);
                try {
                  const response = await fetch('/api/customer-invoices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      invoiceNumber,
                      customerId: selectedCustomer._id,
                      items: invoiceItems,
                      notes: invoiceNotes,
                      taxRate: 16,
                      paymentTerms,
                      invoiceDate,
                      dueDate,
                    }),
                  });
                  if (response.ok) {
                    fetchData();
                  }
                } catch (error) {
                  console.error('Failed to create invoice:', error);
                }
              }} className="space-y-6">
                {/* Product Search Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-4">Add Products</h3>
                  {selectedCustomer ? (
                    <>
                      <div className="mb-4">
                        <div className="flex-1 relative max-w-md">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            ref={productSearchRef}
                            type="text"
                            placeholder="Search products by name or SKU..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      {filteredProducts.length > 0 && (
                        <div className="border border-gray-200 rounded-lg max-h-64 overflow-auto">
                          {filteredProducts.map((product) => (
                            <button
                              key={product._id}
                              type="button"
                              onClick={() => addItem(product)}
                              className="w-full px-4 py-2 text-left hover:bg-emerald-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-medium text-gray-900">{product.name}</span>
                                <span className="text-xs text-gray-500 ml-2">SKU: {product.sku || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-emerald-600 font-medium">{formatCurrency(product.retailPrice || 0)}</span>
                                <span className={`text-xs ${(product.stockQuantity || 0) < 10 ? 'text-red-500' : 'text-gray-400'}`}>
                                  Stock: {product.stockQuantity || 0}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm">Select a customer to add products</p>
                  )}
                </div>

                {/* Invoice Items Section */}
                {invoiceItems.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-4">Invoice Items</h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium">Product</th>
                            <th className="text-right px-4 py-2 font-medium">Price</th>
                            <th className="text-center px-4 py-2 font-medium">Qty</th>
                            <th className="text-right px-4 py-2 font-medium">Total</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceItems.map((item, idx) => (
                            <tr key={idx} className="border-t border-gray-200">
                              <td className="px-4 py-2">
                                <div>
                                  <span className="font-medium text-gray-900">{item.productName}</span>
                                  <span className="text-xs text-gray-500 ml-2">SKU: {item.sku || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="w-24 px-2 py-1 border border-gray-200 rounded text-right"
                                  value={item.unitPrice}
                                  onChange={(e) => updateItemPrice(item.productId, parseFloat(e.target.value) || 0)}
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  min="1"
                                  className="w-20 px-2 py-1 border border-gray-200 rounded text-center"
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(item.productId, parseInt(e.target.value) || 1)}
                                />
                              </td>
                              <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                              <td className="px-4 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.productId)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100">
                          <tr>
                            <td colSpan={3} className="px-4 py-2 text-right font-medium">Subtotal:</td>
                            <td className="px-4 py-2 text-right font-bold">{formatCurrency(calculateSubtotal())}</td>
                            <td></td>
                          </tr>
                          <tr>
                            <td colSpan={3} className="px-4 py-1 text-right">Tax (16%):</td>
                            <td className="px-4 py-1 text-right">{formatCurrency(calculateTax(calculateSubtotal()))}</td>
                            <td></td>
                          </tr>
                          <tr className="font-bold">
                            <td colSpan={3} className="px-4 py-2 text-right">Total:</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(calculateTotal())}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Additional Details Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-4">Invoice Details</h3>
                  <div className="grid grid-cols-2 gap-4 max-w-2xl">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms (Days)</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(parseInt(e.target.value))}
                      >
                        <option value={7}>7 Days</option>
                        <option value={14}>14 Days</option>
                        <option value={30}>30 Days</option>
                        <option value={60}>60 Days</option>
                        <option value={90}>90 Days</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100"
                        value={dueDate}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        rows={2}
                        value={invoiceNotes}
                        onChange={(e) => setInvoiceNotes(e.target.value)}
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setShowInvoiceModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!selectedCustomer || invoiceItems.length === 0}>
                    Create Invoice
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={`Record Payment - ${selectedInvoice?.invoiceNumber}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">Balance Due</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(selectedInvoice?.balanceDue || 0)}</p>
          </div>
          
          <Input
            label="Payment Amount"
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="Enter amount"
          />
          
          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'mpesa', label: 'M-Pesa' },
              { value: 'bank', label: 'Bank Transfer' },
              { value: 'cheque', label: 'Cheque' },
            ]}
          />
          
          <Input
            label="Reference/Transaction ID"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="Optional reference"
          />

          <Button onClick={handleRecordPayment} className="w-full">
            Record Payment
          </Button>
        </div>
      </Modal>

      {/* View Invoice Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title={`Invoice ${selectedInvoice?.invoiceNumber}`}
        size="lg"
      >
        {selectedInvoice && (
          <div className="space-y-4">
            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Customer</p>
                <p className="font-medium">{selectedInvoice.customerName}</p>
                <p>{selectedInvoice.customerPhone}</p>
              </div>
              <div>
                <p className="text-gray-500">Dates</p>
                <p>Invoice: {formatDate(selectedInvoice.invoiceDate)}</p>
                <p>Due: {formatDate(selectedInvoice.dueDate)}</p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full border text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-1 text-left">Item</th>
                  <th className="px-2 py-1 text-right">Qty</th>
                  <th className="px-2 py-1 text-right">Price</th>
                  <th className="px-2 py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-2 py-1">{item.productName}</td>
                    <td className="px-2 py-1 text-right">{item.quantity}</td>
                    <td className="px-2 py-1 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-2 py-1 text-right">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t pt-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>{formatCurrency(selectedInvoice.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{formatCurrency(selectedInvoice.total)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Paid:</span>
                <span>{formatCurrency(selectedInvoice.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-bold text-red-600">
                <span>Balance:</span>
                <span>{formatCurrency(selectedInvoice.balanceDue)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              {selectedInvoice.status === 'draft' && (
                <Button onClick={() => handleSendInvoice(selectedInvoice._id)}>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invoice
                </Button>
              )}
              {selectedInvoice.balanceDue > 0 && (
                <Button variant="outline" onClick={() => { setShowViewModal(false); setShowPaymentModal(true); }}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              )}
              <Button variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {showPrintPreview && selectedInvoice && (
        <PrintPreview
          documentType="invoice"
          document={{
            invoiceNumber: selectedInvoice.invoiceNumber,
            date: selectedInvoice.invoiceDate,
            dueDate: selectedInvoice.dueDate,
            customer: {
              name: selectedInvoice.customerName,
              phone: selectedInvoice.customerPhone
            },
            items: selectedInvoice.items.map(item => ({
              name: item.productName,
              quantity: item.quantity,
              price: item.unitPrice,
              total: item.total
            })),
            subtotal: selectedInvoice.subtotal,
            tax: selectedInvoice.tax,
            taxRate: 16,
            total: selectedInvoice.total
          }}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
    </div>
  );
}
