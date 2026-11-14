'use client';

import { useEffect } from 'react';
import { useOrders } from '@/context/OrderContext';
import { useToast } from './ToastProvider';

/**
 * Bridges asynchronous OrderContext errors into the unified ToastProvider region
 * without consuming vertical space above page content.
 */
export default function SetupNoticeBanner() {
  const { error, clearError } = useOrders();
  const { showToast } = useToast();

  useEffect(() => {
    if (!error) return;
    showToast({
      message: error,
      tone: 'error',
      durationMs: 6000,
    });
    clearError();
  }, [error, clearError, showToast]);

  return null;
}
