import { CmsIcon } from "@cms/ui";
import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
};

export function Modal({ children, isOpen, onClose, title }: ModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="overlay-root" role="presentation">
      <button
        className="overlay-backdrop"
        aria-label="Close modal"
        type="button"
        onClick={onClose}
      />
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header>
          <h2 id="modal-title">{title}</h2>
          <button aria-label="Close modal" type="button" onClick={onClose}>
            <CmsIcon name="x" />
          </button>
        </header>
        <div>{children}</div>
      </section>
    </div>,
    document.body,
  );
}
