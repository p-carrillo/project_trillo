interface ConfirmActionDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmActionDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  isSubmitting,
  onCancel,
  onConfirm
}: ConfirmActionDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onClick={onCancel}>
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirm-dialog-title">{title}</h3>
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="ghost-btn" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button" className="ghost-btn task-action-btn--danger" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
