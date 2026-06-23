'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { formatDateTime, formatCurrency } from '@/lib/utils';

interface ZRead {
  _id: string;
  readId: string;
  cashierName: string;
  registerNumber: string;
  date: string;
  salesBreakdown: {
    grossSales: number;
    discounts: number;
    returns: number;
    netSales: number;
    totalTransactions: number;
  };
  cashSummary: {
    openingFloat: number;
    cashReceived: number;
    cashDrops: number;
    expenses: number;
    expectedCash: number;
    actualCash: number;
    variance: number;
  };
}

export default function ZReadsPage() {
  const [reads, setReads] = useState<ZRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [closedShifts, setClosedShifts] = useState<any[]>([]);

  const fetchReads = async () => {
    try {
      const res = await fetch('/api/z-reads');
      const json = await res.json();
      if (json.success) setReads(json.reads);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchClosedShifts = async () => {
    try {
      const res = await fetch('/api/shifts');
      const json = await res.json();
      if (json.success) {
        const shifts = json.shifts.filter((s: any) => s.status === 'closed');
        setClosedShifts(shifts);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchReads(); }, []);
  useEffect(() => { fetchClosedShifts(); }, []);

  const hasVariance = (summary: any) => Math.abs(summary?.variance || 0) > 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Z-Read Reports</h1>
        <p className="text-gray-600 mt-1">Generate and view daily Z-Read reports</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cashier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Register</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Sales</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Cash</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : reads.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">No Z-Reads found. Close a shift and generate a report.</td></tr>
              ) : reads.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.readId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDateTime(r.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.cashierName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.registerNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(r.salesBreakdown?.netSales || 0)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(r.cashSummary?.expectedCash || 0)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {hasVariance(r.cashSummary) ? <span className="text-red-600 font-medium">{formatCurrency(Math.abs(r.cashSummary.variance))}</span> : <span className="text-gray-500">-</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {hasVariance(r.cashSummary) ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Variance</span> : <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Balanced</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {closedShifts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Generate New Z-Read</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {closedShifts.map((s: any) => (
              <div key={s._id} className="p-4 border border-gray-200 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{s.shiftId}</p>
                <p className="text-xs text-gray-500">{s.cashierName} - {s.registerNumber}</p>
                <button
                  onClick={async () => {
                    await fetch('/api/z-reads', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ shiftId: s._id }),
                    });
                    window.location.reload();
                  }}
                  className="mt-3 w-full px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700"
                >
                  Generate Z-Read
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
