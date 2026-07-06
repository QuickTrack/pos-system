'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

interface Shift {
  _id: string;
  shiftId: string;
  cashierName: string;
  registerNumber: string;
  openingFloat: number;
  openingFloatCash: number;
  openingFloatMpesa: number;
  startTime: string;
  expectedCash: number;
  expectedMpesa: number;
  cashReceived: number;
  mpesaReceived: number;
  actualCash: number;
  variance: number;
}

export default function CloseShiftPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [shift, setShift] = useState<Shift | null>(null);
  const [actualCash, setActualCash] = useState('');
  const [actualMpesa, setActualMpesa] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/shifts/${resolvedParams.id}/close`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Failed');
      })
      .then((data) => {
        if (data.expectedCash !== undefined) {
          setShift({
            _id: resolvedParams.id,
            shiftId: data.shiftId,
            cashierName: data.cashierName || '',
            registerNumber: data.registerNumber || '',
            openingFloat: data.openingFloat || 0,
            openingFloatCash: data.openingFloatCash || 0,
            openingFloatMpesa: data.openingFloatMpesa || 0,
            startTime: data.startTime || '',
            expectedCash: data.expectedCash,
            expectedMpesa: data.expectedMpesa || 0,
            cashReceived: data.cashReceived || 0,
            mpesaReceived: data.mpesaReceived || 0,
            actualCash: data.actualCash,
            variance: data.variance,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  const { logout, user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/shifts/${resolvedParams.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualCash: parseFloat(actualCash), actualMpesa: parseFloat(actualMpesa), notes }),
      });
      if (res.ok) {
        const data = await res.json();
        
        // Auto-print shift summary report
        if (data.shiftSummary) {
          try {
            const printRes = await fetch('/api/print', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                documentType: 'shiftSummary',
                document: data.shiftSummary,
                format: 'pdf',
                paperSize: 'A4',
                preview: true
              })
            });
            
if (printRes.ok) {
               const printData = await printRes.json();
               if (printData.preview?.data) {
                 const pdfUrl = 'data:application/pdf;base64,' + printData.preview.data;
                 // Open print preview in new window
                 const printWindow = window.open('', '_blank');
                 if (printWindow) {
                   printWindow.document.write(`
                     <html>
                       <head>
                         <title>Shift Summary - ${data.shiftSummary.shiftId}</title>
                         <style>
                           body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                           .page { width: 210mm; min-height: 297mm; padding: 15mm; margin: 0 auto; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                           @media print { body { padding: 0; } .page { box-shadow: none; width: auto; min-height: auto; } }
                           iframe { width: 100%; height: 100vh; border: none; }
                         </style>
                       </head>
                       <body>
                         <iframe id="pdfFrame" src="${pdfUrl}" type="application/pdf"></iframe>
                         <script>
                           window.onload = function() {
                             var iframe = document.getElementById('pdfFrame');
                             if (iframe) {
                               iframe.onload = function() { window.print(); };
                               setTimeout(function() { window.print(); }, 1000);
                             }
                           };
                         </script>
                       </body>
                     </html>
                   `);
                   printWindow.document.close();
                 } else {
                   const link = document.createElement('a');
                   link.href = pdfUrl;
                   link.download = `shift-summary-${data.shiftSummary.shiftId}.pdf`;
                   link.click();
                 }
               }
             }
          } catch (e) {
            console.error('Shift summary print failed:', e);
          }
        }
        
        // Auto-logout for cashiers after shift end - restore original session and redirect to dashboard
        if (data.autoLogout && user?.role === 'cashier') {
          setTimeout(async () => {
            const preserveToken = sessionStorage.getItem('pos-preserve-token');
            if (preserveToken) {
              try {
                await fetch('/api/auth/restore-session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ preserveToken }),
                });
              } catch {
                // Ignore restore errors
              }
              sessionStorage.removeItem('pos-preserve-token');
            }
            sessionStorage.removeItem('pos-auth-success');
            window.location.href = '/dashboard';
          }, 2000);
        }
        router.push('/reconciliation/shifts');
      }
    } catch (err) { console.error(err); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-[calc(100vh-65px)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-50 rounded-lg"><Calculator className="w-6 h-6 text-emerald-600" /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Close Shift</h1>
            <p className="text-sm text-gray-600">Count cash and close register</p>
          </div>
        </div>

        {shift && (
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Shift ID</p>
                <p className="text-sm font-medium text-gray-900">{shift.shiftId}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Cashier</p>
                <p className="text-sm font-medium text-gray-900">{shift.cashierName}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Register</p>
                <p className="text-sm font-medium text-gray-900">{shift.registerNumber}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Opening Float</p>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(shift.openingFloat)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Cash Opening Float</p>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(shift.openingFloatCash)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">M-Pesa Opening Balance</p>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(shift.openingFloatMpesa)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-600 mb-1">Expected Cash</p>
                <p className="text-xl font-bold text-blue-700">{formatCurrency(shift.expectedCash)}</p>
                <p className="text-xs text-blue-600 mt-1">Cash Float + Cash Sales - Drops - Expenses</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                <p className="text-xs text-purple-600 mb-1">Expected M-Pesa Balance</p>
                <p className="text-xl font-bold text-purple-700">{formatCurrency(shift.expectedMpesa)}</p>
                <p className="text-xs text-purple-600 mt-1">M-Pesa Opening + M-Pesa Sales</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actual Cash Count (KES)</label>
              <input
                type="number"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Enter counted cash amount"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actual M-Pesa Balance (KES)</label>
              <input
                type="number"
                value={actualMpesa}
                onChange={(e) => setActualMpesa(e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Enter M-Pesa balance"
              />
            </div>
          </div>
          {shift && actualMpesa && !isNaN(parseFloat(actualMpesa)) && (
            <div className={`p-4 rounded-lg border ${parseFloat(actualMpesa) >= (shift?.expectedMpesa || 0) ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <p className="text-sm font-medium">
                M-Pesa: {parseFloat(actualMpesa) >= (shift?.expectedMpesa || 0) ? 'Over' : 'Short'} by{' '}
                <span className="font-bold">{formatCurrency(Math.abs((parseFloat(actualMpesa) - (shift?.expectedMpesa || 0))))}</span>
              </p>
            </div>
          )}
          {shift && actualCash && !isNaN(parseFloat(actualCash)) && (
            <div className={`p-4 rounded-lg border ${parseFloat(actualCash) >= (shift?.expectedCash || 0) ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <p className="text-sm font-medium">
                {parseFloat(actualCash) >= (shift?.expectedCash || 0) ? 'Over' : 'Short'} by{' '}
                <span className="font-bold">{formatCurrency(Math.abs((parseFloat(actualCash) - (shift?.expectedCash || 0))))}</span>
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Any notes about this shift..."
            />
          </div>
          <button type="submit" disabled={submitting} className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium">
            {submitting ? 'Closing...' : 'Close Shift'}
          </button>
        </form>
      </div>
    </div>
  );
}
