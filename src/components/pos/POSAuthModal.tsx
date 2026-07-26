'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Store, AlertCircle, Delete, Lock, Clock, User } from 'lucide-react';
import { useUIStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';

const POS_AUTH_KEY = 'pos_cashier_auth';
const POS_AUTH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function isCashierAuthed(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(POS_AUTH_KEY);
  if (!stored) return false;
  try {
    const data = JSON.parse(stored);
    if (data.userId && data.timestamp && (Date.now() - data.timestamp) < POS_AUTH_EXPIRY_MS) {
      return true;
    }
    localStorage.removeItem(POS_AUTH_KEY);
    return false;
  } catch {
    return false;
  }
}

function rememberCashierAuth(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(POS_AUTH_KEY, JSON.stringify({ userId, timestamp: Date.now() }));
}

export function POSAuthModal() {
  const router = useRouter();
  const { user } = useAuth();
  const { showPOSAuthModal, setShowPOSAuthModal } = useUIStore();

  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (showPOSAuthModal) {
      setPin(['', '', '', '']);
      setError('');
      inputRefs.current[0]?.focus();
    }
  }, [showPOSAuthModal]);

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 3 && value) {
      handleSubmit(newPin.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleClear = () => {
    setPin(['', '', '', '']);
    setError('');
    inputRefs.current[0]?.focus();
  };

  const handleNumClick = (num: string) => {
    const emptyIndex = pin.findIndex(d => d === '');
    if (emptyIndex !== -1) {
      handlePinChange(emptyIndex, num);
    }
  };

  const handleSubmit = async (pinOverride?: string) => {
    const fullPin = pinOverride || pin.join('');

    if (fullPin.length < 4) {
      setError('Please enter complete PIN');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/cashier-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: fullPin }),
      });

      const data = await response.json();

      if (response.ok) {
        // Check for active shift on the current register
        let activeShiftWarning = null;
        try {
          const activeResponse = await fetch('/api/shifts/active');
          if (activeResponse.ok) {
            const activeData = await activeResponse.json();
            if (activeData.success && activeData.shift) {
              activeShiftWarning = activeData.shift;
            }
          }
        } catch {
          // Ignore fetch errors for active shift check
        }

        if (activeShiftWarning && user?.role !== 'super_admin') {
          setError(`An active shift is already in progress for register ${activeShiftWarning.registerNumber} by ${activeShiftWarning.cashierName}. Only the assigned cashier or a super admin can log in.`);
          setShake(true);
          setTimeout(() => setShake(false), 500);
          setPin(['', '', '', '']);
          inputRefs.current[0]?.focus();
          return;
        }

        setShowPOSAuthModal(false);
        if (data.preserveToken) {
          sessionStorage.setItem('pos-preserve-token', data.preserveToken);
        }
        sessionStorage.setItem('pos-auth-success', 'true');
        if (data.user?.id) {
          rememberCashierAuth(data.user.id);
        }
        window.location.href = '/pos';
        return;
      }

      setError(data.error || 'Invalid PIN');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      console.error('Cashier auth error:', err);
      setError('Unable to connect to server');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowPOSAuthModal(false);
    setPin(['', '', '', '']);
    setError('');
  };

  return (
    <Modal
      isOpen={showPOSAuthModal}
      onClose={handleClose}
      title="Cashier Authentication"
      size="sm"
    >
      <div className="space-y-4">
        {user && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Current Session</p>
                <p className="text-xs text-gray-600">
                  {user.name || user.email} {user.role ? `(${user.role === 'super_admin' ? 'Super-Admin' : user.role})` : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-xl mb-2">
            <Lock className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-sm text-gray-600">Enter your 4-digit cashier PIN to access POS</p>
        </div>

        {error && (
          <div className={`bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm flex items-start gap-2 ${shake ? 'animate-shake' : ''}`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-center gap-2 mb-3">
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={el => {
                inputRefs.current[index] = el;
              }}
              type="password"
              value={digit}
              onChange={e => handlePinChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              maxLength={1}
              autoComplete="one-time-code"
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleNumClick(String(num))}
              disabled={loading}
              className="h-12 text-lg font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="h-12 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Delete className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleNumClick('0')}
            disabled={loading}
            className="h-12 text-lg font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={loading || pin.join('').length < 4}
            className="h-12 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            Enter
          </button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="ghost"
            onClick={handleClear}
            disabled={loading}
            className="flex-1"
          >
            Clear
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function usePOSAuth() {
  const { setShowPOSAuthModal, showPOSAuthModal } = useUIStore();
  const { user } = useAuth();

  const triggerPOSAuth = () => {
    if (user?.role === 'cashier') {
      return true;
    }
    setShowPOSAuthModal(true);
    return false;
  };

  return { triggerPOSAuth, showPOSAuthModal };
}