import { createContext, useContext } from "react";

export type ToastVariant = "error" | "info" | "success";

export type ToastInput = {
  message: string;
  title: string;
  variant: ToastVariant;
};

export type ToastContextValue = {
  notify: (toast: ToastInput) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}
