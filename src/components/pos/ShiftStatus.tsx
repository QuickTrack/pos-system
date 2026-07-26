'use client';

import { useState, useEffect } from 'react';
import { Clock, Calculator, BarChart3, Monitor, User, Calendar, LogOut, RefreshCw, Printer } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useShiftStore } from '@/lib/store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/lib/store';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export function ShiftStatusIndicator() {
  const { user, logout } = useAuth();
  const { setShowPOSAuthModal } = useUIStore();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [computerName, setComputerName] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.hostname || 'localhost';
    }
    return 'Loading...';
  });

  const {
    activeShift, 
    fetchActiveShift, 
    openShift, 
    closeShift, 
    loading, 
    showOpenModal, 
    setShowOpenModal,
    registers,
    selectedRegister,
    openingFloatCash,
    openingFloatMpesa,
    fetchRegisters,
    setSelectedRegister,
    setOpeningFloatCash,
    setOpeningFloatMpesa,
  } = useShiftStore();
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingCash, setClosingCash] = useState('');
  const [closingMpesa, setClosingMpesa] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeShiftConflict, setActiveShiftConflict] = useState<any>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

  useEffect(() => {
    fetchActiveShift();
  }, [fetchActiveShift]);

  useEffect(() => {
    const refreshShift = () => {
      const refresh = localStorage.getItem('shift-refresh');
      if (refresh) {
        const refreshTime = parseInt(refresh);
        const now = Date.now();
        if (now - refreshTime < 5000) {
          fetchActiveShift();
        }
        localStorage.removeItem('shift-refresh');
      }
    };
    refreshShift();
    const interval = setInterval(refreshShift, 1000);
    return () => clearInterval(interval);
  }, [fetchActiveShift]);

  useEffect(() => {
    if (showCloseModal && activeShift) {
      fetchActiveShift();
    }
  }, [showCloseModal, activeShift, fetchActiveShift]);

const handleOpenShift = async () => {
     if (!selectedRegister) return;

     setSubmitting(true);
     const result = await openShift(selectedRegister, parseFloat(openingFloatCash) || 0, parseFloat(openingFloatMpesa) || 0);
     if (result === true) {
       setShowOpenModal(false);
       setSelectedRegister('');
       setOpeningFloatCash('');
       setOpeningFloatMpesa('');
     } else if (result && typeof result === 'object' && (result as any).conflict) {
       const conflict = result as any;
       setActiveShiftConflict(conflict.activeShift);
       setShowConflictModal(true);
     } else {
       setError('Failed to open shift. Please try again.');
     }
     setSubmitting(false);
   };

  const handleCloseShift = async () => {
    if (!activeShift || !closingCash || !closingMpesa) return;

    setSubmitting(true);
    const result = await closeShift(parseFloat(closingCash), parseFloat(closingMpesa), closingNotes);
    if (result.success) {
      setShowCloseModal(false);
      setClosingCash('');
      setClosingMpesa('');
      setClosingNotes('');
      
      // Auto-print shift summary report
      const shiftSummary = (result as any).shiftSummary;
      if (shiftSummary) {
        try {
          // Generate and download PDF for shift summary
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
                // Open print preview in new window
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Shift Summary - ${shiftSummary.shiftId}</title>
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
                              // Fallback: try printing after delay if PDF doesn't load
                              setTimeout(function() { window.print(); }, 1000);
                            }
                          };
                        </script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                } else {
                  // Fallback: download as file if popup blocked
                  const link = document.createElement('a');
                  link.href = pdfUrl;
                  link.download = `shift-summary-${shiftSummary.shiftId}.pdf`;
                  link.click();
                }
              }
            }
          } catch (e) {
            console.error('Shift summary print failed:', e);
          }
        }
      
      // Auto-logout for cashiers after shift end - restore original session and redirect to dashboard
      if (result.autoLogout && user?.role === 'cashier') {
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
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs">
        <Clock className="w-3 h-3 animate-spin" />
        <span>Checking shift...</span>
      </div>
    );
  }

  if (!activeShift) {
    return (
      <>
        <button
          onClick={() => {
            fetchRegisters();
            setOpeningFloatCash('');
            setOpeningFloatMpesa('');
            setSelectedRegister('');
            setShowOpenModal(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 transition-colors"
        >
          <Clock className="w-3 h-3" />
          <span>No Active Shift</span>
        </button>

        <Modal
          isOpen={showOpenModal}
          onClose={() => setShowOpenModal(false)}
          title="Open New Shift"
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Register</label>
              <select
                value={selectedRegister}
onChange={async (e) => {
                           setSelectedRegister(e.target.value);
                           // Auto-load previous shift cash balance when register is selected
                           if (e.target.value) {
                             try {
                               const res = await fetch(`/api/shifts?register=${e.target.value}&last=true`);
                               if (res.ok) {
                                 const data = await res.json();
                                 if (data?.shift) {
                                   // Use closingFloatCash/mpesa if available, otherwise fall back to closingFloat
                                   const cash = data.shift.closingFloatCash != null
                                     ? String(data.shift.closingFloatCash)
                                     : String(data.shift.closingFloat || 0);
                                   const mpesa = data.shift.closingFloatMpesa != null
                                     ? String(data.shift.closingFloatMpesa)
                                     : '0';
                                   setOpeningFloatCash(cash);
                                   setOpeningFloatMpesa(mpesa);
                                 } else {
                                   setOpeningFloatCash('0');
                                   setOpeningFloatMpesa('0');
                                 }
                               }
                             } catch (err) {
                               console.error('Failed to load previous shift balance:', err);
                             }
                           }
                         }}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Select register...</option>
                {registers.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.registerNumber} - {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cash Float (KES)</label>
              <input
                type="number"
                value={openingFloatCash}
                onChange={(e) => setOpeningFloatCash(e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">M-Pesa Balance (KES)</label>
              <input
                type="number"
                value={openingFloatMpesa}
                onChange={(e) => setOpeningFloatMpesa(e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="0.00"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowOpenModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
<Button
                 className="flex-1"
                 onClick={handleOpenShift}
                 disabled={!selectedRegister || submitting}
                 isLoading={submitting}
               >
                 Open Shift
               </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 w-full">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCloseModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 transition-colors"
        >
          <Calculator className="w-3 h-3" />
          <span>{activeShift.shiftId}</span>
          <span className="text-gray-400">|</span>
          <span>Opened: {formatDateTime(activeShift.startTime)}</span>
        </button>

        <Modal
          isOpen={showCloseModal}
          onClose={() => setShowCloseModal(false)}
          title="Close Shift"
          size="sm"
        >
          <div className="space-y-4">
            {activeShift && (
              <>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                  <p className="text-xs text-blue-600 mb-1">Expected Cash</p>
                  <p className="text-lg font-bold text-blue-700">{formatCurrency(activeShift.expectedCash)}</p>
                  <p className="text-xs text-blue-600 mt-1">Cash Float + Cash Sales - Drops - Expenses</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actual Cash Count (KES)</label>
                  <input
                    type="number"
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
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
                    value={closingMpesa}
                    onChange={(e) => setClosingMpesa(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Enter M-Pesa balance"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Any notes about this shift..."
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCloseModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCloseShift}
                    disabled={!closingCash || !closingMpesa || submitting}
                    isLoading={submitting}
                  >
                    Close Shift
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>

        <Link href="/reconciliation/x-reads">
          <Button
            size="sm"
            variant="outline"
            className="text-blue-600 !border-blue-400 hover:!bg-blue-50 !px-2 !py-0.5 !text-xs"
          >
            <BarChart3 className="w-3 h-3 mr-1" />
            X-Report
          </Button>
        </Link>
        <Link href={`/reconciliation/shifts/${activeShift._id}/close`}>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 !border-red-400 hover:!bg-red-50 !px-2 !py-0.5 !text-xs"
          >
            End Shift
          </Button>
        </Link>
      </div>
      
      {/* POS Session Info - Far Right */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-lg text-xs text-gray-600">
        <div className="flex items-center gap-1" title="Computer Name">
          <Monitor className="w-3 h-3" />
          <span className="font-medium">{computerName}</span>
        </div>
        <span className="text-gray-300">|</span>
        <div className="flex items-center gap-1" title="Logged in user">
          <User className="w-3 h-3" />
          <span className="font-medium">
            {user?.name || user?.email || 'Unknown User'}
            {user?.role && (
              <span className="ml-1 text-gray-500">({user.role === 'super_admin' ? 'Super-Admin' : user.role})</span>
            )}
          </span>
        </div>
        <span className="text-gray-300">|</span>
        <div className="flex items-center gap-1" title="Current Date & Time">
          <Calendar className="w-3 h-3" />
          <span className="font-medium">{formatDateTime(currentDateTime)}</span>
        </div>
        <span className="text-gray-300">|</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            title="Cashier Logout"
          >
            <LogOut className="w-3 h-3" />
            <span>Logout</span>
          </button>
          <button
            onClick={() => {
              useUIStore.getState().setSwitchCashier(true);
              setShowPOSAuthModal(true);
            }}
            className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
            title="Switch Cashier"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Switch</span>
          </button>
        </div>
      </div>

{showConflictModal && activeShiftConflict && (
        <Modal
          isOpen={showConflictModal}
          onClose={() => { setShowConflictModal(false); setActiveShiftConflict(null); }}
          title="Active Shift in Progress"
          size="sm"
        >
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-amber-800">Cannot open a new shift</p>
              <p className="text-sm text-amber-700 mt-1">
                Shift <strong>{activeShiftConflict.shiftId}</strong> is currently active on register{' '}
                <strong>{activeShiftConflict.registerNumber}</strong> with cashier{' '}
                <strong>{activeShiftConflict.cashierName}</strong>.
              </p>
              <p className="text-sm text-amber-600 mt-2">
                The current cashier must either <strong>End Shift</strong> or perform a{' '}
                <strong>Cashier Exchange</strong> before another shift can be opened.
              </p>
            </div>
            {user?.role === 'super_admin' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    setShowConflictModal(false);
                    setActiveShiftConflict(null);
                    if (activeShiftConflict?._id) {
                      try {
                        const res = await fetch(`/api/shifts/${activeShiftConflict._id}/force-close`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ notes: 'Super admin override' }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          if (data.success) {
                            fetchActiveShift();
                          }
                        }
                      } catch {
                        // Ignore force-close errors
                      }
                    }
                  }}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Force End Shift (Super Admin)
                </Button>
              </div>
            )}
            <Button
              variant="ghost"
              onClick={() => { setShowConflictModal(false); setActiveShiftConflict(null); }}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </Modal>
      )}

      <Modal
         isOpen={showLogoutConfirm}
         onClose={() => setShowLogoutConfirm(false)}
         title="Confirm Action"
         size="sm"
       >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Would you like to end the current shift, or just log out without closing it?
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowLogoutConfirm(false);
                if (activeShift?._id) {
                  window.location.href = `/reconciliation/shifts/${activeShift._id}/close`;
                }
              }}
              className="flex-1"
            >
              End Shift
            </Button>
            <Button
              onClick={async () => {
                setShowLogoutConfirm(false);
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
              }}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Logout
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
