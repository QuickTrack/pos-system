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
  X,
  User,
  Minus,
  ShoppingCart,
} from 'lucide-react';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  creditLimit: number;
  creditBalance: number;
  customerType?: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  retailPrice: number;
  wholesalePrice: number;
  stockQuantity: number;
  category: { name: string };
  baseUnit: string;
  units?: {
    name: string;
    abbreviation: string;
    conversionToBase: number;
    price: number;
    barcode?: string;
  }[];
}

interface UnitOption {
  name: string;
  abbreviation: string;
  conversionToBase: number;
  price: number;
}

interface InvoiceItem {
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  unitName: string;
  unitAbbreviation: string;
  conversionToBase: number;
  discount: number;
  discountType?: 'percentage' | 'fixed';
  total: number;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceType?: 'sale' | 'credit';
  referenceInvoiceNumber?: string;
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
  notes?: string;
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
  const [salesReturns, setSalesReturns] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'sale' | 'credit'>('sale');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [summary, setSummary] = useState({ totalAmount: 0, totalPaid: 0, totalBalance: 0 });
  
  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
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
  
  // Product search and categories
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Credit invoice specific fields
  const [creditReference, setCreditReference] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [categories, setCategories] = useState<string[]>([]);
  const productSearchRef = useRef<HTMLInputElement>(null);
  
  // Unit selector state
  const [openUnitSelector, setOpenUnitSelector] = useState<string | null>(null);
  
  // Customer modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Filter products based on search and category
  useEffect(() => {
    let filtered = products;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category?.name === selectedCategory);
    }
    
    // Filter by search
    if (productSearchQuery) {
      const query = productSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.barcode?.toLowerCase().includes(query)
      );
    }
    setFilteredProducts(filtered.slice(0, 20));
  }, [productSearchQuery, products, selectedCategory]);

  // Extract unique categories from products
  useEffect(() => {
    const uniqueCats = [...new Set(products.map(p => p.category?.name).filter(Boolean))];
    setCategories(uniqueCats as string[]);
  }, [products]);

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

      const [invoicesRes, customersRes, productsRes, returnsRes] = await Promise.all([
        fetch(`/api/customer-invoices?${params}`),
        fetch('/api/customers'),
        fetch('/api/products?limit=100'),
        fetch('/api/sales/returns'),
      ]);

      const invoicesData = await invoicesRes.json();
      const customersData = await customersRes.json();
      const productsData = await productsRes.json();
      const returnsData = await returnsRes.json();

      if (invoicesData.success) {
        setInvoices(invoicesData.invoices);
        setSummary(invoicesData.summary);
      }

      if (returnsData.success) {
        setSalesReturns(returnsData.refunds || []);
      }
      if (customersData.success) setCustomers(customersData.customers);
      if (productsData.success) setProducts(productsData.products);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (type: 'sale' | 'credit' = 'sale') => {
    setInvoiceType(type);
    setSelectedCustomer(null);
    setInvoiceItems([]);
    setInvoiceNotes('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setPaymentTerms(30);
    setProductSearchQuery('');
    setSelectedCategory('all');
    setFilteredProducts([]);
    
    // Reset credit invoice specific fields
    setCreditReference('');
    setCreditReason('');
    setCreditAmount(0);
    
    // Fetch next invoice number from API
    try {
      const typeParam = type === 'credit' ? '&type=credit' : '';
      const response = await fetch(`/api/customer-invoices?next=true${typeParam}`);
      const data = await response.json();
      if (data.success && data.nextInvoiceNumber) {
        const num = data.nextInvoiceNumber;
        // Extract suffix (e.g., '0001' from 'INV-0001' or 'CINV-0001')
        const parts = num.split('-');
        if (parts.length >= 2) {
          setInvoiceNumberSuffix(parts[1]);
          setInvoiceNumber(num);
        }
      } else {
        // Fallback to local calculation
        const lastInvoice = invoices[0];
        let newSuffix = '0001';
        if (lastInvoice?.invoiceNumber) {
          const invParts = lastInvoice.invoiceNumber.split('-');
          if (invParts.length >= 2) {
            const num = parseInt(invParts[invParts.length - 1]) || 0;
            newSuffix = String(num + 1).padStart(4, '0');
          }
        }
        setInvoiceNumberSuffix(newSuffix);
        setInvoiceNumber(type === 'credit' ? `CINV-${newSuffix}` : `INV-${newSuffix}`);
      }
    } catch (error) {
      console.error('Failed to fetch next invoice number:', error);
      // Fallback
      setInvoiceNumberSuffix('0001');
      setInvoiceNumber(type === 'credit' ? 'CINV-0001' : 'INV-0001');
    }
    
    setShowInvoiceModal(true);
  };

  // Helper to reset invoice form
  const resetInvoiceForm = () => {
    setSelectedCustomer(null);
    setInvoiceItems([]);
    setInvoiceNotes('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setPaymentTerms(30);
    setProductSearchQuery('');
    setSelectedCategory('all');
    setFilteredProducts([]);
    setCreditReference('');
    setCreditReason('');
    setCreditAmount(0);
    setInvoiceType('sale');
  };

  const addItem = (product: Product, selectedUnit?: UnitOption) => {
    const unitToUse = selectedUnit || null;
    const existing = invoiceItems.find(item => item.productId === product._id && item.unitName === (unitToUse?.name || product.baseUnit));
    
    if (existing) {
      setInvoiceItems(invoiceItems.map(item => 
        item.productId === product._id && item.unitName === (unitToUse?.name || product.baseUnit)
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
          : item
      ));
    } else {
      const price = unitToUse?.price || product.retailPrice;
      const unitName = unitToUse?.name || product.baseUnit;
      const unitAbbreviation = unitToUse?.abbreviation || '';
      const conversionToBase = unitToUse?.conversionToBase || 1;
      
      setInvoiceItems([...invoiceItems, {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        quantity: 1,
        unitPrice: price,
        unitName: unitName,
        unitAbbreviation: unitAbbreviation,
        conversionToBase: conversionToBase,
        discount: 0,
        total: price,
      }]);
    }
  };

  const handleUnitChange = (productId: string, unit: UnitOption) => {
    const item = invoiceItems.find(i => i.productId === productId);
    if (item) {
      // Remove the old item
      setInvoiceItems(invoiceItems.filter(i => i.productId !== productId));
      const product = products.find(p => p._id === productId);
      if (product) {
        const price = unit.price || product.retailPrice;
        const newItem: InvoiceItem = {
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          quantity: item.quantity,
          unitPrice: price,
          unitName: unit.name,
          unitAbbreviation: unit.abbreviation,
          conversionToBase: unit.conversionToBase,
          discount: item.discount,
          total: price * item.quantity,
        };
        setInvoiceItems([...invoiceItems.filter(i => i.productId !== productId), newItem]);
      }
    }
    setOpenUnitSelector(null);
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    setInvoiceItems(invoiceItems.map(item => 
      item.productId === productId 
        ? { ...item, quantity: Math.max(1, quantity), total: Math.max(1, quantity) * item.unitPrice }
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

  // Customer search
  const handleSearchCustomer = async (query: string) => {
    setCustomerSearch(query);
    if (query.length >= 2) {
      const response = await fetch(`/api/customers?search=${query}`);
      const data = await response.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(false);
    setCustomerSearch('');
  };

  const handleSubmitInvoice = async () => {
    // For credit invoices, allow empty items
    if (!selectedCustomer || (invoiceItems.length === 0 && invoiceType !== 'credit')) return;

    try {
      const total = calculateTotal();
      
      // If credit invoice (sales return), use the credit invoice API with isRefund flag
      if (invoiceType === 'credit') {
        const payload = {
          customerId: selectedCustomer._id,
          invoiceNumber: invoiceNumber,
          referenceInvoiceNumber: creditReference,
          description: creditReason || 'Account credit',
          notes: invoiceNotes,
          amount: creditAmount || calculateTotal(),
          isRefund: true, // Sales returns should decrease the customer's balance
        };

        const response = await fetch('/api/customer-invoices/credit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (data.success) {
          // Set the created credit invoice for printing
          const creditInvoice = {
            ...data.creditInvoice,
            customer: {
              _id: data.customer?._id || selectedCustomer._id,
              name: data.customer?.name || selectedCustomer.name,
              phone: selectedCustomer.phone || ''
            },
            invoiceType: 'credit' as const,
            amount: data.creditInvoice?.amount || creditAmount || total,
            description: data.creditInvoice?.description || creditReason || 'Account credit',
            referenceInvoiceNumber: creditReference,
          };
          setSelectedInvoice(creditInvoice as any);
          setShowPrintPreview(true);
          fetchData();
        }
        return;
      }

      // Regular sale invoice
      const payload = {
        customerId: selectedCustomer._id,
        invoiceNumber: invoiceNumber, // Use the preloaded invoice number
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
        // Set the created invoice for printing
        const createdInvoice = {
          ...data.invoice,
          customer: {
            _id: selectedCustomer._id,
            name: selectedCustomer.name,
            phone: selectedCustomer.phone || ''
          }
        };
        setSelectedInvoice(createdInvoice as any);
        setShowPrintPreview(true);
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
      header: 'Customer Balance',
      render: (item: Invoice) => {
        const customerBalance = item.customer?.creditBalance ?? 0;
        return (
          <span className={customerBalance > 0 ? 'font-medium text-red-600' : 'text-green-600'}>
            {formatCurrency(customerBalance)}
          </span>
        );
      },
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
            <Button variant="ghost" size="sm" onClick={() => {
              // Open customer payments page in new tab with customer and invoice info
              const customerId = typeof item.customer === 'object' ? item.customer._id : item.customer;
              const url = `/customer-payments?customerId=${encodeURIComponent(customerId as string)}&invoiceNumber=${encodeURIComponent(item.invoiceNumber)}&amount=${encodeURIComponent(item.balanceDue)}`;
              window.open(url, '_blank');
            }} title="Record Payment">
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
      <Header title="Sales Returns" subtitle="Manage customer credit invoices and returns" />
      
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
          <div className="flex gap-2">
            <Button onClick={() => handleCreateInvoice('credit')} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              New Credit Note
            </Button>
          </div>
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

        {/* Sales Returns Table */}
        {salesReturns.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Returns (from Cash Sales)</h3>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Return #</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Original Invoice</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Items</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Amount</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Reason</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Processed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesReturns.map((returnItem: any, idx: number) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">
                          {returnItem.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {returnItem.originalInvoiceNumber || returnItem.refundedSale}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {returnItem.saleDate ? new Date(returnItem.saleDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {returnItem.items?.length || 0}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">
                          {formatCurrency(Math.abs(returnItem.total))}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {returnItem.refundReason || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {returnItem.cashierName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Create Invoice Modal - Full Screen - POS Style */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-gray-900">
          <div className="h-full flex flex-col max-w-7xl mx-auto bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0 gap-4">
              <div className="flex items-center gap-6 flex-1">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {invoiceType === 'credit' ? 'Create Credit Invoice' : 'Create Invoice'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {invoiceType === 'credit' ? 'Charge to customer account (adds to debt)' : 'Issue invoice to customer'}
                  </p>
                </div>
                <div className="max-w-32">
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-gray-100 text-gray-600 border border-r-0 border-gray-200 rounded-l-lg text-sm">
                      {invoiceType === 'credit' ? 'CINV-' : 'INV-'}
                    </span>
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={invoiceNumberSuffix}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setInvoiceNumberSuffix(val);
                        setInvoiceNumber(`${invoiceType === 'credit' ? 'CINV-' : 'INV-'}${val}`);
                      }}
                      placeholder="0001"
                    />
                  </div>
                </div>
              </div>
              
              {/* Customer Selection Button */}
              <button 
                onClick={() => setShowCustomerModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:border-emerald-400 transition-colors bg-white"
              >
                <User className="w-4 h-4 text-gray-400" />
                {selectedCustomer ? (
                  <span className="text-gray-900 font-medium">{selectedCustomer.name}</span>
                ) : (
                  <span className="text-gray-400">Select Customer</span>
                )}
              </button>
              
              <button
                onClick={() => { setShowInvoiceModal(false); resetInvoiceForm(); }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Products Section - Top - POS Style - Hidden for Credit Invoices */}
            {invoiceType !== 'credit' && (
            <div className="flex-1 p-4 flex flex-col overflow-hidden bg-gray-50">
              {/* Search Bar */}
              <div className="flex gap-3 mb-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={productSearchRef}
                    type="text"
                    placeholder="Search products by name, SKU, or barcode..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Filter */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors whitespace-nowrap ${
                      selectedCategory === 'all'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-xs rounded-md border transition-colors whitespace-nowrap ${
                        selectedCategory === cat
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Products Grid - Horizontal Scroll */}
              <div className="flex-1 overflow-x-auto overflow-y-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="spinner" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>{productSearchQuery ? 'No products found' : 'Type to search products'}</p>
                  </div>
                ) : (
                  <div className="flex gap-2 h-full">
                    {filteredProducts.map((product) => (
                      <button
                        key={product._id}
                        onClick={() => addItem(product)}
                        className="flex-shrink-0 bg-white p-3 rounded border border-gray-200 hover:border-emerald-500 hover:shadow-sm transition-all text-left"
                        style={{ width: '160px' }}
                      >
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {product.name}
                        </div>
                        <div className="text-xs text-gray-500 mb-2 truncate">
                          {product.category?.name}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-600 font-bold text-sm">
                            {formatCurrency(product.retailPrice)}
                          </span>
                          <span className={`text-xs ${product.stockQuantity < 10 ? 'text-red-500' : 'text-gray-400'}`}>
                            {product.stockQuantity}
                          </span>
                        </div>
                        {product.units && product.units.length > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            +{product.units.length} unit(s)
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Credit Invoice Fields - Shown when invoiceType is 'credit' */}
            {invoiceType === 'credit' && (
            <div className="flex-1 p-4 flex flex-col overflow-hidden bg-gray-50">
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                <h3 className="font-semibold text-gray-900">Credit Invoice Details</h3>
                
                {/* Reference Invoice Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Invoice (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter original invoice number being credited"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={creditReference}
                    onChange={(e) => setCreditReference(e.target.value)}
                  />
                </div>

                {/* Credit Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credit Reason *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    required
                  >
                    <option value="">Select a reason...</option>
                    <option value="Damaged goods">Damaged goods</option>
                    <option value="Wrong item delivered">Wrong item delivered</option>
                    <option value="Price adjustment">Price adjustment</option>
                    <option value="Customer return">Customer return</option>
                    <option value="Overcharge">Overcharge</option>
                    <option value="Discount adjustment">Discount adjustment</option>
                    <option value="Account credit">Account credit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Credit Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credit Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={creditAmount || ''}
                    onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Any additional details about this credit..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                  />
                </div>

                {/* Credit Summary */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-purple-800">Credit Total:</span>
                    <span className="text-xl font-bold text-purple-600">{formatCurrency(creditAmount || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Invoice Items Section - Bottom - POS Cart Style - Hidden for Credit Invoices */}
            {invoiceType !== 'credit' && (
            <div className="bg-white border-t border-gray-200 flex flex-col overflow-hidden" style={{ minHeight: '250px', maxHeight: '350px' }}>
              {/* Invoice Items Table */}
              <div className="flex-1 overflow-auto p-3">
                {invoiceItems.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <ShoppingCart className="w-12 h-12 mr-3 text-gray-300" />
                    <div>
                      <p>No items added</p>
                      <p className="text-sm">Click products above to add items</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left py-2 px-2 font-medium text-gray-500">Product</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500">Unit</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500">Price</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500">Qty</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500">Total</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...invoiceItems].reverse().map((item) => {
                        const product = products.find(p => p._id === item.productId);
                        const hasUnits = product?.units && product.units.length > 0;
                        return (
                        <tr key={item.productId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-2">
                            <div className="font-medium text-gray-900 text-xs">{item.productName}</div>
                            <div className="text-xs text-gray-500">{item.sku}</div>
                          </td>
                          <td className="py-2 px-2">
                            {hasUnits || product?.baseUnit ? (
                              <div className="relative">
                                <button
                                  onClick={() => setOpenUnitSelector(openUnitSelector === item.productId ? null : item.productId)}
                                  className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50"
                                >
                                  {item.unitAbbreviation || product?.baseUnit || 'pc'}
                                </button>
                                {openUnitSelector === item.productId && (
                                  <div className="absolute z-10 top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg min-w-[160px]">
                                    <button
                                      onClick={() => handleUnitChange(item.productId, { 
                                        name: product!.baseUnit, 
                                        abbreviation: product!.baseUnit.substring(0, 3), 
                                        conversionToBase: 1, 
                                        price: product!.retailPrice 
                                      })}
                                      className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                                        !item.unitName || item.unitName === product?.baseUnit ? 'bg-emerald-50 font-medium' : ''
                                      }`}
                                    >
                                      {product?.baseUnit} (base) - {formatCurrency(product!.retailPrice)}
                                    </button>
                                    {product?.units?.map((unit, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => handleUnitChange(item.productId, unit)}
                                        className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                                          item.unitName === unit.name ? 'bg-emerald-50 font-medium' : ''
                                        }`}
                                      >
                                        {unit.name} ({unit.abbreviation}) - {formatCurrency(unit.price)}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">{item.unitAbbreviation || 'pc'}</span>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-20 px-2 py-1 border border-gray-200 rounded text-right text-xs"
                              value={item.unitPrice}
                              onChange={(e) => updateItemPrice(item.productId, parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => updateItemQuantity(item.productId, Math.max(1, item.quantity - 1))}
                                className="p-1 hover:bg-gray-100 rounded border"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-medium text-xs">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                                className="p-1 hover:bg-gray-100 rounded border"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="text-right py-2 px-2 font-medium text-gray-900 text-xs">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="text-center py-2 px-2">
                            <button
                              onClick={() => removeItem(item.productId)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>);
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Totals - Show for regular invoices with items OR for credit invoices */}
              {((invoiceType as string) === 'credit' || invoiceItems.length > 0) && (
                <div className="border-t border-gray-200 p-3 flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-6">
                    <div className="text-sm">
                      <span className="text-gray-500">Subtotal: </span>
                      <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">VAT (16%): </span>
                      <span className="font-medium">{formatCurrency(calculateTax(calculateSubtotal()))}</span>
                    </div>
                    <div className="text-lg font-bold">
                      Total: <span className="text-emerald-600">{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2 mr-2">
                      <ShoppingCart className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">{invoiceItems.length}</span>
                      <button 
                        onClick={() => setInvoiceItems([])}
                        className="text-red-500 hover:text-red-600 text-sm ml-1"
                      >
                        Clear
                      </button>
                    </div>
                    <Button 
                      className="flex-1"
                      size="sm"
                      onClick={handleSubmitInvoice}
                      disabled={!selectedCustomer || (invoiceItems.length === 0 && (invoiceType as string) === 'sale') || ((invoiceType as string) === 'credit' && !creditAmount)}
                    >
                      Create Invoice
                    </Button>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Invoice Details Footer */}
            {(invoiceItems.length > 0 || invoiceType === 'credit') && (
              <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Invoice Date:</label>
                    <input
                      type="date"
                      className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Payment Terms:</label>
                    <select
                      className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
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
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Due Date:</label>
                    <input
                      type="date"
                      className="px-3 py-1.5 border border-gray-200 bg-gray-100 rounded-lg text-sm"
                      value={dueDate}
                      readOnly
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      value={invoiceNotes}
                      onChange={(e) => setInvoiceNotes(e.target.value)}
                      placeholder="Optional notes..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Selection Modal */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => {
          setShowCustomerModal(false);
          setCustomerSearch('');
        }}
        title="Select Customer"
      >
        <div className="space-y-4">
          <Input
            placeholder="Search by name or phone..."
            value={customerSearch}
            onChange={(e) => handleSearchCustomer(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto space-y-2">
            {customers.map((customer) => (
              <button
                key={customer._id}
                onClick={() => selectCustomer(customer)}
                className="w-full p-3 text-left bg-gray-50 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                <div className="font-medium">{customer.name}</div>
                <div className="text-sm text-gray-500">
                  {customer.phone} • {customer.customerType || 'Customer'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Payment"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Balance Due</p>
            <p className="text-2xl font-bold text-gray-900">{selectedInvoice && formatCurrency(selectedInvoice.balanceDue)}</p>
          </div>
          
          <Input
            label="Payment Amount"
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="Enter amount"
          />
          
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {['cash', 'mpesa', 'card'].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`p-2 rounded-lg border-2 capitalize transition-colors ${
                    paymentMethod === method
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
          
          <Input
            label="Reference (optional)"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="Transaction reference"
          />
          
          <Button
            className="w-full"
            onClick={handleRecordPayment}
            disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
          >
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
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{selectedInvoice.customerName}</h3>
                <p className="text-sm text-gray-500">{selectedInvoice.customerPhone}</p>
              </div>
              {getStatusBadge(selectedInvoice.status)}
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2">Item</th>
                    <th className="text-center px-4 py-2">Qty</th>
                    <th className="text-right px-4 py-2">Price</th>
                    <th className="text-right px-4 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2">{item.productName}</td>
                      <td className="px-4 py-2 text-center">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right">Subtotal:</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(selectedInvoice.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-1 text-right">Tax:</td>
                    <td className="px-4 py-1 text-right">{formatCurrency(selectedInvoice.tax)}</td>
                  </tr>
                  <tr className="font-bold">
                    <td colSpan={3} className="px-4 py-2 text-right">Total:</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(selectedInvoice.total)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-1 text-right">Paid:</td>
                    <td className="px-4 py-1 text-right text-green-600">{formatCurrency(selectedInvoice.amountPaid)}</td>
                  </tr>
                  <tr className="font-bold">
                    <td colSpan={3} className="px-4 py-2 text-right">Balance:</td>
                    <td className="px-4 py-2 text-right text-red-600">{formatCurrency(selectedInvoice.balanceDue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => { setShowViewModal(false); setSelectedInvoice(selectedInvoice); setShowPrintPreview(true); }}
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
              {selectedInvoice.balanceDue > 0 && (
                <Button 
                  className="flex-1"
                  onClick={() => { setShowViewModal(false); setShowPaymentModal(true); }}
                >
                  <DollarSign className="w-4 h-4" />
                  Record Payment
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Print Preview Modal */}
      <Modal
        isOpen={showPrintPreview}
        onClose={() => { setShowPrintPreview(false); setShowInvoiceModal(false); resetInvoiceForm(); }}
        title="Print Invoice"
        size="lg"
      >
        {selectedInvoice && (
          <PrintPreview
            documentType={selectedInvoice.invoiceType === 'credit' ? 'creditInvoice' : 'invoice'}
            document={selectedInvoice}
            onPrint={() => {
              // Close both modals after printing and reset form
              setShowPrintPreview(false);
              setShowInvoiceModal(false);
              resetInvoiceForm();
            }}
            onClose={() => { setShowPrintPreview(false); setShowInvoiceModal(false); resetInvoiceForm(); }}
          />
        )}
      </Modal>
    </div>
  );
}
