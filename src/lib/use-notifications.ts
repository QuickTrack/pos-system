'use client';

import { useEffect, useCallback } from 'react';
import { useNotificationStore, Notification } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';

export function useNotifications() {
  const { addNotification, notifications, markAsRead, removeNotification, clearAll, getUnreadCount } = useNotificationStore();
  const { user } = useAuth();

  const notify = useCallback((type: Notification['type'], message: string, category?: Notification['category']) => {
    addNotification({ type, message, category });
  }, [addNotification]);

  const notifySale = useCallback((message: string, type: Notification['type'] = 'info') => {
    notify(type, message, 'sale');
  }, [notify]);

  const notifyInventory = useCallback((message: string, type: Notification['type'] = 'warning') => {
    notify(type, message, 'inventory');
  }, [notify]);

  const notifyCustomer = useCallback((message: string, type: Notification['type'] = 'info') => {
    notify(type, message, 'customer');
  }, [notify]);

  const notifySupplier = useCallback((message: string, type: Notification['type'] = 'info') => {
    notify(type, message, 'supplier');
  }, [notify]);

  const notifyLicense = useCallback((message: string, type: Notification['type'] = 'warning') => {
    notify(type, message, 'license');
  }, [notify]);

  const notifySystem = useCallback((message: string, type: Notification['type'] = 'info') => {
    notify(type, message, 'system');
  }, [notify]);

  return {
    notifications,
    unreadCount: getUnreadCount(),
    notify,
    notifySale,
    notifyInventory,
    notifyCustomer,
    notifySupplier,
    notifyLicense,
    notifySystem,
    markAsRead,
    removeNotification,
    clearAll,
  };
}

export function NotificationManager() {
  const { addNotification, notifications } = useNotificationStore();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Only add demo notifications if there are none
    if (notifications.length > 0) return;

    // Add welcome notification
    setTimeout(() => {
      addNotification({
        type: 'success',
        message: `Welcome back, ${user.name}!`,
        category: 'system',
      });
    }, 1000);

    const checkLowStock = async () => {
      try {
        const response = await fetch('/api/products?lowStock=true&limit=1');
        const data = await response.json();
        if (data.products && data.products.length > 0) {
          addNotification({
            type: 'warning',
            message: `Low stock alert: ${data.products[0].name} has only ${data.products[0].stockQuantity} units left`,
            category: 'inventory',
          });
        }
      } catch (error) {
        console.error('Failed to check low stock:', error);
      }
    };

    const checkLicense = () => {
      const stored = localStorage.getItem('pos-license');
      if (stored) {
        const license = JSON.parse(stored);
        if (license.daysRemaining !== null && license.daysRemaining <= 7 && license.daysRemaining > 0) {
          addNotification({
            type: 'warning',
            message: `Your license expires in ${license.daysRemaining} days. Please renew to avoid interruption.`,
            category: 'license',
          });
        }
      }
    };

    checkLowStock();
    checkLicense();
  }, [user, addNotification, notifications.length]);

  return null;
}