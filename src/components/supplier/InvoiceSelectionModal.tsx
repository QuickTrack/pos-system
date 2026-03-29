'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, RefreshCw, CheckCircle, AlertCircle, FileText, DollarSign } from 'lucide-react';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  supplier: { _id: string; name: string };
  supplierName: string;
  total: number;
  amountPaid: number;
  balance: number;
  status: string;
  invoiceDate: string;
  dueDate: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitCost: number;
    total: number;
  }>;
}

interface InvoiceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (invoices: Invoice[], totalAmount: number) => void;
  supplierId?: string;
  supplierName?: string;
}

export function InvoiceSelectionModal({
  isOpen,
  onClose,
  onSelect,
  supplierId,
  supplierName,
}: InvoiceSelectionModalProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Fetch invoices when modal opens or supplier changes
  useEffect(() => {
    if (isOpen) {
      fetchInvoices();
    }
  }, [isOpen, supplierId]);

  // Reset selections when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedInvoices(new Set());
      setSelectAll(false);
      setSearchQuery('');
      setStatusFilter('all');
    }
  }, [isOpen]);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (supplierId) {
        params.set('supplier', supplierId);
      }
      // Only fetch unpaid or partially paid invoices
      params.set('status', 'unpaid,pending_approval,approved,partially_paid,overdue');
      
      const response = await fetch(`/api/supplier-invoices?${params}`);
      const data = await response.json();
      
      if (data.success) {
        // Transform the data to match the Invoice interface
        const transformedInvoices: Invoice[] = data.invoices.map((invoice: any) => ({
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          supplier: invoice.supplier || { _id: '', name: invoice.supplierName },
          supplierName: invoice.supplierName,
          total: invoice.total,
          amountPaid: invoice.amountPaid,
          balance: invoice.balance,
          status: invoice.status,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          items: invoice.items || [],
        }));
        setInvoices(transformedInvoices);
      } else {
        setError(data.error || 'Failed to fetch invoices');
      }
    } catch (err) {
      setError('Failed to fetch invoices. Please try again.');
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter invoices based on search and status
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const matchesSearch = 
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Calculate totals for selected invoices
  const selectionSummary = useMemo(() => {
    const selected = invoices.filter(inv => selectedInvoices.has(inv._id));
    const totalAmount = selected.reduce((sum, inv) => sum + inv.balance, 0);
    return { selected, totalAmount, count: selected.length };
  }, [invoices, selectedInvoices]);

  // Toggle individual invoice selection
  const toggleInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedInvoices(new Set());
    } else {
      const allIds = filteredInvoices.map(inv => inv._id);
      setSelectedInvoices(new Set(allIds));
    }
    setSelectAll(!selectAll);
  };

  // Handle confirm selection
  const handleConfirm = () => {
    onSelect(selectionSummary.selected, selectionSummary.totalAmount);
    onClose();
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: FileText },
      unpaid: { bg: 'bg-orange-100', text: 'text-orange-700', icon: AlertCircle },
      pending_approval: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertCircle },
      approved: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle },
      partially_paid: { bg: 'bg-purple-100', text: 'text-purple-700', icon: DollarSign },
      paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
    };
    return styles[status] || styles.draft;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Invoices for Payment"
      size="xl"
    >
      <div className="space-y-4">
        {/* Header with supplier info */}
        {supplierName && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500">Supplier</p>
            <p className="font-medium">{supplierName}</p>
          </div>
        )}

        {/* Search and filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by invoice number..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <Button variant="outline" onClick={fetchInvoices} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="ml-2 text-gray-600">Loading invoices...</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredInvoices.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No unpaid invoices found</p>
            {supplierId && (
              <p className="text-sm">for the selected supplier</p>
            )}
          </div>
        )}

        {/* Invoice list */}
        {!loading && !error && filteredInvoices.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Select all header */}
            <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                  className="rounded text-emerald-600"
                />
                <span className="text-sm font-medium">
                  Select All ({filteredInvoices.length} invoices)
                </span>
              </label>
              <span className="text-sm text-gray-500">
                {selectionSummary.count} selected
              </span>
            </div>

            {/* Invoice items */}
            <div className="max-h-[400px] overflow-y-auto">
              {filteredInvoices.map((invoice) => {
                const statusBadge = getStatusBadge(invoice.status);
                const StatusIcon = statusBadge.icon;
                const isSelected = selectedInvoices.has(invoice._id);
                
                return (
                  <div
                    key={invoice._id}
                    className={`flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''
                    }`}
                    onClick={() => toggleInvoice(invoice._id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleInvoice(invoice._id)}
                        className="rounded text-emerald-600"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(invoice.invoiceDate)} • Due: {formatDate(invoice.dueDate)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {invoice.items?.length || 0} item(s)
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(invoice.balance)}</p>
                      <p className="text-sm text-gray-500">
                        Total: {formatCurrency(invoice.total)}
                      </p>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusBadge.bg} ${statusBadge.text} mt-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {invoice.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selection summary */}
        {selectionSummary.count > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-emerald-700">Selected Invoices</p>
                <p className="text-2xl font-bold text-emerald-800">
                  {selectionSummary.count} invoice(s)
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-emerald-700">Total Amount</p>
                <p className="text-2xl font-bold text-emerald-800">
                  {formatCurrency(selectionSummary.totalAmount)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectionSummary.count === 0}
          >
            Confirm Selection ({selectionSummary.count})
          </Button>
        </div>
      </div>
    </Modal>
  );
}
