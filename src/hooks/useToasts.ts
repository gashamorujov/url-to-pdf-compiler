import { useCallback, useState } from 'react';
import type { ToastItem, ToastKind } from '../types';

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string, ms = 4000) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, ms);
  }, []);

  return { toasts, dismiss, push };
}
