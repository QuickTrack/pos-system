'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { formatDateTime, formatCurrency } from '@/lib/utils';

interface CashDrop {
  _id: string;
  dropId: string;
  cashierName: string;
  branch: { name: string };
  registerNumber: string;
  amount: number;
  reason: string;
  authorizedByName: string;
  dropTime: string;
}

export default function CashDropsPage() {
  const [drops, setDrops] = useState<CashDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [openShifts, setOpenShifts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchDrops = async () => {
    try {
      const res = await fetch('/api/cash-drops');
      const json = await res.json();
      if (json.success) setDrops(json.drops);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchOpenShifts = async () => {
    try {
      const res = await fetch('/api/shifts');
      const json = await res.json();
      if (json.success) setOpenShifts(json.shifts.filter((s: any) => s.status === 'open'));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchDrops(); }, []);
  useEffect(() => { if (showModal) fetchOpenShifts(); }, [showModal]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      const res = await fetch('/api/cash-drops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: formData.get('shiftId'),
          amount: parseFloat(formData.get('amount') as string),
          reason: formData.get('reason'),
          authorizedById: 'placeholder',
          authorizedByName: 'Supervisor',
        }),
      });
      if (res.ok) { setShowModal(false); form.reset(); fetchDrops(); }
    } catch (err) { console.error(err); } finally { setSubmitting(false); }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = { safe_deposit: 'Safe Deposit', bank_deposit: 'Bank Deposit', security: 'Security Removal', float_transfer: 'Float Transfer', other: 'Other' };
    return labels[reason] || reason;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash Drops</h1>
          <p className="text-gray-600 mt-1">Track cash removals during shifts</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> New Cash Drop
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drop ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cashier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Authorized By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : drops.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">No cash drops found</td></tr>
              ) : drops.map((drop) => (
                <tr key={drop._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{drop.dropId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{drop.cashierName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(drop.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getReasonLabel(drop.reason)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{drop.authorizedByName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDateTime(drop.dropTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Record Cash Drop</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                <select name="shiftId" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                  <option value="">Select open shift...</option>
                  {openShifts.map((s: any) => (
                    <option key={s._id} value={s._id}>{s.shiftId} - {s.cashierName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES)</label>
                <input type="number" name="amount" required min="1" step="0.01" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="5000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select name="reason" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                  <option value="">Select reason...</option>
                  <option value="safe_deposit">Safe Deposit</option>
                  <option value="bank_deposit">Bank Deposit</option>
                  <option value="security">Security Removal</option>
                  <option value="float_transfer">Float Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium">
                  {submitting ? 'Saving...' : 'Record Drop'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
