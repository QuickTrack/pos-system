'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Award, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CashierPerformance {
  userId: string;
  userName: string;
  totalSales: number;
  totalTransactions: number;
  voids: number;
  refunds: number;
  discounts: number;
  variances: number;
  varianceErrors: number;
  completedReconciliations: number;
  averageTransactionValue: number;
  reconciliationSuccessRate: number;
}

export default function CashierPerformancePage() {
  const [performance, setPerformance] = useState<CashierPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reconciliation/cashier-performance')
      .then((res) => res.json())
      .then((json) => { if (json.success) setPerformance(json.cashierPerformance.topPerformers); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-[calc(100vh-65px)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cashier Performance</h1>
        <p className="text-gray-600 mt-1">Track individual cashier KPIs and accuracy</p>
      </div>

      {performance.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-500">No performance data available</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {performance.map((p, idx) => (
            <div key={p.userId} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-400' : 'bg-emerald-500'}`}>
                  {p.userName.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{p.userName}</h3>
                    {idx === 0 && <Award className="w-5 h-5 text-yellow-500" />}
                  </div>
                  <p className="text-sm text-gray-500">Rank #{idx + 1}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Total Sales</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.totalSales)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Transactions</p>
                  <p className="text-sm font-semibold text-gray-900">{p.totalTransactions}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Avg Transaction</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.averageTransactionValue)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Reconciliation</p>
                  <p className="text-sm font-semibold text-emerald-600">{p.reconciliationSuccessRate}%</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Voids/Refunds</p>
                  <p className="text-sm font-semibold text-gray-900">{p.voids}/{p.refunds}</p>
                </div>
                <div className={`p-3 rounded-lg ${p.variances > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className={`text-xs ${p.variances > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Variances</p>
                  <p className={`text-sm font-semibold ${p.variances > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatCurrency(p.variances)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
