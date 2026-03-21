'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, Download, Calendar, ChevronDown, User } from 'lucide-react';

interface Customer {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface Transaction {
  type: 'invoice' | 'payment' | 'credit';
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface AgedReceivables {
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  total: number;
}

interface Summary {
  totalInvoices: number;
  totalCredits: number;
  totalPayments: number;
  closingBalance: number;
  invoiceCount: number;
  creditCount: number;
  paymentCount: number;
}

interface Statement {
  customer: Customer;
  business: {
    businessName: string;
    businessTagline?: string;
    phone: string;
    email?: string;
    address?: string;
    kraPin?: string;
  };
  dateRange: {
    startDate: string | null;
    endDate: string | null;
    generatedAt: string;
  };
  transactions: Transaction[];
  agedReceivables: AgedReceivables;
  summary: Summary;
}

interface CustomerStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  preselectedCustomerId?: string;
}

export function CustomerStatementModal({ 
  isOpen, 
  onClose, 
  customers,
  preselectedCustomerId 
}: CustomerStatementModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [includeAged, setIncludeAged] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);
  const customerSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Filter customers based on search
  const filteredCustomers = customerSearch
    ? customers.filter(c => 
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch)
      )
    : customers;

  // Set preselected customer
  useEffect(() => {
    if (preselectedCustomerId && isOpen) {
      setSelectedCustomerId(preselectedCustomerId);
      fetchStatement(preselectedCustomerId, '', '');
    }
  }, [preselectedCustomerId, isOpen]);

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

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStatement(null);
      setSelectedCustomerId('');
      setStartDate('');
      setEndDate('');
      setCustomerSearch('');
    }
  }, [isOpen]);

  const fetchStatement = async (customerId: string, start: string, end: string) => {
    if (!customerId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('includeAged', 'true');
      if (start) params.set('startDate', start);
      if (end) params.set('endDate', end);

      const response = await fetch(`/api/customers/${customerId}/statement?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setStatement(data.statement);
      }
    } catch (error) {
      console.error('Failed to fetch statement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSearch = (value: string) => {
    setCustomerSearch(value);
    if (customerSearchTimeout.current) {
      clearTimeout(customerSearchTimeout.current);
    }
    customerSearchTimeout.current = setTimeout(() => {
      setShowCustomerDropdown(true);
    }, 300);
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer._id);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
    fetchStatement(customer._id, startDate, endDate);
  };

  const handleGenerate = () => {
    if (selectedCustomerId) {
      fetchStatement(selectedCustomerId, startDate, endDate);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent || !statement) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 10pt;
          line-height: 1.4;
          color: #1a1a1a;
          padding: 15mm;
          max-width: 210mm;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 3px solid #059669;
        }

        .business-name {
          font-size: 18pt;
          font-weight: 700;
          color: #059669;
        }

        .business-tagline {
          font-size: 9pt;
          color: #6b7280;
          margin-top: 2px;
        }

        .business-contact {
          font-size: 8pt;
          color: #6b7280;
          margin-top: 8px;
        }

        .doc-title {
          text-align: right;
        }

        .statement-title {
          font-size: 14pt;
          font-weight: 700;
          color: #1a1a1a;
        }

        .statement-period {
          font-size: 9pt;
          color: #6b7280;
          margin-top: 4px;
        }

        .statement-date {
          font-size: 7pt;
          color: #9ca3af;
          margin-top: 4px;
        }

        .customer-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }

        .customer-box, .summary-box {
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          padding: 12px;
        }

        .customer-box { background: #f9fafb; }
        .summary-box { background: #ecfdf5; }

        .section-label {
          font-size: 7pt;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .customer-name {
          font-size: 11pt;
          font-weight: 600;
          color: #1a1a1a;
        }

        .customer-details { font-size: 8pt; color: #4b5563; margin-top: 6px; }

        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .summary-item { text-align: center; padding: 4px; background: white; border-radius: 3px; }
        .summary-label { font-size: 7pt; color: #6b7280; }
        .summary-value { font-size: 10pt; font-weight: 700; }
        .value-invoices { color: #1d4ed8; }
        .value-credits { color: #b91c1c; }
        .value-payments { color: #047857; }
        .value-balance { color: #1a1a1a; }

        .aged-section { margin-bottom: 20px; }

        .aged-box {
          border: 1px solid #d1fae5;
          background: #ecfdf5;
          border-radius: 4px;
          padding: 10px;
        }

        .aged-title {
          font-size: 9pt;
          font-weight: 600;
          color: #059669;
          text-align: center;
          margin-bottom: 8px;
        }

        .aged-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }

        .aged-item {
          text-align: center;
          padding: 6px;
          background: white;
          border-radius: 3px;
        }

        .aged-label { font-size: 6pt; color: #6b7280; text-transform: uppercase; }
        .aged-value { font-size: 9pt; font-weight: 700; color: #1a1a1a; }

        .aged-total {
          margin-top: 8px;
          padding-top: 6px;
          border-top: 1px solid #a7f3d0;
          text-align: center;
          font-size: 9pt;
        }

        .aged-total span { font-weight: 600; color: #059669; }

        .transactions-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8pt;
          margin-bottom: 20px;
        }

        .transactions-table thead { background: #1f2937; color: white; }

        .transactions-table th {
          padding: 6px 4px;
          text-align: left;
          font-weight: 600;
          font-size: 7pt;
          text-transform: uppercase;
        }

        .transactions-table th.amount-col,
        .transactions-table td.amount-col { text-align: right; width: 70px; }

        .transactions-table th.balance-col,
        .transactions-table td.balance-col { text-align: right; width: 80px; }

        .transactions-table tbody tr { border-bottom: 1px solid #e5e7eb; }
        .transactions-table tbody tr:nth-child(even) { background: #f9fafb; }
        .transactions-table td { padding: 5px 4px; vertical-align: middle; }
        .transactions-table .amount { font-family: 'Courier New', monospace; font-weight: 500; }
        .transactions-table .balance { font-family: 'Courier New', monospace; font-weight: 600; }

        .type-badge {
          display: inline-block;
          padding: 1px 4px;
          border-radius: 2px;
          font-size: 6pt;
          font-weight: 600;
          text-transform: uppercase;
        }

        .type-invoice { background: #dbeafe; color: #1d4ed8; }
        .type-payment { background: #d1fae5; color: #047857; }
        .type-credit { background: #fee2e2; color: #b91c1c; }

        .balance-negative { color: #dc2626; }
        .balance-positive { color: #059669; }

        .footer {
          text-align: center;
          font-size: 7pt;
          color: #9ca3af;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        }

        @media print {
          body { padding: 0; font-size: 9pt; }
          .no-print { display: none !important; }
          .transactions-table thead { background: #374151 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .aged-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }

        @page { margin: 10mm; size: A4; }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Statement - ${statement.customer.name}</title>
          ${styles}
        </head>
        <body>
          <div class="header">
            <div class="business-info">
              <div class="business-name">${statement.business.businessName || 'Business Name'}</div>
              ${statement.business.businessTagline ? `<div class="business-tagline">${statement.business.businessTagline}</div>` : ''}
              <div class="business-contact">
                ${statement.business.phone ? `<span>${statement.business.phone}</span>` : ''}
                ${statement.business.email ? `<span> | ${statement.business.email}</span>` : ''}
                ${statement.business.address ? `<span> | ${statement.business.address}</span>` : ''}
              </div>
            </div>
            <div class="doc-title">
              <div class="statement-title">ACCOUNT STATEMENT</div>
              <div class="statement-period">${statement.dateRange.startDate && statement.dateRange.endDate ? `${formatDate(statement.dateRange.startDate)} - ${formatDate(statement.dateRange.endDate)}` : 'All Transactions'}</div>
              <div class="statement-date">Generated: ${formatDate(statement.dateRange.generatedAt)}</div>
            </div>
          </div>

          <div class="customer-section">
            <div class="customer-box">
              <div class="section-label">Bill To</div>
              <div class="customer-name">${statement.customer.name}</div>
              <div class="customer-details">
                ${statement.customer.phone ? `<div>📞 ${statement.customer.phone}</div>` : ''}
                ${statement.customer.email ? `<div>✉️ ${statement.customer.email}</div>` : ''}
                ${statement.customer.address ? `<div>📍 ${statement.customer.address}</div>` : ''}
              </div>
            </div>
            <div class="summary-box">
              <div class="section-label">Account Summary</div>
              <div class="summary-grid">
                <div class="summary-item">
                  <div class="summary-label">Invoices</div>
                  <div class="summary-value value-invoices">${formatCurrency(statement.summary.totalInvoices)}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Payments</div>
                  <div class="summary-value value-payments">${formatCurrency(statement.summary.totalPayments)}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Credits</div>
                  <div class="summary-value value-credits">${formatCurrency(statement.summary.totalCredits)}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Balance</div>
                  <div class="summary-value value-balance ${statement.summary.closingBalance < 0 ? 'balance-negative' : statement.summary.closingBalance > 0 ? 'balance-positive' : ''}">${formatCurrency(statement.summary.closingBalance)}</div>
                </div>
              </div>
            </div>
          </div>

          ${includeAged && statement.agedReceivables.total > 0 ? `
          <div class="aged-section">
            <div class="aged-box">
              <div class="aged-title">📊 Aged Receivables Summary</div>
              <div class="aged-grid">
                <div class="aged-item">
                  <div class="aged-label">Current</div>
                  <div class="aged-value">${formatCurrency(statement.agedReceivables.current)}</div>
                </div>
                <div class="aged-item">
                  <div class="aged-label">1-30 Days</div>
                  <div class="aged-value">${formatCurrency(statement.agedReceivables.days30)}</div>
                </div>
                <div class="aged-item">
                  <div class="aged-label">31-60 Days</div>
                  <div class="aged-value">${formatCurrency(statement.agedReceivables.days60)}</div>
                </div>
                <div class="aged-item">
                  <div class="aged-label">61-90 Days</div>
                  <div class="aged-value">${formatCurrency(statement.agedReceivables.days90)}</div>
                </div>
                <div class="aged-item">
                  <div class="aged-label">Over 90</div>
                  <div class="aged-value">${formatCurrency(statement.agedReceivables.over90)}</div>
                </div>
              </div>
              <div class="aged-total">
                <span>Total Outstanding: ${formatCurrency(statement.agedReceivables.total)}</span>
              </div>
            </div>
          </div>
          ` : ''}

          <div class="transactions-section">
            <table class="transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Type</th>
                  <th class="amount-col">Debit</th>
                  <th class="amount-col">PYMT</th>
                  <th class="balance-col">Balance</th>
                </tr>
              </thead>
              <tbody>
                ${statement.transactions.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align: center; padding: 20px; color: #6b7280;">No transactions found</td>
                </tr>
                ` : statement.transactions.map(tx => `
                <tr>
                  <td>${formatDate(tx.date)}</td>
                  <td style="font-weight: 500;">${tx.reference}</td>
                  <td><span class="type-badge type-${tx.type}">${tx.type}</span></td>
                  <td class="amount-col">${tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</td>
                  <td class="amount-col">${tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</td>
                  <td class="balance-col ${tx.balance < 0 ? 'balance-negative' : tx.balance > 0 ? 'balance-positive' : ''}">${formatCurrency(tx.balance)}</td>
                </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            ${statement.business.kraPin ? `<p>KRA PIN: ${statement.business.kraPin}</p>` : ''}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleExportCSV = () => {
    if (!statement) return;

    const headers = ['Date', 'Reference', 'Type', 'Debit', 'PYMT', 'Balance'];
    const rows = statement.transactions.map(tx => [
      formatDate(tx.date),
      tx.reference,
      tx.type,
      tx.debit.toFixed(2),
      tx.credit.toFixed(2),
      tx.balance.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `statement-${statement.customer.name}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      invoice: 'bg-blue-100 text-blue-700',
      payment: 'bg-emerald-100 text-emerald-700',
      credit: 'bg-red-100 text-red-700',
    };
    return styles[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Customer Statement"
      size="xl"
      className="max-w-5xl"
    >
      <div className="space-y-4">
        {/* Controls - No Print */}
        <div className="no-print space-y-4">
          {/* Customer Selection */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Customer
            </label>
            <div className="relative customer-dropdown">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customer..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={customerSearch}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  onFocus={() => setShowCustomerDropdown(true)}
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              
              {showCustomerDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {loading ? (
                    <div className="p-3 text-center text-gray-500">Loading...</div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="p-3 text-center text-gray-500">No customers found</div>
                  ) : (
                    filteredCustomers.map(customer => (
                      <button
                        key={customer._id}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex flex-col"
                        onClick={() => selectCustomer(customer)}
                      >
                        <span className="font-medium">{customer.name}</span>
                        <span className="text-xs text-gray-500">{customer.phone}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Date Range */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={handleGenerate} disabled={!selectedCustomerId || loading}>
                {loading ? 'Loading...' : 'Generate Statement'}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          {statement && (
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Statement
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportCSV}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          )}
        </div>

        {/* Statement Preview */}
        {statement && (
          <div ref={printRef} className="border border-gray-200 rounded-lg p-6 bg-white print:border-0 print:p-0">
            {/* Header - Enhanced Layout */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-emerald-600">
              <div className="flex-1">
                <h1 className="text-xl font-bold text-emerald-600">
                  {statement.business.businessName || 'Business Name'}
                </h1>
                {statement.business.businessTagline && (
                  <p className="text-sm text-gray-500 mt-1">{statement.business.businessTagline}</p>
                )}
                <div className="text-xs text-gray-500 mt-3 space-y-1">
                  {statement.business.phone && <div>📞 {statement.business.phone}</div>}
                  {statement.business.email && <div>✉️ {statement.business.email}</div>}
                  {statement.business.address && <div>📍 {statement.business.address}</div>}
                  {statement.business.kraPin && <div>🏢 KRA PIN: {statement.business.kraPin}</div>}
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold text-gray-900">ACCOUNT STATEMENT</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {statement.dateRange.startDate && statement.dateRange.endDate
                    ? `${formatDate(statement.dateRange.startDate)} - ${formatDate(statement.dateRange.endDate)}`
                    : 'All Transactions'}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Generated: {formatDate(statement.dateRange.generatedAt)}
                </p>
              </div>
            </div>

            {/* Customer Info - Two Column Layout */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bill To</p>
                <p className="font-semibold text-gray-900 text-lg">{statement.customer.name}</p>
                <div className="mt-3 text-sm text-gray-600 space-y-1">
                  {statement.customer.phone && <div>📞 {statement.customer.phone}</div>}
                  {statement.customer.email && <div>✉️ {statement.customer.email}</div>}
                  {statement.customer.address && <div>📍 {statement.customer.address}</div>}
                </div>
              </div>
              <div className="bg-emerald-50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">Account Summary</p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-xs text-gray-500">Total Invoices</p>
                    <p className="font-bold text-blue-600">{formatCurrency(statement.summary.totalInvoices)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Payments</p>
                    <p className="font-bold text-emerald-600">{formatCurrency(statement.summary.totalPayments)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Credits</p>
                    <p className="font-bold text-red-500">{formatCurrency(statement.summary.totalCredits)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Balance Due</p>
                    <p className={`font-bold text-lg ${statement.summary.closingBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatCurrency(statement.summary.closingBalance)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Aged Receivables */}
            {includeAged && statement.agedReceivables.total > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-emerald-800 mb-3 text-sm">📊 Aged Receivables Summary</h3>
                <div className="grid grid-cols-5 gap-3">
                  <div className="bg-white p-3 rounded text-center shadow-sm">
                    <div className="text-xs text-gray-500 uppercase">Current</div>
                    <div className="font-bold text-gray-900">{formatCurrency(statement.agedReceivables.current)}</div>
                  </div>
                  <div className="bg-white p-3 rounded text-center shadow-sm">
                    <div className="text-xs text-gray-500 uppercase">1-30 Days</div>
                    <div className="font-bold text-amber-600">{formatCurrency(statement.agedReceivables.days30)}</div>
                  </div>
                  <div className="bg-white p-3 rounded text-center shadow-sm">
                    <div className="text-xs text-gray-500 uppercase">31-60 Days</div>
                    <div className="font-bold text-orange-600">{formatCurrency(statement.agedReceivables.days60)}</div>
                  </div>
                  <div className="bg-white p-3 rounded text-center shadow-sm">
                    <div className="text-xs text-gray-500 uppercase">61-90 Days</div>
                    <div className="font-bold text-red-500">{formatCurrency(statement.agedReceivables.days90)}</div>
                  </div>
                  <div className="bg-white p-3 rounded text-center shadow-sm">
                    <div className="text-xs text-gray-500 uppercase">Over 90</div>
                    <div className="font-bold text-red-700">{formatCurrency(statement.agedReceivables.over90)}</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-emerald-200 text-center">
                  <span className="font-semibold text-emerald-800">Total Outstanding: </span>
                  <span className="font-bold text-emerald-600 text-lg">{formatCurrency(statement.agedReceivables.total)}</span>
                </div>
              </div>
            )}

            {/* Transactions Table - Enhanced */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">📋 Transaction Details</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Reference</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Type</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase">Debit</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase">PYMT</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      statement.transactions.map((tx, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 text-gray-600">{formatDate(tx.date)}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{tx.reference}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold uppercase ${
                              tx.type === 'invoice' ? 'bg-blue-100 text-blue-700' :
                              tx.type === 'payment' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-600">
                            {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-600">
                            {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                          </td>
                          <td className={`px-3 py-2 text-right font-mono font-semibold ${
                            tx.balance < 0 ? 'text-red-600' : tx.balance > 0 ? 'text-green-600' : 'text-gray-900'
                          }`}>
                            {formatCurrency(tx.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-800 text-white px-4 py-2">
                <h3 className="font-semibold text-sm">📊 Statement Summary</h3>
              </div>
              <div className="grid grid-cols-4">
                <div className="p-4 text-center border-r border-gray-200">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Total Invoices</div>
                  <div className="font-bold text-blue-600 text-lg mt-1">{formatCurrency(statement.summary.totalInvoices)}</div>
                  <div className="text-xs text-gray-400">{statement.summary.invoiceCount} invoice(s)</div>
                </div>
                <div className="p-4 text-center border-r border-gray-200">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Total Credits</div>
                  <div className="font-bold text-red-500 text-lg mt-1">{formatCurrency(statement.summary.totalCredits)}</div>
                  <div className="text-xs text-gray-400">{statement.summary.creditCount} credit(s)</div>
                </div>
                <div className="p-4 text-center border-r border-gray-200">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Total Payments</div>
                  <div className="font-bold text-emerald-600 text-lg mt-1">{formatCurrency(statement.summary.totalPayments)}</div>
                  <div className="text-xs text-gray-400">{statement.summary.paymentCount} payment(s)</div>
                </div>
                <div className="p-4 text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Closing Balance</div>
                  <div className={`font-bold text-lg mt-1 ${statement.summary.closingBalance < 0 ? 'text-red-600' : statement.summary.closingBalance > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {formatCurrency(statement.summary.closingBalance)}
                  </div>
                  <div className="text-xs text-gray-400">Outstanding</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 pt-4 border-t">
              <p>Thank you for your business!</p>
              <p className="mt-1">Please contact us if you have any questions about this statement.</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
