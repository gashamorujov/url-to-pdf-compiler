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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="cyber-panel relative w-full max-w-md p-6" onClick={(event) => event.stopPropagation()}>
        <span className="cyber-panel-corner tl" />
        <span className="cyber-panel-corner tr" />
        <span className="cyber-panel-corner bl" />
        <span className="cyber-panel-corner br" />
        <h3 className="font-display mb-2 text-lg font-bold uppercase tracking-widest text-rose-300 glow-magenta">Some images failed</h3>
        <p className="mb-6 text-sm text-cyan-100/70">
          <strong className="text-cyan-300">{loaded} of {total}</strong> images loaded. <strong className="text-rose-400">{failed}</strong> failed.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={onCancel} className="cyber-btn cyber-btn-ghost">Cancel</button>
          <button onClick={onRetryFailed} className="cyber-btn cyber-btn-danger">Retry Failed ({failed})</button>
          <button onClick={onCreateWithLoaded} className="cyber-btn cyber-btn-primary">Create PDF With {loaded} Pages</button>
        </div>
      </div>
    </div>
  );
}
