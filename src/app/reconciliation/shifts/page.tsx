'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { formatDateTime, formatCurrency } from '@/lib/utils';

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
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [registers, setRegisters] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
                      <span className="text-gray-400">-</span>
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
    </div>
  );
}
