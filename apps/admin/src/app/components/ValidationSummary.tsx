import { getErrorMessage, getFieldValidationErrors } from "../lib/validation";

type ValidationSummaryProps = {
  error: unknown;
  fallback: string;
};

export function ValidationSummary({ error, fallback }: ValidationSummaryProps) {
  const fieldErrors = getFieldValidationErrors(error);

  return (
    <div className="form-alert" role="alert">
      <p>{getErrorMessage(error, fallback)}</p>
      {fieldErrors.length > 0 && (
        <ul>
          {fieldErrors.map((fieldError) => (
            <li key={`${fieldError.path}-${fieldError.message}`}>
              <strong>{fieldError.path}</strong>
              <span>{fieldError.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
