'use client';

import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface XReadData {
  shiftId: string;
  cashierName: string;
  registerNumber: string;
  snapshotTime: string;
  salesBreakdown: {
    grossSales: number;
    discounts: number;
    returns: number;
    netSales: number;
    totalTransactions: number;
    refunds: number;
    voids: number;
  };
  paymentBreakdown: {
    cash: number;
    mpesa: number;
    card: number;
    bank: number;
    credit: number;
    mixed: number;
  };
  taxSummary: {
    vatCollected: number;
    taxableSales: number;
    zeroRatedSales: number;
    taxRate: number;
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

export default function XReadsPage() {
  const [data, setData] = useState<XReadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openShifts, setOpenShifts] = useState<any[]>([]);
  const [selectedShift, setSelectedShift] = useState('');

  useEffect(() => {
    fetch('/api/shifts')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setOpenShifts(json.shifts.filter((s: any) => s.status === 'open'));
      })
      .finally(() => setLoading(false));
  }, []);

  const generateXRead = async () => {
    if (!selectedShift) return;
    const res = await fetch(`/api/x-reads?shiftId=${selectedShift}`);
    const json = await res.json();
    if (json.success) setData(json.xRead);
  };

  const hasVariance = data ? Math.abs(data.cashSummary.variance) > 0 : false;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">X-Read Reports</h1>
        <p className="text-gray-600 mt-1">Interim reports without resetting totals</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Open Shift</label>
            <select value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
              <option value="">Select a shift...</option>
              {openShifts.map((s: any) => (
                <option key={s._id} value={s._id}>{s.shiftId} - {s.cashierName}</option>
              ))}
            </select>
          </div>
          <button onClick={generateXRead} disabled={!selectedShift} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
            Generate X-Read
          </button>
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">X-Read Report</h2>
                <p className="text-sm text-gray-500">Shift: {data.shiftId} | Generated: {formatDateTime(data.snapshotTime)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Cashier</p>
                <p className="text-sm font-medium text-gray-900">{data.cashierName}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Register</p>
                <p className="text-sm font-medium text-gray-900">{data.registerNumber}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Transactions</p>
                <p className="text-sm font-medium text-gray-900">{data.salesBreakdown.totalTransactions}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Sales Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Gross Sales</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(data.salesBreakdown.grossSales)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Discounts</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(data.salesBreakdown.discounts)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Returns</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(data.salesBreakdown.returns)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                    <span className="text-sm text-emerald-700">Net Sales</span>
                    <span className="text-sm font-semibold text-emerald-700">{formatCurrency(data.salesBreakdown.netSales)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Cash Summary</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Opening Float</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(data.cashSummary.openingFloat)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Cash Received</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(data.cashSummary.cashReceived)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Cash Drops</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(data.cashSummary.cashDrops)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Expenses</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(data.cashSummary.expenses)}</span>
                  </div>
                  <div className={`flex items-center justify-between p-3 rounded-lg ${hasVariance ? 'bg-red-50' : 'bg-emerald-50'}`}>
                    <span className={`text-sm ${hasVariance ? 'text-red-700' : 'text-emerald-700'}`}>Variance</span>
                    <span className={`text-sm font-semibold ${hasVariance ? 'text-red-700' : 'text-emerald-700'}`}>{formatCurrency(Math.abs(data.cashSummary.variance))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
