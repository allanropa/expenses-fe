import { useEffect, ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

interface ActionMenuProps {
  onDetails: () => void;
  onConfigure?: () => void;
  onDelete?: () => void;
}

export function ActionMenu({
  onDetails,
  onConfigure,
  onDelete,
}: ActionMenuProps) {
  return (
    <details className="item-menu">
      <summary aria-label="Acciones">•••</summary>
      <div className="item-menu-panel">
        <button onClick={onDetails}>Ver detalles</button>
        {onConfigure && <button onClick={onConfigure}>Configurar</button>}
        {onDelete && <button onClick={onDelete}>Anular</button>}
      </div>
    </details>
  );
}
