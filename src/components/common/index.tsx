import { Component, ErrorInfo, useEffect, ReactNode } from "react";

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
  onPay?: () => void;
  onDelete?: () => void;
}

export function ActionMenu({
  onDetails,
  onConfigure,
  onPay,
  onDelete,
}: ActionMenuProps) {
  return (
    <details className="item-menu">
      <summary aria-label="Acciones">•••</summary>
      <div className="item-menu-panel">
        <button onClick={onDetails}>Ver detalles</button>
        {onConfigure && <button onClick={onConfigure}>Configurar</button>}
        {onPay && <button onClick={onPay}>Pagar</button>}
        {onDelete && <button onClick={onDelete}>Anular</button>}
      </div>
    </details>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI error:", error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <section className="card" role="alert">
          <p>Algo salió mal al mostrar esta sección.</p>
          <button onClick={this.reset}>Reintentar</button>
        </section>
      );
    }
    return this.props.children;
  }
}
