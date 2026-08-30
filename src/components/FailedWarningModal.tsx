interface FailedWarningModalProps {
  isOpen: boolean;
  loaded: number;
  failed: number;
  total: number;
  onCancel: () => void;
  onRetryFailed: () => void;
  onCreateWithLoaded: () => void;
}

export function FailedWarningModal({ isOpen, loaded, failed, total, onCancel, onRetryFailed, onCreateWithLoaded }: FailedWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(event) => event.stopPropagation()}>
        <h3 className="mb-2 text-lg font-bold">Some images failed</h3>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          <strong>{loaded} of {total}</strong> images loaded. <strong>{failed}</strong> failed.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button onClick={onRetryFailed} className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40">
            Retry Failed ({failed})
          </button>
          <button onClick={onCreateWithLoaded} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">
            Create PDF With {loaded} Pages
          </button>
        </div>
      </div>
    </div>
  );
}
