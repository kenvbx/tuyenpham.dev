import { CmsIcon } from "@cms/ui";
import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

type DrawerProps = {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
};

export function Drawer({ children, isOpen, onClose, title }: DrawerProps) {
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
        aria-label="Close drawer"
        type="button"
        onClick={onClose}
      />
      <aside
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <header>
          <h2 id="drawer-title">{title}</h2>
          <button aria-label="Close drawer" type="button" onClick={onClose}>
            <CmsIcon name="x" />
          </button>
        </header>
        <div>{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
