'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, RefreshCw, Eye, Truck, Package, CheckCircle, Clock, XCircle, X } from 'lucide-react';

interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
  receivedQuantity: number;
}

interface Supplier {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  costPrice: number;
  stockQuantity: number;
}

interface Purchase {
  _id: string;
  orderNumber: string;
  supplier: { name: string };
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: string;
  paymentStatus: string;
  orderDate: string;
  expectedDeliveryDate?: string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSupplierProducts, setSelectedSupplierProducts] = useState<Product[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productSearchRef = useRef<HTMLInputElement>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [orderNumberSuffix, setOrderNumberSuffix] = useState('');
  const [formData, setFormData] = useState({
    supplierId: '',
    supplierName: '',
    items: [] as any[],
    notes: '',
    paymentMethod: 'cash',
    amountPaid: 0,
    expectedDeliveryDate: '',
  });

  useEffect(() => {
    fetchPurchases();
  }, [status, paymentStatus]);

  useEffect(() => {
    // Filter products based on search query
    if (productSearchQuery) {
      const filtered = selectedSupplierProducts.filter(product => 
        product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(productSearchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
      setShowProductDropdown(true);
    } else {
      setFilteredProducts(selectedSupplierProducts);
      setShowProductDropdown(false);
    }
  }, [productSearchQuery, selectedSupplierProducts]);

  // Initialize filteredProducts when supplier changes
  useEffect(() => {
    if (selectedSupplierProducts.length > 0) {
      setFilteredProducts(selectedSupplierProducts);
    }
  }, [selectedSupplierProducts]);

  // Focus search input when modal opens
  useEffect(() => {
    if (showCreateModal) {
      const timer = setTimeout(() => {
        productSearchRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showCreateModal]);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers');
      const data = await response.json();
      if (data.success) setSuppliers(data.suppliers);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?limit=100');
      const data = await response.json();
      if (data.success) setProducts(data.products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find(s => s._id === supplierId);
    setFormData({ 
      ...formData, 
      supplierId,
      supplierName: supplier?.name || '',
      items: []
    });
    // Filter products by supplier
    const supplierProducts = products.filter(p => (p as any).supplier?._id === supplierId || (p as any).supplier === supplierId);
    setSelectedSupplierProducts(supplierProducts);
  };

  const addItem = (product: Product) => {
    const existingItem = formData.items.find((item: any) => item.productId === product._id);
    if (existingItem) {
      setFormData({
        ...formData,
        items: formData.items.map((item: any) => 
          item.productId === product._id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitCost }
            : item
        )
      });
    } else {
      setFormData({
        ...formData,
        items: [...formData.items, {
          productId: product._id,
          productName: product.name,
          quantity: 1,
          unitCost: product.costPrice || 0,
          total: product.costPrice || 0,
          receivedQuantity: 0,
        }]
      });
    }
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    setFormData({
      ...formData,
      items: formData.items.map((item: any) => 
        item.productId === productId 
          ? { ...item, quantity, total: quantity * item.unitCost }
          : item
      )
    });
  };

  const updateItemCost = (productId: string, unitCost: number) => {
    setFormData({
      ...formData,
      items: formData.items.map((item: any) => 
        item.productId === productId 
          ? { ...item, unitCost, total: item.quantity * unitCost }
          : item
      )
    });
  };

  const removeItem = (productId: string) => {
    setFormData({
      ...formData,
      items: formData.items.filter((item: any) => item.productId !== productId)
    });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum: number, item: any) => sum + item.total, 0);
  };

  const fetchPurchases = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (status) params.set('status', status);
      if (paymentStatus) params.set('paymentStatus', paymentStatus);

      const response = await fetch(`/api/purchases?${params}`);
      const data = await response.json();

      if (data.success) setPurchases(data.purchases);
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
      ordered: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Truck },
      partial: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Package },
      received: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    };
    return styles[status] || styles.pending;
  };

  const getPaymentBadge = (status: string) => {
    const styles: Record<string, string> = {
      unpaid: 'badge-error',
      partial: 'badge-warning',
      paid: 'badge-success',
    };
    return styles[status] || 'badge-neutral';
  };

  const columns = [
    {
      key: 'orderNumber',
      header: 'Order #',
      render: (item: Purchase) => (
        <span className="font-medium">{item.orderNumber}</span>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (item: Purchase) => item.supplier?.name || item.supplierName,
    },
    {
      key: 'items',
      header: 'Items',
      render: (item: Purchase) => (
        <span className="text-gray-600">{item.items?.length || 0} items</span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (item: Purchase) => (
        <span className="font-medium">{formatCurrency(item.total)}</span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (item: Purchase) => (
        <span className={item.balance > 0 ? 'text-red-600' : 'text-gray-600'}>
          {formatCurrency(item.balance)}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (item: Purchase) => (
        <span className={`badge ${getPaymentBadge(item.paymentStatus)} capitalize`}>
          {item.paymentStatus}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Purchase) => {
        const style = getStatusBadge(item.status);
        return (
          <span className={`badge ${style.bg} ${style.text} capitalize`}>
            {item.status}
          </span>
        );
      },
    },
    {
      key: 'orderDate',
      header: 'Date',
      render: (item: Purchase) => (
        <span className="text-gray-500 text-sm">{formatDate(item.orderDate)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Purchase) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedPurchase(item)}>
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const totalValue = purchases.reduce((sum, p) => sum + p.total, 0);
  const totalPaid = purchases.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalPending = purchases.filter(p => p.status === 'pending').length;
  const totalUnpaid = purchases.filter(p => p.paymentStatus === 'unpaid').length;

  return (
    <div>
      <Header title="Purchases" subtitle="Manage Supplier Orders" />
      
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
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
            <option value="ordered">Ordered</option>
            <option value="partial">Partial</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
          >
            <option value="">All Payments</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
          <Button variant="outline" onClick={fetchPurchases} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button onClick={() => {
            setFormData({
              supplierId: '',
              supplierName: '',
              items: [],
              notes: '',
              paymentMethod: 'cash',
              amountPaid: 0,
              expectedDeliveryDate: '',
            });
            setSelectedSupplierProducts([]);
            fetchSuppliers();
            fetchProducts();
            // Generate new order number based on last purchase
            const lastOrder = purchases[0];
            let newSuffix = '0001';
            if (lastOrder?.orderNumber) {
              const parts = lastOrder.orderNumber.split('-');
              if (parts.length >= 2) {
                const num = parseInt(parts[parts.length - 1]) || 0;
                newSuffix = String(num + 1).padStart(4, '0');
              }
            }
            setOrderNumberSuffix(newSuffix);
            setOrderNumber(`PO-${newSuffix}`);
            setShowCreateModal(true);
          }} className="gap-2">
            <Plus className="w-4 h-4" />
            New Order
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-2xl font-bold">{purchases.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Value</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalValue)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Paid</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Pending Delivery</p>
            <p className="text-2xl font-bold text-amber-600">{totalPending}</p>
          </Card>
        </div>

        {/* Purchases Table */}
        <Card>
          <CardHeader 
            title="All Purchase Orders" 
            subtitle={`${purchases.length} orders`}
          />
          <DataTable
            columns={columns}
            data={purchases}
            keyExtractor={(item) => item._id}
            loading={loading}
            emptyMessage="No purchases found"
          />
        </Card>
      </div>

      {/* Purchase Details Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">Order #{selectedPurchase.orderNumber}</h2>
                  <p className="text-sm text-gray-500">{formatDate(selectedPurchase.orderDate)}</p>
                </div>
                <button
                  onClick={() => setSelectedPurchase(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Supplier</p>
                  <p className="font-medium">{selectedPurchase.supplier?.name || selectedPurchase.supplierName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`badge ${getStatusBadge(selectedPurchase.status).bg} ${getStatusBadge(selectedPurchase.status).text} capitalize`}>
                    {selectedPurchase.status}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Items</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2">Product</th>
                        <th className="text-right px-4 py-2">Qty</th>
                        <th className="text-right px-4 py-2">Cost</th>
                        <th className="text-right px-4 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPurchase.items?.map((item, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-4 py-2">{item.productName}</td>
                          <td className="px-4 py-2 text-right">
                            <input
                              type="number"
                              min="0"
                              className="w-16 px-2 py-1 border border-gray-200 rounded text-right"
                              defaultValue={item.quantity}
                              id={`qty-${idx}`}
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-20 px-2 py-1 border border-gray-200 rounded text-right"
                              defaultValue={item.unitCost}
                              id={`cost-${idx}`}
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {formatCurrency(item.quantity * item.unitCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatCurrency(selectedPurchase.subtotal)}</span>
                </div>
                {selectedPurchase.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-red-500">-{formatCurrency(selectedPurchase.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax</span>
                  <span>{formatCurrency(selectedPurchase.tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-blue-600">{formatCurrency(selectedPurchase.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Paid</span>
                  <span className="text-emerald-600">{formatCurrency(selectedPurchase.amountPaid)}</span>
                </div>
                {selectedPurchase.balance > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Balance</span>
                    <span className="text-red-600">{formatCurrency(selectedPurchase.balance)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={async () => {
                  // Get updated values from input fields
                  const updatedItems = selectedPurchase.items.map((item: any, idx: number) => {
                    const qtyInput = document.getElementById(`qty-${idx}`) as HTMLInputElement;
                    const costInput = document.getElementById(`cost-${idx}`) as HTMLInputElement;
                    const quantity = parseInt(qtyInput?.value || item.quantity);
                    const unitCost = parseFloat(costInput?.value || item.unitCost);
                    return {
                      ...item,
                      quantity,
                      unitCost,
                      total: quantity * unitCost,
                    };
                  });
                  
                  try {
                    const response = await fetch(`/api/purchases/${selectedPurchase._id}/receive`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ items: updatedItems }),
                    });
                    if (response.ok) {
                      fetchPurchases();
                      setSelectedPurchase(null);
                    }
                  } catch (error) {
                    console.error('Failed to receive order:', error);
                  }
                }}
              >
                Receive Order
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={async () => {
                  const amount = prompt('Enter payment amount:');
                  if (amount && parseFloat(amount) > 0) {
                    try {
                      const response = await fetch(`/api/purchases/${selectedPurchase._id}/payment`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ amount: parseFloat(amount) }),
                      });
                      if (response.ok) {
                        fetchPurchases();
                        setSelectedPurchase(null);
                      }
                    } catch (error) {
                      console.error('Failed to record payment:', error);
                    }
                  }
                }}
              >
                Record Payment
              </Button>
              <Button onClick={() => setSelectedPurchase(null)} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Purchase Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-gray-900">
          <div className="h-full flex flex-col max-w-7xl mx-auto bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0 gap-4">
              <div className="flex items-center gap-6 flex-1">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Create Purchase Order</h2>
                  <p className="text-sm text-gray-500">Add new supplier order</p>
                </div>
                <div className="max-w-40">
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-gray-100 text-gray-600 border border-r-0 border-gray-200 rounded-l-lg text-sm">PO-</span>
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={orderNumberSuffix}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setOrderNumberSuffix(val);
                        setOrderNumber(`PO-${val}`);
                      }}
                      placeholder="0001"
                    />
                  </div>
                </div>
                <div className="flex-1 max-w-sm">
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
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form Content - Scrollable */}
            <div className="flex-1 overflow-auto p-6">
              <form onSubmit={async (e) => {
                e.preventDefault();
                // Close modal immediately on button click
                setShowCreateModal(false);
                try {
                  const response = await fetch('/api/purchases', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...formData, orderNumber }),
                  });
                  if (response.ok) {
                    fetchPurchases();
                  }
                } catch (error) {
                  console.error('Failed to create purchase:', error);
                }
              }} className="space-y-6">
                {/* Product Search Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-4">Add Products</h3>
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
                            <span className="text-xs text-gray-500 ml-2">SKU: {product.sku}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-emerald-600 font-medium">{formatCurrency(product.costPrice || 0)}</span>
                            <span className={`text-xs ${product.stockQuantity < 10 ? 'text-red-500' : 'text-gray-400'}`}>
                              Stock: {product.stockQuantity}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order Items Section */}
                {formData.items.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-4">Order Items</h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium">Product</th>
                            <th className="text-right px-4 py-2 font-medium">Qty</th>
                            <th className="text-right px-4 py-2 font-medium">Unit Cost</th>
                            <th className="text-right px-4 py-2 font-medium">Total</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.items.map((item: any, idx: number) => (
                            <tr key={idx} className="border-t border-gray-200">
                              <td className="px-4 py-2">{item.productName}</td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  min="1"
                                  className="w-20 px-2 py-1 border border-gray-200 rounded text-right"
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(item.productId, parseInt(e.target.value) || 1)}
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="w-24 px-2 py-1 border border-gray-200 rounded text-right"
                                  value={item.unitCost}
                                  onChange={(e) => updateItemCost(item.productId, parseFloat(e.target.value) || 0)}
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
                            <td colSpan={3} className="px-4 py-2 text-right font-medium">Total:</td>
                            <td className="px-4 py-2 text-right font-bold">{formatCurrency(calculateTotal())}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Additional Details Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-4">Payment & Delivery</h3>
                  <div className="grid grid-cols-2 gap-4 max-w-2xl">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        rows={2}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Optional notes"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={formData.expectedDeliveryDate}
                        onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      >
                        <option value="cash">Cash</option>
                        <option value="mpesa">M-Pesa</option>
                        <option value="card">Card</option>
                        <option value="credit">Credit</option>
                      </select>
                    </div>
                    {formData.paymentMethod !== 'credit' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={formData.amountPaid}
                          onChange={(e) => setFormData({ ...formData, amountPaid: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Order
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
