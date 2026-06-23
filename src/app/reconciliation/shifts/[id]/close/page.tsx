'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Shift {
  _id: string;
  shiftId: string;
  cashierName: string;
  registerNumber: string;
  openingFloat: number;
  startTime: string;
  expectedCash: number;
  actualCash: number;
  variance: number;
}

export default function CloseShiftPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [shift, setShift] = useState<Shift | null>(null);
  const [actualCash, setActualCash] = useState('');
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
            startTime: data.startTime || '',
            expectedCash: data.expectedCash,
            actualCash: data.actualCash,
            variance: data.variance,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/shifts/${resolvedParams.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualCash: parseFloat(actualCash), notes }),
      });
      if (res.ok) router.push('/reconciliation/shifts');
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
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-600 mb-1">Expected Cash (Calculated)</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(shift.expectedCash)}</p>
              <p className="text-xs text-blue-600 mt-1">Opening + Sales - Drops - Expenses</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
