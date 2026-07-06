'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, X, FileText, Printer } from 'lucide-react';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';

interface Shift {
  _id: string;
  shiftId: string;
  cashierName: string;
  registerNumber: string;
  branch: { name: string };
  openingFloat: number;
  status: string;
  startTime: string;
  endTime?: string;
  variance: number;
  openingFloatCash?: number;
  openingFloatMpesa?: number;
  cashReceived?: number;
  mpesaReceived?: number;
  cardSales?: number;
  cashDrops?: number;
  expenses?: number;
  expectedCash?: number;
  expectedMpesa?: number;
  actualCash?: number;
  actualMpesa?: number;
  mpesaVariance?: number;
  totalSales?: number;
  totalTransactions?: number;
  notes?: string;
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [registers, setRegisters] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [reprinting, setReprinting] = useState(false);

  const fetchShifts = async () => {
    try {
      const res = await fetch('/api/shifts');
      const json = await res.json();
      if (json.success) setShifts(json.shifts);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchRegisters = async () => {
    try {
      const res = await fetch('/api/registers?isOpen=false');
      const json = await res.json();
      if (json.success) setRegisters(json.registers);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchShifts(); }, []);
  useEffect(() => { if (showOpenModal) fetchRegisters(); }, [showOpenModal]);

  const handleOpenShift = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registerId: formData.get('registerId'), openingFloat: parseFloat(formData.get('openingFloat') as string) }),
      });
      if (res.ok) { setShowOpenModal(false); form.reset(); fetchShifts(); }
    } catch (err) { console.error(err); } finally { setSubmitting(false); }
  };

  const handleViewSummary = async (shift: Shift) => {
    // Fetch fresh shift data with all sales/transaction info
    try {
      const res = await fetch(`/api/shifts/${shift._id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.shift) {
          setSelectedShift(json.shift);
        } else {
          setSelectedShift(shift);
        }
      } else {
        setSelectedShift(shift);
      }
    } catch (err) {
      console.error('Failed to fetch shift details:', err);
      setSelectedShift(shift);
    }
    setShowSummaryModal(true);
  };

  const handleReprintSummary = async () => {
    if (!selectedShift) return;
    setReprinting(true);
    try {
      const shiftSummary = {
        shiftId: selectedShift.shiftId,
        date: selectedShift.endTime || selectedShift.startTime,
        startTime: selectedShift.startTime,
        endTime: selectedShift.endTime,
        cashierName: selectedShift.cashierName,
        registerNumber: selectedShift.registerNumber,
        openingFloat: selectedShift.openingFloat || 0,
        openingFloatCash: selectedShift.openingFloatCash || 0,
        openingFloatMpesa: selectedShift.openingFloatMpesa || 0,
        cashReceived: selectedShift.cashReceived || 0,
        mpesaReceived: selectedShift.mpesaReceived || 0,
        cardSales: selectedShift.cardSales || 0,
        cashDrops: selectedShift.cashDrops || 0,
        expenses: selectedShift.expenses || 0,
        expectedCash: selectedShift.expectedCash || 0,
        expectedMpesa: selectedShift.expectedMpesa || 0,
        actualCash: selectedShift.actualCash || 0,
        actualMpesa: selectedShift.actualMpesa || 0,
        variance: selectedShift.variance || 0,
        mpesaVariance: selectedShift.mpesaVariance || 0,
        totalSales: selectedShift.totalSales || 0,
        totalTransactions: selectedShift.totalTransactions || 0,
        notes: selectedShift.notes || ''
      };
      
      const printRes = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'shiftSummary',
          document: shiftSummary,
          format: 'pdf',
          paperSize: 'A4',
          preview: true
        })
      });
      
      if (printRes.ok) {
        const printData = await printRes.json();
        if (printData.preview?.data) {
          const pdfUrl = 'data:application/pdf;base64,' + printData.preview.data;
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <html>
                <head>
                  <title>Shift Summary - ${selectedShift.shiftId}</title>
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
            link.download = `shift-summary-${selectedShift.shiftId}.pdf`;
            link.click();
          }
        }
      }
    } catch (err) {
      console.error('Shift summary reprint failed:', err);
    } finally {
      setReprinting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'open') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Open</span>;
    if (status === 'closed') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Closed</span>;
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Suspended</span>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shifts</h1>
          <p className="text-gray-600 mt-1">Manage cashier shifts and registers</p>
        </div>
        <button onClick={() => setShowOpenModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Open Shift
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cashier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Register</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opening Float</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : shifts.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">No shifts found</td></tr>
              ) : shifts.map((shift) => (
                <tr key={shift._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{shift.shiftId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shift.cashierName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shift.registerNumber || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(shift.openingFloat)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDateTime(shift.startTime)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {shift.variance === 0 ? <span className="text-gray-500">-</span> : <span className={shift.variance < 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(Math.abs(shift.variance))}</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(shift.status)}</td>
<td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                     {shift.status === 'open' ? (
                       <Link href={`/reconciliation/shifts/${shift._id}/close`} className="text-emerald-600 hover:text-emerald-900 font-medium">Close Shift</Link>
                     ) : (
                       <button 
                         onClick={() => handleViewSummary(shift)} 
                         className="flex items-center gap-1 text-blue-600 hover:text-blue-900 font-medium text-sm"
                         title="View Shift Summary"
                       >
                         <FileText className="w-4 h-4" /> View Summary
                       </button>
                     )}
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showOpenModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Open New Shift</h3>
              <button onClick={() => setShowOpenModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Register</label>
                <select name="registerId" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                  {registers.length === 0 ? (
                    <option value="" disabled>No registers available</option>
                  ) : (
                    <>
                      <option value="">Select register...</option>
                      {registers.map((r) => (
                        <option key={r._id} value={r._id}>{r.registerNumber} - {r.name}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening Float (KES)</label>
                <input type="number" name="openingFloat" required min="0" step="0.01" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="10000" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium">
                  {submitting ? 'Opening...' : 'Open Shift'}
                </button>
                <button type="button" onClick={() => setShowOpenModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Modal 
        isOpen={showSummaryModal} 
        onClose={() => setShowSummaryModal(false)}
        title={`Shift Summary - ${selectedShift?.shiftId || ''}`}
        size="lg"
        closeOnOverlayClick={true}
      >
        {selectedShift && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Cashier</p>
                <p className="text-sm font-medium text-gray-900">{selectedShift.cashierName}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Register</p>
                <p className="text-sm font-medium text-gray-900">{selectedShift.registerNumber || 'N/A'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Start Time</p>
                <p className="text-sm font-medium text-gray-900">{formatDateTime(selectedShift.startTime)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">End Time</p>
                <p className="text-sm font-medium text-gray-900">{selectedShift.endTime ? formatDateTime(selectedShift.endTime) : 'N/A'}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">Opening Balance</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-600">Cash Float:</span>
                <span className="text-right font-medium">{formatCurrency(selectedShift.openingFloatCash || 0)}</span>
                <span className="text-gray-600">M-Pesa Balance:</span>
                <span className="text-right font-medium">{formatCurrency(selectedShift.openingFloatMpesa || 0)}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">Transaction Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-600">Cash Received:</span>
                <span className="text-right font-medium">{formatCurrency(selectedShift.cashReceived || 0)}</span>
                <span className="text-gray-600">M-Pesa Received:</span>
                <span className="text-right font-medium">{formatCurrency(selectedShift.mpesaReceived || 0)}</span>
                <span className="text-gray-600">Card Sales:</span>
                <span className="text-right font-medium">{formatCurrency(selectedShift.cardSales || 0)}</span>
                <span className="text-gray-600">Cash Drops:</span>
                <span className="text-right font-medium">{formatCurrency(selectedShift.cashDrops || 0)}</span>
                <span className="text-gray-600">Expenses:</span>
                <span className="text-right font-medium">{formatCurrency(selectedShift.expenses || 0)}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">Closing Reconciliation</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-600">Expected Cash:</span>
                <span className="text-right font-medium">{formatCurrency(selectedShift.expectedCash || 0)}</span>
                <span className="text-gray-600">Actual Cash:</span>
                <span className="text-right font-medium">{formatCurrency(selectedShift.actualCash || 0)}</span>
                <span className="text-gray-600">Cash Variance:</span>
                <span className={`text-right font-medium ${(selectedShift.variance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(selectedShift.variance || 0) >= 0 ? '' : '-'}{formatCurrency(Math.abs(selectedShift.variance || 0))}
                </span>
                <span className="text-gray-600">Expected M-Pesa:</span>
                <span className="text-right font-medium">{formatCurrency(selectedShift.expectedMpesa || 0)}</span>
                <span className="text-gray-600">Actual M-Pesa:</span>
                <span className="text-right font-medium">{formatCurrency(selectedShift.actualMpesa || 0)}</span>
                <span className="text-gray-600">M-Pesa Variance:</span>
                <span className={`text-right font-medium ${(selectedShift.mpesaVariance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(selectedShift.mpesaVariance || 0) >= 0 ? '' : '-'}{formatCurrency(Math.abs(selectedShift.mpesaVariance || 0))}
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600">Total Sales</p>
                  <p className="text-lg font-bold text-blue-700">{formatCurrency(selectedShift.totalSales || 0)}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600">Total Transactions</p>
                  <p className="text-lg font-bold text-purple-700">{selectedShift.totalTransactions || 0}</p>
                </div>
              </div>
            </div>

            {selectedShift.notes && (
              <div className="border-t pt-4">
                <p className="text-xs text-gray-500">Notes</p>
                <p className="text-sm text-gray-900 mt-1">{selectedShift.notes}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleReprintSummary}
                disabled={reprinting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                {reprinting ? 'Generating...' : 'Print Summary'}
              </button>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}