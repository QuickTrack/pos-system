'use client';

import { useState, useEffect } from 'react';
import { Clock, Calculator } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useShiftStore } from '@/lib/store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export function ShiftStatusIndicator() {
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

  useEffect(() => {
    fetchActiveShift();
  }, [fetchActiveShift]);

  useEffect(() => {
    if (showCloseModal && activeShift) {
      fetchActiveShift();
    }
  }, [showCloseModal, fetchActiveShift]);

  const handleOpenShift = async () => {
    if (!selectedRegister || !openingFloatCash || !openingFloatMpesa) return;

    setSubmitting(true);
    const success = await openShift(selectedRegister, parseFloat(openingFloatCash), parseFloat(openingFloatMpesa));
    if (success) {
      setShowOpenModal(false);
      setSelectedRegister('');
      setOpeningFloatCash('');
      setOpeningFloatMpesa('');
    }
    setSubmitting(false);
  };

  const handleCloseShift = async () => {
    if (!activeShift || !closingCash || !closingMpesa) return;

    setSubmitting(true);
    const success = await closeShift(parseFloat(closingCash), parseFloat(closingMpesa), closingNotes);
    if (success) {
      setShowCloseModal(false);
      setClosingCash('');
      setClosingMpesa('');
      setClosingNotes('');
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
                onChange={(e) => setSelectedRegister(e.target.value)}
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
                disabled={!selectedRegister || !openingFloatCash || !openingFloatMpesa || submitting}
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
      <Link href={`/reconciliation/shifts/${activeShift._id}/close`}>
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50 !px-2 !py-0.5 !text-xs"
        >
          End Shift
        </Button>
      </Link>
    </div>
  );
}