import { CmsIcon } from "@cms/ui";
import { type ReactNode, useCallback, useMemo, useState } from "react";

import { ToastContext, type ToastInput } from "./toast-context";

type Toast = {
  id: string;
  message: string;
  title: string;
  variant: ToastInput["variant"];
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((toastId: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId));
  }, []);

  const notify = useCallback(
    (toast: ToastInput) => {
      const id = crypto.randomUUID();
      setToasts((currentToasts) => [...currentToasts.slice(-3), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <section className={`toast toast--${toast.variant}`} key={toast.id}>
            <div>
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
            </div>
            <button
              aria-label="Dismiss notification"
              type="button"
              onClick={() => dismiss(toast.id)}
            >
              <CmsIcon name="x" />
            </button>
          </section>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
