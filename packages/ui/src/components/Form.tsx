import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  forwardRef,
} from "react";

import { cn } from "../utils/cn.js";
import { Input } from "./Input.js";

type FieldProps = {
  children: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  label: ReactNode;
};

export function Field({ children, description, error, label }: FieldProps) {
  return (
    <label className="cms-field">
      <span>{label}</span>
      {children}
      {description && <small className="cms-field-description">{description}</small>}
      {error && <small className="cms-field-error">{error}</small>}
    </label>
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn("cms-textarea", className)} {...props} />
  ),
);

Textarea.displayName = "Textarea";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn("cms-select", className)} {...props} />
));

Select.displayName = "Select";

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, ...props }, ref) => (
    <label className={cn("cms-switch", className)}>
      <input ref={ref} type="checkbox" {...props} />
      <span aria-hidden="true" />
      <strong>{label}</strong>
    </label>
  ),
);

Switch.displayName = "Switch";

export type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>((props, ref) => (
  <Input ref={ref} type="date" {...props} />
));

DateInput.displayName = "DateInput";

export type FileUploadProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>((props, ref) => (
  <Input ref={ref} type="file" {...props} />
));

FileUpload.displayName = "FileUpload";
