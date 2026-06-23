'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DollarSign, ShoppingCart, CreditCard, Wallet, AlertTriangle, TrendingUp, Users, ClipboardList } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface DashboardData {
  sales: {
    grossSales: number;
    netSales: number;
    totalTransactions: number;
    averageSaleValue: number;
    discounts: number;
    refunds: number;
  };
  payments: {
    cash: number;
    mpesa: number;
    card: number;
    bank: number;
    credit: number;
    mixed: number;
  };
  cash: {
    openingFloat: number;
    cashSales: number;
    cashDrops: number;
    expenses: number;
    expectedCash: number;
    actualCash: number;
    variance: number;
  };
  shifts: {
    open: number;
    closed: number;
    openShifts: any[];
  };
  variances: {
    total: number;
    shortages: number;
    overages: number;
  };
  branches: any[];
}

const cardClass = 'bg-white rounded-xl border border-gray-200 shadow-sm p-6';
const labelClass = 'text-sm font-medium text-gray-600';

export default function ReconciliationDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/reconciliation/dashboard');
      if (!res.ok) throw new Error('Failed to load dashboard');
      const json = await res.json();
      setData(json.dashboard);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-[calc(100vh-65px)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return null;

  const hasVariance = Math.abs(data.cash.variance) > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">End-of-Day Reconciliation</h1>
          <p className="text-gray-600 mt-1">Track shifts, cash movements, and reconciliations</p>
        </div>
        <div className="flex gap-3">
          <Link href="/reconciliation/z-reads" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">Z-Read Report</Link>
          <Link href="/reconciliation/x-reads" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">X-Read Report</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cardClass}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><ShoppingCart className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className={labelClass}>Gross Sales</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(data.sales.grossSales)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">{data.sales.totalTransactions} transactions</p>
        </div>
        <div className={cardClass}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className={labelClass}>Net Sales</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(data.sales.netSales)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Avg: {formatCurrency(data.sales.averageSaleValue)}</p>
        </div>
        <div className={cardClass}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><CreditCard className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className={labelClass}>Cash Sales</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(data.payments.cash)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">M-Pesa: {formatCurrency(data.payments.mpesa)} | Card: {formatCurrency(data.payments.card)}</p>
        </div>
        <div className={cardClass}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${hasVariance ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <Wallet className={`w-5 h-5 ${hasVariance ? 'text-red-600' : 'text-emerald-600'}`} />
            </div>
            <div>
              <p className={labelClass}>Cash Variance</p>
              <p className={`text-lg font-semibold ${hasVariance ? 'text-red-600' : 'text-emerald-600'}`}>{formatCurrency(Math.abs(data.cash.variance))}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">{hasVariance ? 'Review required' : 'Balanced'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={cardClass}>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Cash Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Opening Float</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(data.cash.openingFloat)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Cash Received</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(data.cash.cashSales)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Cash Drops</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(data.cash.cashDrops)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Expenses</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(data.cash.expenses)}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg">
                <p className="text-xs text-emerald-600">Expected Cash</p>
                <p className="text-sm font-semibold text-emerald-700">{formatCurrency(data.cash.expectedCash)}</p>
              </div>
              <div className={`p-4 rounded-lg ${hasVariance ? 'bg-red-50' : 'bg-emerald-50'}`}>
                <p className={`text-xs ${hasVariance ? 'text-red-600' : 'text-emerald-600'}`}>{hasVariance ? 'Actual / Variance' : 'Actual Cash'}</p>
                <p className={`text-sm font-semibold ${hasVariance ? 'text-red-700' : 'text-emerald-700'}`}>
                  {formatCurrency(data.cash.actualCash)}
                </p>
                {hasVariance && <p className="text-xs text-red-500 mt-1">{formatCurrency(Math.abs(data.cash.variance))} {data.cash.variance < 0 ? 'short' : 'over'}</p>}
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Active Shifts</h3>
            {data.shifts.open === 0 ? (
              <p className="text-sm text-gray-500">No open shifts</p>
            ) : (
              <div className="space-y-3">
                {data.shifts.openShifts.map((s: any) => (
                  <div key={s._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.cashierName}</p>
                      <p className="text-xs text-gray-500">Register {s.registerNumber || 'N/A'}</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Open</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className={cardClass}>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Payment Breakdown</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Cash</span>
                <span className="text-sm font-medium text-gray-900">{formatCurrency(data.payments.cash)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">M-Pesa</span>
                <span className="text-sm font-medium text-gray-900">{formatCurrency(data.payments.mpesa)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Card</span>
                <span className="text-sm font-medium text-gray-900">{formatCurrency(data.payments.card)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Bank Transfer</span>
                <span className="text-sm font-medium text-gray-900">{formatCurrency(data.payments.bank)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Credit</span>
                <span className="text-sm font-medium text-gray-900">{formatCurrency(data.payments.credit)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Mixed</span>
                <span className="text-sm font-medium text-gray-900">{formatCurrency(data.payments.mixed)}</span>
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Variances</h3>
            <div className="flex items-center gap-3">
              <AlertTriangle className={`w-5 h-5 ${data.variances.total > 0 ? 'text-red-600' : 'text-green-600'}`} />
              <div>
                <p className="text-sm font-medium text-gray-900">{data.variances.total} variances</p>
                <p className="text-xs text-gray-500">{formatCurrency(data.variances.shortages)} shortage | {formatCurrency(data.variances.overages)} overage</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
