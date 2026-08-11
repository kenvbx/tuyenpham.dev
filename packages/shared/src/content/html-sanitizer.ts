const BLOCKED_ELEMENT_PATTERN =
  /<\s*\/?\s*(script|iframe|object|embed|link|meta|base|form|input|button|textarea|select|option|svg|math)[^>]*>/giu;
const EVENT_HANDLER_PATTERN = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu;
const UNSAFE_URL_PATTERN =
  /\s+(href|src|xlink:href)\s*=\s*(?:"\s*(?:javascript|data:text\/html|vbscript):[^"]*"|'\s*(?:javascript|data:text\/html|vbscript):[^']*'|\s*(?:javascript|data:text\/html|vbscript):[^\s>]*)/giu;
const STYLE_ATTRIBUTE_PATTERN = /\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu;

export function sanitizeHtml(value: string): string {
  return value
    .replace(BLOCKED_ELEMENT_PATTERN, "")
    .replace(EVENT_HANDLER_PATTERN, "")
    .replace(UNSAFE_URL_PATTERN, "")
    .replace(STYLE_ATTRIBUTE_PATTERN, "");
}

export function sanitizeNullableHtml(value: null | string | undefined): null | string | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  return sanitizeHtml(value);
}
