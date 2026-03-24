'use client';

import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { generateKRAQRData, calculateTaxableAmount, calculateVAT } from '@/lib/kra-qr-generator';

interface PrintPreviewProps {
  documentType: string;
  document: any;
  printer?: any;
  onPrint?: () => void;
  onClose?: () => void;
}

export default function PrintPreview({
  documentType,
  document,
  onPrint,
  onClose
}: PrintPreviewProps) {
  const [copies, setCopies] = useState(1);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const documentRef = useRef<HTMLDivElement>(null);

  // Generate KRA QR code when document data changes
  useEffect(() => {
    const generateQR = async () => {
      if (!document) return;
      
      const doc = document || {};
      
      // Only generate QR if we have KRA PIN and invoice number
      if (doc.kraPin && doc.invoiceNumber) {
        try {
          // Use stored tax values from the document
          // If includeInPrice is true, the stored tax is already correctly calculated
          const total = doc.total || 0;
          const vatRate = doc.taxRate || 16;
          
          // For KRA QR, use stored tax values or calculate based on includeInPrice
          let vatAmount = doc.tax || 0;
          let taxableAmount = doc.subtotal || 0;
          
          // If prices were tax-exclusive, recalculate from total
          if (!doc.includeInPrice && total > 0) {
            vatAmount = calculateVAT(total, vatRate);
            taxableAmount = calculateTaxableAmount(total, vatRate);
          }
          
          const kraData = {
            sellerPin: doc.kraPin || '',
            invoiceNumber: doc.invoiceNumber || '',
            dateOfIssue: doc.date || new Date().toISOString(),
            taxableAmount: Math.round(taxableAmount * 100) / 100,
            vatAmount: Math.round(vatAmount * 100) / 100,
            totalAmount: Math.round(total * 100) / 100,
            invoiceType: documentType.toUpperCase()
          };
          
          const qrData = generateKRAQRData(kraData);
          
          // Generate QR code as data URL
          const url = await QRCode.toDataURL(qrData, {
            width: 60,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
          });
          
          setQrCodeUrl(url);
        } catch (error) {
          console.error('Failed to generate QR code:', error);
          setQrCodeUrl('');
        }
      } else {
        setQrCodeUrl('');
      }
    };
    
    generateQR();
  }, [document, documentType]);

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handlePrint = () => {
    if (documentRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const content = documentRef.current.innerHTML;
        const doc = document || {};
        const customerName = doc.customer?.name || doc.customerName || 'Customer';
        const invoiceNumber = doc.invoiceNumber || 'Invoice';
        const sanitizedName = customerName.replace(/[^a-zA-Z0-9]/g, '-');
        const fileName = `${sanitizedName}-${invoiceNumber}`;
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileName}</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                @page { margin: 10mm; size: A4; }
                @media print {
                  body { font-family: system-ui, -apple-system, sans-serif; }
                  .page-break { page-break-after: always; }
                  .no-break { page-break-inside: avoid; }
                  .print-footer { 
                    position: fixed; 
                    bottom: 0; 
                    left: 0; 
                    right: 0; 
                    height: 60px;
                    background: white;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 15mm;
                  }
                  .print-content { margin-bottom: 70px; }
                }
              </style>
            </head>
            <body>${content}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    }
  };

  const doc = document || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[95vh] flex flex-col ml-4 mr-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold capitalize">Print {documentType}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-6 bg-gray-600">
          <div className="flex justify-center">
            <div ref={documentRef} className="transform scale-75 origin-top md:scale-90 lg:scale-100 bg-white" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', paddingBottom: '80px' }}>
              {/* Header */}
              <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-emerald-600">
                <div className="flex items-start gap-4">
                  {doc.logo && (
                    <img src={doc.logo} alt="Logo" className="w-20 h-20 object-contain" style={{ maxHeight: '80px' }} />
                  )}
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-emerald-600">{doc.businessName || 'Business Name'}</h1>
                    <p className="text-sm text-gray-500 mt-1">{doc.businessTagline || 'Your Trusted Partner'}</p>
                    <div className="text-sm text-gray-500 mt-4 space-y-1">
                      {doc.businessAddress && <div>📍 {doc.businessAddress}</div>}
                      {doc.businessPhone && <div>📞 {doc.businessPhone}</div>}
                      {doc.businessEmail && <div>✉️ {doc.businessEmail}</div>}
                      {doc.vatNumber && <div>🏢 VAT: {doc.vatNumber}</div>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-gray-900">{documentType === 'receipt' ? 'RECEIPT' : documentType === 'purchase-order' ? 'PURCHASE ORDER' : documentType === 'delivery-note' ? 'DELIVERY NOTE' : 'INVOICE'}</h2>
                  <p className="text-lg text-gray-600 mt-1">#{doc.orderNumber || doc.invoiceNumber || '-'}</p>
                  <p className="text-sm text-gray-500 mt-2">Order Date: {formatDate(doc.orderDate || doc.date)}</p>
                  {doc.dueDate && <p className="text-sm text-amber-600 mt-1">Due: {formatDate(doc.dueDate)}</p>}
                  {documentType === 'delivery-note' && doc.deliveryDate && <p className="text-sm text-blue-600 mt-1">Delivery Date: {formatDate(doc.deliveryDate)}</p>}
                </div>
              </div>

              {/* Customer / Supplier */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{documentType === 'purchase-order' ? 'Supplier' : documentType === 'delivery-note' ? 'Delivery To' : 'Bill To'}</p>
                  <p className="font-semibold text-gray-900 text-lg">{doc.supplier?.name || doc.customer?.name || 'Name'}</p>
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    {(doc.supplier?.phone || doc.customer?.phone) && <div>📞 {doc.supplier?.phone || doc.customer?.phone}</div>}
                    {(doc.supplier?.email || doc.customer?.email) && <div>✉️ {doc.supplier?.email || doc.customer?.email}</div>}
                  </div>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg">
                  <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide mb-1">{documentType === 'purchase-order' ? 'Order Summary' : documentType === 'delivery-note' ? 'Delivery Details' : 'Invoice Summary'}</p>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div><p className="text-[11px] text-gray-500">Subtotal</p><p className="font-semibold text-gray-900 text-[11px]">{formatCurrency(doc.subtotal)}</p></div>
                    <div><p className="text-[11px] text-gray-500">VAT ({doc.taxRate || 16}%)</p><p className="font-semibold text-gray-900 text-[11px]">{formatCurrency(doc.tax)}</p></div>
                    <div className="col-span-2 pt-1 border-t border-emerald-200">
                      <p className="text-[11px] text-gray-500">Total Amount</p>
                      <p className="font-bold text-lg text-emerald-600">{formatCurrency(doc.total)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Address - Only for delivery notes */}
              {documentType === 'delivery-note' && doc.deliveryAddress && (
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Delivery Address</p>
                  <p className="text-sm text-gray-700">{doc.deliveryAddress}</p>
                </div>
              )}

              {/* Items */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">Item Details</h3>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-2 text-[11px] font-semibold text-gray-600 uppercase">ITEM</th>
                      <th className="text-center p-2 text-[11px] font-semibold text-gray-600 uppercase">UNIT</th>
                      <th className="text-center p-2 text-[11px] font-semibold text-gray-600 uppercase">QTY</th>
                      <th className="text-right p-2 text-[11px] font-semibold text-gray-600 uppercase">{documentType === 'purchase-order' ? 'COST' : 'RATE'}</th>
                      <th className="text-right p-2 text-[11px] font-semibold text-gray-600 uppercase">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.items?.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="p-2 text-[11px] text-gray-900">{item.name}</td>
                        <td className="p-2 text-[11px] text-gray-600 text-center">{item.unit || '-'}</td>
                        <td className="p-2 text-[11px] text-gray-600 text-center">{item.quantity}</td>
                        <td className="p-2 text-[11px] text-gray-600 text-right">{formatCurrency(item.price)}</td>
                        <td className="p-2 text-[11px] text-gray-900 text-right font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payment */}
              {doc.payment && documentType !== 'delivery-note' && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide mb-2">Payment Details</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div><p className="text-[11px] text-gray-500">Amount Paid</p><p className="font-semibold text-green-600 text-sm">{doc.payment.amount?.toLocaleString()}</p></div>
                    <div><p className="text-[11px] text-gray-500">Payment Method</p><p className="font-semibold text-gray-900 text-[11px] capitalize">{doc.payment.method || 'Cash'}</p></div>
                    {doc.payment.change > 0 && <div><p className="text-[11px] text-gray-500">Change</p><p className="font-semibold text-gray-900 text-sm">{doc.payment.change?.toLocaleString()}</p></div>}
                  </div>
                </div>
              )}

              {/* Invoice Totals */}
              <div className="mb-6 flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-[11px] text-gray-600 align-middle">Subtotal</span>
                    <span className="text-[11px] font-medium text-gray-900 align-middle">{doc.subtotal?.toLocaleString()}</span>
                  </div>
                  {doc.tax > 0 && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-[11px] text-gray-600 align-middle">Tax ({doc.taxRate || 16}%)</span>
                      <span className="text-[11px] font-medium text-gray-900 align-middle">{doc.tax?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 bg-gray-100 rounded px-3 mt-2">
                    <span className="text-sm font-semibold text-gray-900 align-middle">Total</span>
                    <span className="text-base font-bold text-emerald-600 align-middle">{doc.total?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Terms */}
              {doc.terms && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Terms & Payment Terms</p>
                  <p className="text-[11px] text-gray-700 whitespace-pre-wrap">{doc.terms}</p>
                </div>
              )}

              {/* Status */}
              {doc.status && doc.status !== 'draft' && (
                <div className="mb-4 text-center">
                  <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                    doc.status === 'paid' ? 'bg-green-100 text-green-800' :
                    doc.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    doc.status === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>{doc.status.toUpperCase()}</span>
                </div>
              )}

              {/* Notes */}
              {doc.notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-[11px] text-gray-700 italic">{doc.notes}</p>
                </div>
              )}

              {/* Bank */}
              {doc.bankName && doc.bankName !== 'N/A' && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Payment Information</p>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div><p className="text-gray-500">Bank Name</p><p className="font-medium text-gray-900">{doc.bankName}</p></div>
                    <div><p className="text-gray-500">Account Number</p><p className="font-medium text-gray-900">{doc.bankAccount}</p></div>
                    {doc.bankBranch && <div><p className="text-gray-500">Branch</p><p className="font-medium text-gray-900">{doc.bankBranch}</p></div>}
                  </div>
                </div>
              )}

              {/* Footer - Always at bottom */}
              <div className="print-footer absolute bottom-0 left-0 right-0 flex justify-between items-center py-4 px-15mm border-t border-gray-200 bg-white" style={{ paddingLeft: '15mm', paddingRight: '15mm' }}>
                <div className="text-left">
                  <p className="text-gray-600 font-medium">Thank you for your business!</p>
                  <p className="text-xs text-gray-400 mt-1">Powered by POS System</p>
                </div>
                {qrCodeUrl && (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[9px] text-gray-500">KRA Tax Compliance</p>
                      <p className="text-[9px] text-gray-400">Scan to verify</p>
                    </div>
                    <img 
                      src={qrCodeUrl} 
                      alt="KRA QR Code" 
                      className="w-16 h-16"
                      style={{ width: '60px', height: '60px' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm text-gray-600">Copies:</label>
            <select value={copies} onChange={(e) => setCopies(Number(e.target.value))} className="px-3 py-1.5 border border-gray-200 rounded text-sm">
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
            <button onClick={handlePrint} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
