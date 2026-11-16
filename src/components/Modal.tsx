import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#15251f]/85 p-2 backdrop-blur-sm sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`animate-modal flex max-h-[calc(100vh-1rem)] w-full min-h-0 flex-col ${width} overflow-hidden rounded-2xl bg-white shadow-[0_20px_70px_rgba(0,0,0,0.25)] sm:max-h-[calc(100vh-2rem)]`}>
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-white px-5 py-4">
          <h2 className="text-[17px] font-bold font-display">{title}</h2>
          <button
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f3f5f2] text-[#59665d] transition hover:bg-[#e8ebe5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
            aria-label="Close dialog"
            title="Close"
          >
            <X size={17} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children, full, hint }: { label: string; children: ReactNode; full?: boolean; hint?: string }) {
  return (
    <div className={full ? 'col-span-full' : ''}>
      <label className="field-label">{label}</label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1.5 text-[10px] text-muted">{hint}</p>}
    </div>
  );
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string; confirmLabel?: string; danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md">
      <div className="p-5">
        <p className="text-[13px] leading-relaxed text-[#59645e]">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className={danger
              ? 'inline-flex items-center justify-center rounded-[9px] bg-[#c96655] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#b8554a]'
              : 'btn-primary'}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
