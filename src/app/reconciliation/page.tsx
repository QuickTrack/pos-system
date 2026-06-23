import { Suspense } from 'react';
import ReconciliationDashboardClient from './dashboard-client';

export default function ReconciliationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-65px)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>}>
      <ReconciliationDashboardClient />
    </Suspense>
  );
}
