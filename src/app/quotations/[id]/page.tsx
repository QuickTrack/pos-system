'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Send,
  CheckCircle,
  XCircle,
  RefreshCw,
  Printer,
  Mail,
  MessageSquare,
  ArrowLeft,
  Edit,
  FilePlus,
} from 'lucide-react';

interface QuotationItem {
  productName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  discountType: string;
  tax: number;
  total: number;
}

interface Quotation {
  _id: string;
  quotationNumber: string;
  status: string;
  convertedToType?: string;
  convertedTo?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  companyName?: string;
  kraPin?: string;
  deliveryAddress?: string;
  customerNotes?: string;
  quoteDate: string;
  validUntil: string;
  salespersonName: string;
  branchName: string;
  currency: string;
  items: QuotationItem[];
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  shippingCharges: number;
  additionalCharges: number;
  additionalChargesDescription?: string;
  grandTotal: number;
  taxRate: number;
  termsAndConditions?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface BusinessSettings {
  businessName: string;
  businessTagline?: string;
  phone?: string;
  email?: string;
  address?: string;
  kraPin?: string;
  vatNumber?: string;
  logo?: string;
  taxName?: string;
}

const statusConfig: Record<string, { label: string; variant: any }> = {
  draft: { label: 'Draft', variant: 'gray' },
  pending_approval: { label: 'Pending Approval', variant: 'yellow' },
  sent: { label: 'Sent', variant: 'blue' },
  viewed: { label: 'Viewed', variant: 'purple' },
  accepted: { label: 'Accepted', variant: 'emerald' },
  rejected: { label: 'Rejected', variant: 'red' },
  expired: { label: 'Expired', variant: 'gray' },
  converted: { label: 'Converted', variant: 'emerald' },
  cancelled: { label: 'Cancelled', variant: 'gray' },
};

const quotationPrintStyles = `
  @page {
    size: A4;
    margin: 12mm;
  }

  @media print {
    body {
      background: #ffffff !important;
    }

    .quotation-page-shell {
      padding: 0 !important;
      margin: 0 !important;
      background: #ffffff !important;
    }

    .quotation-print-template {
      max-width: none !important;
      margin: 0 !important;
      font-family: Arial, Helvetica, sans-serif;
    }

    .quotation-print-template .dashboard-card {
      box-shadow: none !important;
      border: 0 !important;
      border-radius: 0 !important;
      padding: 0 !important;
    }

    .quotation-print-template .p-8 {
      padding: 0 !important;
    }
  }
`;

function addDays(dateString: string, days: number): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export default function QuotationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [conversionError, setConversionError] = useState('');
  const [conversionWarning, setConversionWarning] = useState('');
  const [conversionMessage, setConversionMessage] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState(30);
  const [dueDate, setDueDate] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState<'draft' | 'sent'>('draft');
  const [conversionNotes, setConversionNotes] = useState('');
  const [conversionTerms, setConversionTerms] = useState('');
  const [allowExpired, setAllowExpired] = useState(false);

  const fetchQuotation = useCallback(async () => {
    try {
      const res = await fetch(`/api/quotations/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setQuotation(data.quotation);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuotation();
  }, [fetchQuotation]);

  useEffect(() => {
    const fetchBusinessSettings = async () => {
      try {
        const res = await fetch('/api/settings', { credentials: 'include' });
        const data = await res.json();
        if (data.settings) {
          setBusinessSettings({
            businessName: data.settings.businessName || 'QuickTrack InfoSystems ERP',
            businessTagline: data.settings.businessTagline || '',
            phone: data.settings.phone || '',
            email: data.settings.email || '',
            address: data.settings.address || '',
            kraPin: data.settings.kraPin || '',
            vatNumber: data.settings.vatNumber || '',
            logo: data.settings.logo || '',
            taxName: data.settings.taxName || 'VAT'
          });
        }
      } catch (error) {
        console.error('Failed to load business settings:', error);
      }
    };

    fetchBusinessSettings();
  }, []);

  const handleAction = async (action: string, data?: any) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/quotations/${id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, data }),
      });
      if (res.ok) fetchQuotation();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrint = () => {
    if (!quotation) return;

    const content = documentRef.current?.innerHTML;
    if (!content) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const fileName = `${quotation.customerName || 'Customer'} ${quotation.quotationNumber}`
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || quotation.quotationNumber;

    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join('\n');
        } catch {
          return '';
        }
      })
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${fileName}</title>
          <style>${styles}${quotationPrintStyles}</style>
        </head>
        <body>
          <main class="quotation-print-template">
            ${content}
          </main>
        </body>
      </html>
    `);
    printWindow.document.title = fileName;
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const resetConversionForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setInvoiceNumber('');
    setInvoiceDate(today);
    setPaymentTerms(30);
    setDueDate(addDays(today, 30));
    setInvoiceStatus('draft');
    setConversionNotes('');
    setConversionTerms(quotation?.termsAndConditions || '');
    setAllowExpired(false);
    setConversionError('');
    setConversionWarning('');
    setConversionMessage('');
  };

  const openConversionModal = () => {
    resetConversionForm();
    setShowConvertModal(true);
  };

  const handleInvoiceDateChange = (value: string) => {
    setInvoiceDate(value);
    setDueDate(addDays(value, paymentTerms));
  };

  const handlePaymentTermsChange = (value: number) => {
    setPaymentTerms(value);
    setDueDate(addDays(invoiceDate, value));
  };

  const handleConvertToInvoice = async () => {
    if (!quotation) return;

    setConversionLoading(true);
    setConversionError('');
    setConversionWarning('');
    setConversionMessage('');

    try {
      const response = await fetch(`/api/quotations/${id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'convert_to_invoice',
          data: {
            invoiceNumber: invoiceNumber.trim() || undefined,
            invoiceDate,
            paymentTerms,
            dueDate,
            status: invoiceStatus,
            notes: conversionNotes.trim() || undefined,
            terms: conversionTerms.trim() || undefined,
            allowExpired,
            quotationVersion: quotation.updatedAt
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        const warningMessage = data.creditLimitWarning?.message;
        setQuotation(data.quotation);
        setConversionWarning(warningMessage || '');
        setConversionMessage(
          warningMessage
            ? `Quotation converted to invoice ${data.invoice.invoiceNumber}. Warning: ${warningMessage}`
            : `Quotation converted to invoice ${data.invoice.invoiceNumber}.`
        );
        setShowConvertModal(false);
        window.location.href = `/create-invoice?invoiceId=${encodeURIComponent(data.invoice._id)}`;
      } else {
        setConversionError(data.message || data.error || 'Failed to convert quotation to invoice.');
      }
    } catch (error) {
      console.error('Failed to convert quotation:', error);
      setConversionError('Failed to convert quotation to invoice. Please try again.');
    } finally {
      setConversionLoading(false);
    }
  };

  const handleWhatsApp = () => {
    if (!quotation) return;
    const message = encodeURIComponent(
      `Dear ${quotation.customerName},\n\nHere is your quotation ${quotation.quotationNumber} for ${formatCurrency(quotation.grandTotal)}.\n\nValid until: ${formatDate(quotation.validUntil)}\n\nKind regards,`
    );
    window.open(`https://wa.me/${quotation.customerPhone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  const handleEmail = () => {
    if (!quotation?.customerEmail) return;
    const subject = encodeURIComponent(`Quotation ${quotation.quotationNumber}`);
    const body = encodeURIComponent(
      `Dear ${quotation.customerName},\n\nPlease find your quotation ${quotation.quotationNumber} below.\n\nTotal: ${formatCurrency(quotation.grandTotal)}\nValid until: ${formatDate(quotation.validUntil)}\n\nKind regards,`
    );
    window.location.href = `mailto:${quotation.customerEmail}?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <div>
        <Header title="Quotation Details" subtitle="Loading..." />
        <div className="p-6 flex items-center justify-center py-20">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div>
        <Header title="Quotation Details" subtitle="Not found" />
        <div className="p-6 text-center py-20">
          <p className="text-gray-500">Quotation not found</p>
        </div>
      </div>
    );
  }

  const status = statusConfig[quotation.status] || statusConfig.draft;
  const isEditable = ['draft', 'pending_approval'].includes(quotation.status);

  return (
    <>
      <style>{quotationPrintStyles}</style>

      <div className="quotation-page-shell">
      <div className="no-print">
        <Header title={`Quotation ${quotation.quotationNumber}`} subtitle={status.label} />
      </div>

      <div className="p-6 space-y-6">
        {/* Actions */}
        <div className="no-print flex items-center justify-between">
          <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex gap-2">
            {isEditable && (
              <Button variant="outline" className="gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            )}
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={openConversionModal}
              disabled={!['draft', 'pending_approval', 'sent', 'viewed', 'accepted', 'expired'].includes(quotation.status) || quotation.convertedToType === 'invoice'}
              className="gap-2"
            >
              <FilePlus className="w-4 h-4" />
              Convert to Invoice
            </Button>
            <Button variant="outline" onClick={handleEmail} className="gap-2" disabled={!quotation.customerEmail}>
              <Mail className="w-4 h-4" />
              Email
            </Button>
            <Button variant="outline" onClick={handleWhatsApp} className="gap-2">
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </Button>
            {quotation.status === 'draft' && (
              <Button onClick={() => handleAction('send')} disabled={actionLoading === 'send'} className="gap-2">
                <Send className="w-4 h-4" />
                Send
              </Button>
            )}
            {quotation.status === 'sent' && (
              <Button onClick={() => handleAction('accept')} disabled={actionLoading === 'accept'} className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Accept
              </Button>
            )}
            {quotation.status === 'sent' && (
              <Button variant="outline" onClick={() => handleAction('reject')} disabled={actionLoading === 'reject'} className="gap-2 text-red-600">
                <XCircle className="w-4 h-4" />
                Reject
              </Button>
            )}
            <Button variant="outline" onClick={fetchQuotation} className="gap-2">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {conversionMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-medium">{conversionMessage}</p>
            <a href="/create-invoice" className="mt-2 inline-flex font-medium underline">
              View invoice list
            </a>
          </div>
        )}

        {/* Professional Quotation Template */}
        <Card className="quotation-print-template max-w-4xl mx-auto">
          <div ref={documentRef} className="p-8">
            {/* Header */}
            <div className="flex items-start justify-between pb-6 border-b">
              <div className="flex items-start gap-4">
                {businessSettings?.logo && (
                  <Image src={businessSettings.logo} alt={businessSettings.businessName} className="w-20 h-20 object-contain" width={80} height={80} unoptimized />
                )}
                <div>
                  <h1 className="text-3xl font-bold text-emerald-700">CUSTOMER QUOTATION</h1>
                  <p className="text-sm text-gray-500 mt-1">{businessSettings?.businessName || 'QuickTrack InfoSystems ERP'}</p>
                  {businessSettings?.businessTagline && <p className="text-xs text-gray-400 mt-1">{businessSettings.businessTagline}</p>}
                  <div className="text-xs text-gray-500 mt-4 space-y-0.5">
                    {businessSettings?.address && <p>{businessSettings.address}</p>}
                    {businessSettings?.phone && <p>{businessSettings.phone}</p>}
                    {businessSettings?.email && <p>{businessSettings.email}</p>}
                    {businessSettings?.vatNumber && <p>VAT: {businessSettings.vatNumber}</p>}
                    {businessSettings?.kraPin && <p>KRA PIN: {businessSettings.kraPin}</p>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{quotation.quotationNumber}</p>
                <p className="text-sm text-gray-500 mt-1">Date: {formatDate(quotation.quoteDate)}</p>
                <p className="text-sm text-gray-500 mt-1">Valid Until: {formatDate(quotation.validUntil)}</p>
                <Badge variant={status.variant} className="mt-1 no-print">{status.label}</Badge>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-8 py-6 border-b">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Quotation Details</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-600">Quote No:</span> <span className="font-medium ml-2">{quotation.quotationNumber}</span></p>
                  <p><span className="text-gray-600">Date:</span> <span className="font-medium ml-2">{formatDate(quotation.quoteDate)}</span></p>
                  <p><span className="text-gray-600">Valid Until:</span> <span className="font-medium ml-2">{formatDate(quotation.validUntil)}</span></p>
                  <p className="no-print"><span className="text-gray-600">Sales Rep:</span> <span className="font-medium ml-2">{quotation.salespersonName}</span></p>
                  <p className="no-print"><span className="text-gray-600">Branch:</span> <span className="font-medium ml-2">{quotation.branchName}</span></p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Customer Information</h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-gray-900">{quotation.customerName}</p>
                  {quotation.companyName && <p className="text-gray-600">{quotation.companyName}</p>}
                  {quotation.kraPin && <p className="text-gray-600">KRA: {quotation.kraPin}</p>}
                  <p className="text-gray-600">{quotation.customerPhone}</p>
                  {quotation.customerEmail && <p className="text-gray-600">{quotation.customerEmail}</p>}
                  {quotation.deliveryAddress && <p className="text-gray-600">{quotation.deliveryAddress}</p>}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-6 border-b">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {quotation.items.map((item, idx) => (
                    <tr key={idx} className="text-sm">
                      <td className="px-4 py-3 font-medium">{item.productName}</td>
                      <td className="px-4 py-3 text-gray-600">{item.description || '-'}</td>
                      <td className="px-4 py-3 text-center">{item.quantity} {item.unit}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="py-6 border-b">
              <div className="flex justify-end">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(quotation.subtotal)}</span>
                  </div>
                  {quotation.discountTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Discount</span>
                      <span className="font-medium text-red-600">-{formatCurrency(quotation.discountTotal)}</span>
                    </div>
                  )}
                  {quotation.vatTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{businessSettings?.taxName || 'VAT'} ({quotation.taxRate}%)</span>
                      <span className="font-medium">{formatCurrency(quotation.vatTotal)}</span>
                    </div>
                  )}
                  {quotation.shippingCharges > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-medium">{formatCurrency(quotation.shippingCharges)}</span>
                    </div>
                  )}
                  {quotation.additionalCharges > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{quotation.additionalChargesDescription || 'Additional'}</span>
                      <span className="font-medium">{formatCurrency(quotation.additionalCharges)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Grand Total</span>
                    <span className="text-xl font-bold text-emerald-600">{formatCurrency(quotation.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms & Notes */}
            {(quotation.termsAndConditions || quotation.notes || quotation.customerNotes) && (
              <div className="py-6 border-b space-y-4">
                {quotation.termsAndConditions && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Terms & Conditions</h3>
                    <p className="text-sm text-gray-700">{quotation.termsAndConditions}</p>
                  </div>
                )}
                {quotation.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Notes</h3>
                    <p className="text-sm text-gray-700">{quotation.notes}</p>
                  </div>
                )}
                {quotation.customerNotes && (
                  <div className="no-print">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Customer Notes</h3>
                    <p className="text-sm text-gray-700">{quotation.customerNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Signature Area */}
            <div className="py-6 grid grid-cols-3 gap-8">
              <div>
                <p className="text-sm text-gray-500 mb-8">Prepared By</p>
                <div className="border-t border-gray-300 pt-2">
                  <p className="text-sm font-medium">Name: _______________</p>
                  <p className="text-sm text-gray-500">Signature</p>
                  <p className="text-sm text-gray-500">Date: _______________</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-8">Approved By</p>
                <div className="border-t border-gray-300 pt-2">
                  <p className="text-sm font-medium">Name: _______________</p>
                  <p className="text-sm text-gray-500">Signature</p>
                  <p className="text-sm text-gray-500">Date: _______________</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-8">Customer Acceptance</p>
                <div className="border-t border-gray-300 pt-2">
                  <p className="text-sm font-medium">Name: _______________</p>
                  <p className="text-sm text-gray-500">Signature</p>
                  <p className="text-sm text-gray-500">Date: _______________</p>
                </div>
              </div>
            </div>

            <div className="no-print text-center text-xs text-gray-400 pt-4">
              Generated on {formatDate(quotation.createdAt)} • Valid for {quotation.currency}
            </div>
          </div>
        </Card>

        <Modal
          isOpen={showConvertModal}
          onClose={() => setShowConvertModal(false)}
          size="lg"
          title="Convert Quotation to Invoice"
        >
          <div className="space-y-4">
            {conversionError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {conversionError}
              </div>
            )}
            {conversionWarning && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {conversionWarning}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Invoice Number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Auto-generated"
              />
              <Input
                label="Invoice Date"
                type="date"
                value={invoiceDate}
                onChange={(e) => handleInvoiceDateChange(e.target.value)}
              />
              <Input
                label="Payment Terms (Days)"
                type="number"
                min="0"
                value={paymentTerms}
                onChange={(e) => handlePaymentTermsChange(Number(e.target.value))}
              />
              <Input
                label="Due Date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <Select
                label="Invoice Status"
                value={invoiceStatus}
                onChange={(e) => setInvoiceStatus(e.target.value as 'draft' | 'sent')}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'sent', label: 'Sent' }
                ]}
              />
            </div>

            <Textarea
              label="Invoice Notes"
              value={conversionNotes}
              onChange={(e) => setConversionNotes(e.target.value)}
              placeholder="Optional invoice notes"
            />
            <Textarea
              label="Invoice Terms"
              value={conversionTerms}
              onChange={(e) => setConversionTerms(e.target.value)}
              placeholder="Optional invoice terms"
            />

            {new Date(quotation.validUntil).getTime() < Date.now() && (
              <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <input
                  type="checkbox"
                  checked={allowExpired}
                  onChange={(e) => setAllowExpired(e.target.checked)}
                  className="mt-1"
                />
                <span>This quotation is expired. Enable this option to convert it anyway.</span>
              </label>
            )}

            <div className="rounded-lg bg-gray-50 p-4 text-sm">
              <h3 className="mb-3 font-semibold text-gray-900">Conversion Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-gray-500">Customer</p>
                  <p className="font-medium text-gray-900">{quotation.customerName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Items</p>
                  <p className="font-medium text-gray-900">{quotation.items.length}</p>
                </div>
                <div>
                  <p className="text-gray-500">Subtotal</p>
                  <p className="font-medium text-gray-900">{formatCurrency(quotation.subtotal)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Grand Total</p>
                  <p className="font-bold text-emerald-700">{formatCurrency(quotation.grandTotal)}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowConvertModal(false)} disabled={conversionLoading}>
                Cancel
              </Button>
              <Button type="button" onClick={handleConvertToInvoice} isLoading={conversionLoading}>
                Convert to Invoice
              </Button>
            </div>
          </div>
        </Modal>
      </div>
      </div>
    </>
  );
}
