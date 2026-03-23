'use client';

import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  header?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  className?: string;
}

export function Modal({ isOpen, onClose, title, header, children, size = 'md', closeOnOverlayClick = false, className = '' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'modal-content-full',
  };

  return (
    <div 
      className={size === 'full' ? 'fixed inset-0 z-50' : 'modal-overlay'} 
      onClick={closeOnOverlayClick ? onClose : undefined}
      style={size === 'full' ? { backgroundColor: 'rgba(0,0,0,0.5)' } : undefined}
    >
      <div 
        className={cn("modal-content animate-slide-up", sizeClasses[size], className)}
        onClick={(e) => e.stopPropagation()}
        style={size === 'full' ? { height: '100vh', overflow: 'auto' } : undefined}
      >
        {/* Header */}
        {(title || header) && (
          <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
            {header ? header : (
              <>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <button 
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </>
            )}
            {!header && title && (
              <button 
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className={size === 'full' ? 'p-4 h-[calc(100vh-65px)]' : 'p-4'}>
          {children}
        </div>
      </div>
    </div>
  );
}
