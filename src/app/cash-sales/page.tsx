'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { 
  Search, 
  Eye, 
  Printer, 
  RotateCcw,
  Banknote,
  Smartphone,
  CreditCard,
  ArrowLeft,
  X,
  Check
} from 'lucide-react';
import { generateThermalReceiptHTML, createReceiptData, ReceiptBusiness, printReceipt } from '@/lib/receipt-generator';

interface Sale {
  _id: string;
  invoiceNumber: string;
  saleDate: Date;
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  discountAmount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  cashierName: string;
  status: string;
  items: any[];
  isRefund?: boolean;
}

export default function CashSalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [businessSettings, setBusinessSettings] = useState<ReceiptBusiness>({
    name: 'POS',
    tagline: '',
    address: '',
    phone: '',
    email: '',
    vatNumber: '',
    kraPin: ''
  });
  const [processingReturn, setProcessingReturn] = useState(false);
  const [returnMessage, setReturnMessage] = useState('');

  useEffect(() => {
    fetchSales();
    fetchSettings();
  }, []);

  const [error, setError] = useState<string | null>(null);

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/sales?paymentMethod=cashsales&limit=100');
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('You are not authorized. Please log in again.');
        } else {
          setError(data.error || 'Failed to fetch sales');
        }
        return;
      }
      
      if (data.success) {
        setSales(data.sales);
      } else {
        setError(data.error || 'Failed to fetch sales');
      }
    } catch (err) {
      console.error('Failed to fetch sales:', err);
      setError('Failed to fetch sales. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.settings) {
        const settings = data.settings;
        setBusinessSettings({
          name: settings.businessName || 'POS',
          tagline: settings.businessTagline || '',
          address: settings.address || '',
          phone: settings.phone || '',
          email: settings.email || '',
          vatNumber: settings.vatNumber || '',
          kraPin: settings.kraPin || ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleView = (sale: Sale) => {
    setSelectedSale(sale);
    setShowDetailModal(true);
  };

  const handleReprint = async (sale: Sale) => {
    const receiptData = createReceiptData(
      sale,
      businessSettings,
      sale.cashierName || 'Cashier'
    );
    const receiptHTML = await generateThermalReceiptHTML(receiptData);
    printReceipt(receiptHTML);
  };

  const handleSalesReturn = (sale: Sale) => {
    setSelectedSale(sale);
    setShowReturnModal(true);
  };

  const processReturn = async () => {
    if (!selectedSale) return;
    
    setProcessingReturn(true);
    setReturnMessage('');
    
    try {
      // Call the sales returns API
      const response = await fetch('/api/sales/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalSaleId: selectedSale._id,
          items: selectedSale.items.map(item => ({
            productId: item.product,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          })),
          reason: 'Customer return',
          refundAmount: selectedSale.total,
          customerId: null
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setReturnMessage('Sales return processed successfully! Inventory updated.');
        setTimeout(() => {
          setShowReturnModal(false);
          setReturnMessage('');
          fetchSales();
        }, 2000);
      } else {
        setReturnMessage('Error: ' + (data.error || 'Failed to process return'));
      }
    } catch (error) {
      console.error('Return error:', error);
      setReturnMessage('Error processing return');
    } finally {
      setProcessingReturn(false);
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="w-4 h-4 text-green-600" />;
      case 'mpesa':
        return <Smartphone className="w-4 h-4 text-purple-600" />;
      case 'card':
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      default:
        return <Banknote className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Cash';
      case 'mpesa':
        return 'M-Pesa';
      case 'card':
        return 'Card';
      case 'mixed':
        return 'Mixed';
      default:
        return method;
    }
  };

  const filteredSales = sales.filter(sale => 
    sale.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sale.customerName && sale.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (sale.customerPhone && sale.customerPhone.includes(searchQuery))
  );

  return (
    <div>
      <Header title="Cash Sales" subtitle="View and manage cash-based transactions" />
      
      <div className="p-4">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={fetchSales}
              className="ml-4 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by invoice number, customer name, or phone..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Sales List */}
        <Card>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading sales...</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No sales found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Invoice</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Date</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Customer</th>
                    <th className="text-center p-3 text-xs font-semibold text-gray-600">Payment</th>
                    <th className="text-right p-3 text-xs font-semibold text-gray-600">Total</th>
                    <th className="text-center p-3 text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => (
                    <tr key={sale._id} className={`border-b hover:bg-gray-50 ${sale.status === 'refunded' ? 'bg-red-50' : ''}`}>
                      <td className="p-3">
                        <span className="font-medium text-gray-900">{sale.invoiceNumber}</span>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {formatDateTime(sale.saleDate)}
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-gray-900">{sale.customerName || 'Cash Customer'}</div>
                        {sale.customerPhone && (
                          <div className="text-xs text-gray-500">{sale.customerPhone}</div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {getPaymentIcon(sale.paymentMethod)}
                          <span className="text-xs">{getPaymentLabel(sale.paymentMethod)}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-semibold text-gray-900">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleView(sale)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReprint(sale)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            title="Reprint Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {sale.status !== 'refunded' && (
                            <button
                              onClick={() => handleSalesReturn(sale)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Sales Return"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          {sale.status === 'refunded' && (
                            <span className="text-xs text-gray-400 font-medium">
                              Refunded
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Sale Details - ${selectedSale?.invoiceNumber}`}
        size="lg"
      >
        {selectedSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="font-medium">{formatDateTime(selectedSale.saleDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Payment Method</p>
                <div className="flex items-center gap-1">
                  {getPaymentIcon(selectedSale.paymentMethod)}
                  <span className="font-medium">{getPaymentLabel(selectedSale.paymentMethod)}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Customer</p>
                <p className="font-medium">{selectedSale.customerName || 'Cash Customer'}</p>
                {selectedSale.customerPhone && (
                  <p className="text-sm text-gray-500">{selectedSale.customerPhone}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Cashier</p>
                <p className="font-medium">{selectedSale.cashierName}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-gray-500 mb-2">Items</p>
              <div className="space-y-2">
                {selectedSale.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.productName}</span>
                      <span className="text-gray-500"> x {item.quantity}</span>
                      {item.unitAbbreviation && (
                        <span className="text-gray-400"> ({item.unitAbbreviation})</span>
                      )}
                    </div>
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              {selectedSale.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount</span>
                  <span>-{formatCurrency(selectedSale.discountAmount)}</span>
                </div>
              )}
              {selectedSale.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span>{formatCurrency(selectedSale.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span className="text-emerald-600">{formatCurrency(selectedSale.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount Paid</span>
                <span>{formatCurrency(selectedSale.amountPaid)}</span>
              </div>
              {selectedSale.change > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Change</span>
                  <span>{formatCurrency(selectedSale.change)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleReprint(selectedSale)}
              >
                <Printer className="w-4 h-4 mr-2" />
                Reprint Receipt
              </Button>
              {selectedSale.status !== 'refunded' && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDetailModal(false);
                    handleSalesReturn(selectedSale);
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Sales Return
                </Button>
              )}
              {selectedSale.status === 'refunded' && (
                <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg px-4 py-2">
                  <span className="text-gray-500 font-medium">This sale has been refunded</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Return Modal */}
      <Modal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        title="Process Sales Return"
        size="md"
      >
        {selectedSale && (
          <div className="space-y-4">
            {returnMessage ? (
              <div className={`p-4 rounded-lg ${returnMessage.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                <div className="flex items-center gap-2">
                  {returnMessage.includes('Error') ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  <span>{returnMessage}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Invoice:</span>
                    <span className="font-medium">{selectedSale.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(selectedSale.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items:</span>
                    <span>{selectedSale.items?.length || 0}</span>
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-amber-800 text-sm">
                    This will process a full return for this sale. The following will happen:
                  </p>
                  <ul className="text-sm text-amber-700 mt-2 list-disc list-inside">
                    <li>Inventory will be restored for all items</li>
                    <li>A credit note will be created</li>
                    {selectedSale.customerName && <li>Customer account will be credited</li>}
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowReturnModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={processReturn}
                    isLoading={processingReturn}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Confirm Return
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
