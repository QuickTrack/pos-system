'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { 
  ArrowRightLeft, 
  Package, 
  Plus, 
  Search, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock,
  ArrowRight,
  Loader2,
  X,
  Filter
} from 'lucide-react';

interface TransferItem {
  product: string;
  productName: string;
  productSku: string;
  quantity: number;
}

interface Transfer {
  _id: string;
  transferNumber: string;
  sourceLocation: string;
  destinationLocation: string;
  status: string;
  items: TransferItem[];
  notes?: string;
  requestedByName?: string;
  requestDate: string;
  approvedByName?: string;
  approvalDate?: string;
  shippedByName?: string;
  shippedDate?: string;
  receivedByName?: string;
  receivedDate?: string;
  rejectedByName?: string;
  rejectionDate?: string;
  rejectionReason?: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  shopStock: number;
  remoteStock: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  in_transit: { label: 'In Transit', color: 'bg-purple-100 text-purple-800', icon: Truck },
  received: { label: 'Received', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function StockTransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [sourceLocation, setSourceLocation] = useState('shop');
  const [destinationLocation, setDestinationLocation] = useState('remote');
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Available products for source location
  const availableProducts = products.filter(p => {
    const stock = sourceLocation === 'shop' ? p.shopStock : p.remoteStock;
    return stock > 0;
  });

  useEffect(() => {
    fetchTransfers();
    fetchProducts();
  }, [filterStatus]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const url = filterStatus !== 'all' 
        ? `/api/stock-transfers?status=${filterStatus}`
        : '/api/stock-transfers';
      const response = await fetch(url);
      const data = await response.json();
      setTransfers(data.transfers || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleCreateTransfer = async () => {
    if (transferItems.length === 0) {
      alert('Please add at least one item to transfer');
      return;
    }
    
    if (sourceLocation === destinationLocation) {
      alert('Source and destination locations must be different');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/stock-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceLocation,
          destinationLocation,
          items: transferItems,
          notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create transfer');
      }

      const data = await response.json();
      setShowCreateModal(false);
      resetForm();
      fetchTransfers();
      alert(`Transfer ${data.transfer.transferNumber} created successfully`);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (transferId: string, action: string, notes?: string) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/stock-transfers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transferId, action, notes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update transfer');
      }

      fetchTransfers();
      setShowDetailModal(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSourceLocation('shop');
    setDestinationLocation('remote');
    setTransferItems([]);
    setNotes('');
  };

  const addItem = (product: Product) => {
    const existing = transferItems.find(item => item.product === product._id);
    if (existing) {
      setTransferItems(transferItems.map(item => 
        item.product === product._id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setTransferItems([...transferItems, {
        product: product._id,
        productName: product.name,
        productSku: product.sku,
        quantity: 1,
      }]);
    }
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setTransferItems(transferItems.filter(item => item.product !== productId));
    } else {
      setTransferItems(transferItems.map(item => 
        item.product === productId ? { ...item, quantity } : item
      ));
    }
  };

  const getLocationStock = (product: Product) => {
    return sourceLocation === 'shop' ? product.shopStock : product.remoteStock;
  };

  const filteredTransfers = transfers.filter(t => 
    t.transferNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.items.some(item => item.productName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Stock Transfers" subtitle="Manage inventory transfers between locations" />
      
      <main className="p-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transfers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="in_transit">In Transit</option>
              <option value="received">Received</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Transfer
          </Button>
        </div>

        {/* Transfers List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredTransfers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 text-gray-500">
              <ArrowRightLeft className="w-12 h-12 mb-4 text-gray-300" />
              <p>No transfers found</p>
              <p className="text-sm">Create a new transfer to move stock between locations</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredTransfers.map((transfer) => {
              const StatusIcon = STATUS_CONFIG[transfer.status]?.icon || Clock;
              return (
                <div
                  key={transfer._id} 
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedTransfer(transfer);
                    setShowDetailModal(true);
                  }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[transfer.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                            <div className="flex items-center gap-1">
                              <StatusIcon className="w-3 h-3" />
                              {STATUS_CONFIG[transfer.status]?.label || transfer.status}
                            </div>
                          </div>
                          <div>
                            <p className="font-medium">{transfer.transferNumber}</p>
                            <p className="text-sm text-gray-500">
                              {transfer.items.length} item(s) • {transfer.requestedByName || 'Unknown'} • {new Date(transfer.requestDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="capitalize">{transfer.sourceLocation}</span>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <span className="capitalize">{transfer.destinationLocation}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Transfer Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); resetForm(); }} size="xl" title="Create Stock Transfer">
        <div className="space-y-6">
          {/* Location Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Location
              </label>
              <select
                value={sourceLocation}
                onChange={(e) => {
                  setSourceLocation(e.target.value);
                  setTransferItems([]);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="shop">Shop / Onsite</option>
                <option value="remote">Remote Store</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination Location
              </label>
              <select
                value={destinationLocation}
                onChange={(e) => setDestinationLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="remote">Remote Store</option>
                <option value="shop">Shop / Onsite</option>
              </select>
            </div>
          </div>

          {/* Products Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Products from {sourceLocation === 'shop' ? 'Shop' : 'Remote Store'}
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {availableProducts.length === 0 ? (
                <p className="p-4 text-center text-gray-500">No products with stock at this location</p>
              ) : (
                availableProducts.map((product) => (
                  <div
                    key={product._id}
                    className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => addItem(product)}
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-emerald-600">{getLocationStock(product)}</p>
                      <p className="text-xs text-gray-500">available</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selected Items */}
          {transferItems.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Items to Transfer
              </label>
              <div className="space-y-2">
                {transferItems.map((item) => {
                  const product = products.find(p => p._id === item.product);
                  const maxQty = product ? getLocationStock(product) : 0;
                  return (
                    <div key={item.product} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-gray-500">Max: {maxQty}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateItemQuantity(item.product, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.product, parseInt(e.target.value) || 0)}
                          max={maxQty}
                          className="w-16 text-center border border-gray-300 rounded-lg py-1"
                        />
                        <button
                          onClick={() => updateItemQuantity(item.product, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        >
                          +
                        </button>
                        <button
                          onClick={() => updateItemQuantity(item.product, 0)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes about this transfer..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateTransfer} disabled={submitting || transferItems.length === 0}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4 mr-2" />
                  Create Transfer
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Transfer Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} size="lg" title={`Transfer ${selectedTransfer?.transferNumber || ''}`}>
        {selectedTransfer && (
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center justify-between">
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${STATUS_CONFIG[selectedTransfer.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                {STATUS_CONFIG[selectedTransfer.status]?.label || selectedTransfer.status}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="capitalize">{selectedTransfer.sourceLocation}</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <span className="capitalize">{selectedTransfer.destinationLocation}</span>
              </div>
            </div>

            {/* Items */}
            <div>
              <h4 className="font-medium mb-3">Transfer Items</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTransfer.items.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-2">{item.productName}</td>
                        <td className="px-4 py-2 text-right font-medium">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Timeline */}
            <div className="text-sm text-gray-600">
              <p>Requested by: {selectedTransfer.requestedByName || 'Unknown'} on {new Date(selectedTransfer.requestDate).toLocaleDateString()}</p>
              {selectedTransfer.approvedByName && (
                <p>Approved by: {selectedTransfer.approvedByName} on {new Date(selectedTransfer.approvalDate!).toLocaleDateString()}</p>
              )}
              {selectedTransfer.shippedByName && (
                <p>Shipped by: {selectedTransfer.shippedByName} on {new Date(selectedTransfer.shippedDate!).toLocaleDateString()}</p>
              )}
              {selectedTransfer.receivedByName && (
                <p>Received by: {selectedTransfer.receivedByName} on {new Date(selectedTransfer.receivedDate!).toLocaleDateString()}</p>
              )}
              {selectedTransfer.rejectedByName && (
                <p className="text-red-600">Rejected by: {selectedTransfer.rejectedByName} - {selectedTransfer.rejectionReason}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              {selectedTransfer.status === 'pending' && (
                <>
                  <Button variant="outline" onClick={() => handleUpdateStatus(selectedTransfer._id, 'reject', 'Rejected by user')}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button onClick={() => handleUpdateStatus(selectedTransfer._id, 'approve')}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </>
              )}
              {selectedTransfer.status === 'approved' && (
                <Button onClick={() => handleUpdateStatus(selectedTransfer._id, 'ship')}>
                  <Truck className="w-4 h-4 mr-2" />
                  Mark as Shipped
                </Button>
              )}
              {selectedTransfer.status === 'in_transit' && (
                <Button onClick={() => handleUpdateStatus(selectedTransfer._id, 'receive')}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Received
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
