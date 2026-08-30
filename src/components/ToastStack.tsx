import type { ToastItem, ToastKind } from '../types';

const KIND_STYLES: Record<ToastKind, string> = {
  info: 'bg-sky-600 border-sky-500',
  success: 'bg-emerald-600 border-emerald-500',
  warning: 'bg-amber-600 border-amber-500',
  error: 'bg-rose-600 border-rose-500',
};

const KIND_ICON: Record<ToastKind, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '⛔',
};

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div className="fixed bottom-20 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-medium text-white shadow-lg ${KIND_STYLES[toast.kind]}`}
        >
          <span aria-hidden>{KIND_ICON[toast.kind]}</span>
          <span className="flex-1 break-words">{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="ml-2 text-white/80 transition hover:text-white"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
