const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const HTML_ESCAPE_RE = /[&<>"']/g;

export function escapeHtml(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value).replaceAll(HTML_ESCAPE_RE, (ch) => HTML_ESCAPE_MAP[ch]);
}

// Attribute values need the same entity set as body text - &, <, >, ", ' all
// break out of at least one attribute-quoting style. Separate function kept
// for call-site clarity so code that escapes for attribute context is easier
// to audit than a bare escapeHtml call.
export function escapeAttr(value: string | null | undefined): string {
  return escapeHtml(value);
}
