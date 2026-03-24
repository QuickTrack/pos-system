'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Search, Eye, RefreshCw, Download, Printer } from 'lucide-react';
import PrintPreview from '@/components/print/PrintPreview';

interface SaleItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Sale {
  _id: string;
  invoiceNumber: string;
  customer?: { name: string };
  customerName?: string;
  cashier: { name: string };
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  status: string;
  saleDate: string;
  isRefund?: boolean;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Settings state for print
  const [businessSettings, setBusinessSettings] = useState<any>(null);

  useEffect(() => {
    fetchSales();
    fetchSettings();
  }, [searchQuery, startDate, endDate, status]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setBusinessSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchSales = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (status) params.set('status', status);

      const response = await fetch(`/api/sales?${params}`);
      const data = await response.json();

      if (data.success) setSales(data.sales);
    } catch (error) {
      console.error('Failed to fetch sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'badge-success',
      pending: 'badge-warning',
      refunded: 'badge-error',
      voided: 'badge-neutral',
    };
    return styles[status] || 'badge-neutral';
  };

  const getPaymentBadge = (method: string) => {
    const styles: Record<string, string> = {
      cash: 'bg-emerald-100 text-emerald-700',
      mpesa: 'bg-purple-100 text-purple-700',
      card: 'bg-blue-100 text-blue-700',
      credit: 'bg-amber-100 text-amber-700',
    };
    return styles[method] || 'bg-gray-100 text-gray-700';
  };

  const columns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      render: (item: Sale) => (
        <span className="font-medium">
          {item.invoiceNumber}
          {item.status === 'refunded' && (
            <span className="ml-2 badge badge-error">Refunded</span>
          )}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (item: Sale) => item.customer?.name || item.customerName || 'Walk-in',
    },
    {
      key: 'cashier',
      header: 'Cashier',
      render: (item: Sale) => item.cashier?.name || '-',
    },
    {
      key: 'items',
      header: 'Items',
      render: (item: Sale) => (
        <span className="text-gray-600">{item.items?.length || 0} items</span>
      ),
    },
    {
      key: 'total',
      header: 'Amount',
      render: (item: Sale) => (
        <span className={`font-medium ${item.status === 'refunded' ? 'text-red-600 line-through' : ''}`}>
          {formatCurrency(item.total)}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Payment',
      render: (item: Sale) => (
        <span className={`badge ${getPaymentBadge(item.paymentMethod)} capitalize`}>
          {item.paymentMethod}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Sale) => (
        <span className={`badge ${getStatusBadge(item.status)} capitalize`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'saleDate',
      header: 'Date',
      render: (item: Sale) => (
        <span className="text-gray-500 text-sm">{formatDateTime(item.saleDate)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Sale) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedSale(item)}>
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalProfit = sales.reduce((sum, s) => {
    const profit = s.items.reduce((itemSum, item) => {
      return itemSum + (item.total - (item.unitPrice * 0.7 * item.quantity));
    }, 0);
    return sum + profit;
  }, 0);

  return (
    <div>
      <Header title="Sales" subtitle="View and Manage Transactions" />
      
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by invoice or customer..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <input
            type="date"
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="voided">Voided</option>
          </select>
          <Button variant="outline" onClick={fetchSales} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Transactions</p>
            <p className="text-2xl font-bold">{sales.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Estimated Profit</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalProfit)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Average Sale</p>
            <p className="text-2xl font-bold">
              {sales.length > 0 ? formatCurrency(totalRevenue / sales.length) : formatCurrency(0)}
            </p>
          </Card>
        </div>

        {/* Sales Table */}
        <Card>
          <CardHeader 
            title="All Sales" 
            subtitle={`${sales.length} transactions`}
            action={
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            }
          />
          <DataTable
            columns={columns}
            data={sales}
            keyExtractor={(item) => item._id}
            loading={loading}
            emptyMessage="No sales found"
          />
        </Card>
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">Invoice #{selectedSale.invoiceNumber}</h2>
                  <p className="text-sm text-gray-500">{formatDateTime(selectedSale.saleDate)}</p>
                </div>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Customer & Cashier */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium">{selectedSale.customer?.name || selectedSale.customerName || 'Walk-in Customer'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cashier</p>
                  <p className="font-medium">{selectedSale.cashier?.name || '-'}</p>
                </div>
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <p className="font-medium capitalize">{selectedSale.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`badge ${getStatusBadge(selectedSale.status)} capitalize`}>
                    {selectedSale.status}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Items</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2">Product</th>
                        <th className="text-right px-4 py-2">Qty</th>
                        <th className="text-right px-4 py-2">Price</th>
                        <th className="text-right px-4 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.items?.map((item, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-4 py-2">{item.productName}</td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-red-500">-{formatCurrency(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax</span>
                  <span>{formatCurrency(selectedSale.tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-emerald-600">{formatCurrency(selectedSale.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount Paid</span>
                  <span>{formatCurrency(selectedSale.amountPaid)}</span>
                </div>
                {selectedSale.change > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Change</span>
                    <span>{formatCurrency(selectedSale.change)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 gap-2"
                onClick={() => setShowPrintPreview(true)}
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </Button>
              <Button variant="outline" className="flex-1 gap-2">
                <RefreshCw className="w-4 h-4" />
                Process Refund
              </Button>
              <Button className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && selectedSale && (
        <PrintPreview
          documentType="receipt"
          document={{
            includeInPrice: businessSettings?.includeInPrice || false,
            invoiceNumber: (selectedSale as any).receiptNumber || (selectedSale as any)._id,
            date: (selectedSale as any).createdAt,
            customer: {
              name: (selectedSale as any).customer?.name || 'Cash Customer',
              phone: (selectedSale as any).customer?.phone || ''
            },
            items: (selectedSale as any).items?.map((item: any) => ({
              name: item.productName,
              unit: item.product?.baseUnit || '-',
              quantity: item.quantity,
              price: item.unitPrice,
              total: item.total
            })) || [],
            subtotal: (selectedSale as any).subtotal,
            tax: (selectedSale as any).tax,
            taxRate: (selectedSale as any).taxRate || 16,
            total: (selectedSale as any).total,
            payment: {
              amount: (selectedSale as any).amountPaid,
              method: (selectedSale as any).paymentMethod,
              change: (selectedSale as any).change
            }
          }}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
    </div>
  );
}
