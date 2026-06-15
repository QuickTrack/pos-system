'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Save,
  Send,
  Plus,
  Trash2,
  Search,
  Calculator,
  FileText,
  UserPlus,
} from 'lucide-react';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  businessName?: string;
  kraPin?: string;
  address?: string;
}

interface QuotationItem {
  product?: string;
  productName: string;
  sku?: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  tax: number;
  taxType: 'inclusive' | 'exclusive' | 'exempt';
  total: number;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  retailPrice: number;
  wholesalePrice: number;
  unit: string;
  baseUnit: string;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showInlineCustomerSearch, setShowInlineCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const [formData, setFormData] = useState({
    quotationNumber: '',
    customer: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    companyName: '',
    kraPin: '',
    deliveryAddress: '',
    customerNotes: '',
    quoteDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    salesperson: '',
    salespersonName: '',
    branch: '',
    branchName: '',
    currency: 'KES',
    taxRate: 16,
    taxInclusive: true,
    termsAndConditions: 'Prices valid for 7 days. Goods remain company property until fully paid.',
    notes: '',
  });

  const [items, setItems] = useState<QuotationItem[]>([]);
  const [shippingCharges, setShippingCharges] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [additionalChargesDesc, setAdditionalChargesDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState(false);
  const productSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (productSearch) {
      setFilteredProducts(
        products.filter(
          (p) =>
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.sku.toLowerCase().includes(productSearch.toLowerCase())
        )
      );
    } else {
      setFilteredProducts(products);
    }
  }, [productSearch, products]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers?limit=100', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setCustomers(data.customers);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=100', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setProducts(data.products);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const query = customerSearch.toLowerCase();
    return [
      customer.name,
      customer.phone,
      customer.email,
      customer.businessName,
    ].some((value) => value?.toLowerCase().includes(query));
  });

  const handleCustomerSelect = (customer: Customer) => {
    setFormData({
      ...formData,
      customer: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email || '',
      companyName: customer.businessName || '',
      deliveryAddress: customer.address || '',
    });
    setShowCustomerModal(false);
    setShowInlineCustomerSearch(false);
    setCustomerSearch('');
  };

  const handleTaxInclusiveChange = (checked: boolean) => {
    setFormData({ ...formData, taxInclusive: checked });
    setItems(items.map((item) => ({ ...item, taxType: checked ? 'inclusive' : 'exclusive' })));
  };

  const addItem = (product?: Product) => {
    const newItem: QuotationItem = {
      productName: product?.name || '',
      sku: product?.sku || '',
      quantity: 1,
      unit: product?.baseUnit || product?.unit || 'pcs',
      unitPrice: product?.retailPrice || 0,
      discount: 0,
      discountType: 'fixed',
      tax: formData.taxRate,
      taxType: formData.taxInclusive ? 'inclusive' : 'exclusive',
      total: 0,
    };
    if (product) newItem.product = product._id;
    setItems([newItem, ...items]);
    setProductSearch('');
    setShowProductSearch(true);
    setTimeout(() => productSearchRef.current?.focus(), 0);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount' || field === 'discountType' || field === 'tax' || field === 'taxType') {
      updated[index] = calculateItemTotal(updated[index]);
    }
    setItems(updated);
  };

  const calculateItemTotal = (item: QuotationItem): QuotationItem => {
    const subtotal = item.quantity * item.unitPrice;
    let discountAmount = 0;
    if (item.discountType === 'percentage') {
      discountAmount = subtotal * (item.discount / 100);
    } else {
      discountAmount = item.discount;
    }
    const afterDiscount = subtotal - discountAmount;
    let total = afterDiscount;
    if (item.taxType === 'exclusive') {
      total = afterDiscount * (1 + item.tax / 100);
    } else if (item.taxType === 'inclusive') {
      total = afterDiscount;
    }
    return { ...item, total: Math.max(0, total) };
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountTotal = items.reduce((sum, item) => {
    const line = item.quantity * item.unitPrice;
    return sum + (item.discountType === 'percentage' ? line * (item.discount / 100) : item.discount);
  }, 0);
  const vatTotal = items.reduce((sum, item) => {
    if (item.taxType === 'exclusive') {
      const line = item.quantity * item.unitPrice;
      const disc = item.discountType === 'percentage' ? line * (item.discount / 100) : item.discount;
      return sum + (line - disc) * (item.tax / 100);
    }
    return sum;
  }, 0);
  const grandTotal = Math.max(0, subtotal - discountTotal + vatTotal + shippingCharges + additionalCharges);

  const handleSave = async (status: 'draft' | 'sent' = 'draft') => {
    setSaveMessage('');
    setSaveError(false);

    if (items.length === 0) {
      setSaveMessage('Add at least one item before saving the quotation.');
      setSaveError(true);
      return;
    }

    if (!formData.customerName || !formData.customerPhone) {
      setSaveMessage('Select a customer before saving the quotation.');
      setSaveError(true);
      return;
    }

    if (status === 'sent' && !formData.customer) {
      setSaveMessage('Select a customer before saving and sending the quotation.');
      setSaveError(true);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          items,
          shippingCharges,
          additionalCharges,
          additionalChargesDescription: additionalChargesDesc,
          subtotal,
          discountTotal,
          vatTotal,
          grandTotal,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveMessage(data.error || 'Failed to save quotation.');
        setSaveError(true);
        return;
      }

      setSaveMessage(status === 'sent' ? 'Quotation saved and sent.' : 'Draft saved.');
      setTimeout(() => {
        if (status === 'sent' && data.quotation?._id) {
          router.push(`/quotations/${data.quotation._id}`);
          return;
        }
        router.push('/quotations');
      }, 500);
    } catch (err) {
      setSaveMessage('Failed to save quotation. Please try again.');
      setSaveError(true);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Header title="New Quotation" subtitle="Create a new quotation or estimate" />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          <div className="flex gap-2">
            <div className="relative min-w-[220px]">
              <button
                type="button"
                onClick={() => setShowInlineCustomerSearch(!showInlineCustomerSearch)}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <UserPlus className="w-4 h-4 text-gray-500" />
                <span className="max-w-[160px] truncate">
                  {formData.customerName || 'Select Customer'}
                </span>
              </button>
              {showInlineCustomerSearch && (
                <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
                  <div className="border-b p-3">
                    <Input
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                    {filteredCustomers.length === 0 ? (
                      <div className="rounded-lg p-3 text-center text-sm text-gray-500">No customers found</div>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer._id}
                          type="button"
                          onClick={() => handleCustomerSelect(customer)}
                          className="w-full rounded-md p-3 text-left hover:bg-emerald-50"
                        >
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500">
                            {customer.phone} {customer.businessName ? `• ${customer.businessName}` : ''}
                          </div>
                          {customer.email && <div className="text-xs text-gray-400">{customer.email}</div>}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving || items.length === 0}>
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button onClick={() => handleSave('sent')} disabled={saving || items.length === 0}>
              <Send className="w-4 h-4 mr-2" />
              Save & Send
            </Button>
          </div>
        </div>

        {saveMessage && (
          <div className={`rounded-lg px-4 py-3 text-sm ${saveError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            {saveMessage}
          </div>
        )}

        <div className="space-y-6">
          <Card className="w-full">
            <CardHeader
              title="Items"
              action={
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.taxInclusive}
                    onChange={(e) => handleTaxInclusiveChange(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Tax inclusive
                </label>
              }
            />
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    ref={productSearchRef}
                    placeholder="Search products by name, SKU, or barcode..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductSearch(true);
                  }}
                  onFocus={() => setShowProductSearch(true)}
                  className="pl-9"
                />
                {showProductSearch && productSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.map((p) => (
                      <div
                        key={p._id}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                        onClick={() => addItem(p)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-500">SKU: {p.sku} • {p.unit}</p>
                          </div>
                          <p className="text-sm font-medium text-emerald-600">{formatCurrency(p.retailPrice)}</p>
                        </div>
                      </div>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-500">No products found</div>
                    )}
                  </div>
                )}
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No items added</p>
                  <p className="text-sm text-gray-400">Search for products above or add manually</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-[36px_minmax(0,1fr)_96px_112px_140px_72px_140px_44px] gap-2 items-center bg-gray-50 border-b px-2 py-2 text-xs font-medium text-gray-600">
                    <span>#</span>
                    <span>Product</span>
                    <span className="text-center">Qty</span>
                    <span className="text-center">Unit Price</span>
                    <span className="text-center">Discount</span>
                    <span className="text-center">Tax</span>
                    <span className="text-right">Total</span>
                    <span></span>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto divide-y">
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-[36px_minmax(0,1fr)_96px_112px_140px_72px_140px_44px] gap-2 items-center px-2 py-1.5 hover:bg-gray-50 group">
                        <span className="text-gray-500 text-sm">{index + 1}</span>
                        <div>
                          <Input
                            value={item.productName}
                            onChange={(e) => updateItem(index, 'productName', e.target.value)}
                            placeholder="Product name"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                            min="1"
                            className="h-8 text-sm text-center"
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                            step="0.01"
                            className="h-8 text-sm text-center"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={item.discount}
                            onChange={(e) => updateItem(index, 'discount', Number(e.target.value))}
                            min="0"
                            step="0.01"
                            className="h-8 text-sm w-14"
                          />
                          <select
                            value={item.discountType}
                            onChange={(e) => updateItem(index, 'discountType', e.target.value)}
                            className="h-8 rounded-md border border-gray-300 px-1 text-xs bg-white"
                          >
                            <option value="fixed">F</option>
                            <option value="percentage">%</option>
                          </select>
                        </div>
                        <div>
                          <Input
                            type="number"
                            value={item.tax}
                            onChange={(e) => updateItem(index, 'tax', Number(e.target.value))}
                            min="0"
                            className="h-8 text-sm text-center"
                          />
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-900">{formatCurrency(calculateItemTotal(item).total)}</span>
                        </div>
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="outline" onClick={() => addItem()} className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="w-full lg:col-span-2">
              <CardHeader title="Notes & Terms" />
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                  <textarea
                    value={formData.termsAndConditions}
                    onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    placeholder="Additional notes..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
        </div>
              </div>
            </Card>

            <div className="lg:col-span-1 space-y-6">
              <Card className="w-full">
                <CardHeader title="Summary" />
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-medium text-red-600">-{formatCurrency(discountTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">VAT ({formData.taxRate}%)</span>
                    <span className="font-medium">{formatCurrency(vatTotal)}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Shipping</label>
                    <Input
                      type="number"
                      value={shippingCharges}
                      onChange={(e) => setShippingCharges(Number(e.target.value))}
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Additional Charges</label>
                    <Input
                      value={additionalChargesDesc}
                      onChange={(e) => setAdditionalChargesDesc(e.target.value)}
                      placeholder="Description"
                    />
                    <Input
                      type="number"
                      value={additionalCharges}
                      onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                      step="0.01"
                      className="mt-1"
                    />
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">Grand Total</span>
                    <span className="text-lg font-bold text-emerald-600">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </Card>

              <Card className="w-full">
                <CardHeader title="Details" />
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items</span>
                    <span className="font-medium">{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <Badge variant="yellow">Draft</Badge>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <Modal
          isOpen={showCustomerModal}
          onClose={() => {
            setShowCustomerModal(false);
            setCustomerSearch('');
          }}
          title="Select Customer"
          size="md"
        >
          <div className="space-y-4">
            <Input
              placeholder="Search by name, phone, email, or company..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full"
            />
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredCustomers.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                  No customers found
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer._id}
                    onClick={() => handleCustomerSelect(customer)}
                    className="w-full p-3 text-left bg-gray-50 hover:bg-emerald-50 rounded-lg border border-gray-200 hover:border-emerald-300 transition-colors"
                  >
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-gray-500">
                      {customer.phone} {customer.businessName ? `• ${customer.businessName}` : ''}
                    </div>
                    {customer.email && <div className="text-xs text-gray-400 mt-1">{customer.email}</div>}
                  </button>
                ))
              )}
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
