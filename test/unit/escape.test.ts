import { describe, it, expect } from 'vitest';
import { escapeHtml, escapeAttr } from '../../src/util/escape';

describe('escapeHtml', () => {
  it('escapes &, <, >, ", \'', () => {
    expect(escapeHtml(`<a href="x">&copy;'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;copy;&#39;');
  });

  it('returns empty string for null/undefined', () => {
    expect(escapeHtml(null as unknown as string)).toBe('');
    expect(escapeHtml(undefined as unknown as string)).toBe('');
  });

  it('passes safe text through unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('escapeAttr', () => {
  it('escapes quotes in attribute values', () => {
    expect(escapeAttr(`"onmouseover=alert(1)`)).toBe('&quot;onmouseover=alert(1)');
  });

  it('escapes ampersands', () => {
    expect(escapeAttr('a&b')).toBe('a&amp;b');
  });

  // Guards against a future maintainer narrowing escapeHtml's character set
  // for body-context performance and silently weakening attribute escaping.
  it.each(['<a href="x">&copy;\'', '"onmouseover=alert(1)', 'a&b', 'hello world', ''])(
    'produces the same output as escapeHtml for %j',
    (input) => {
      expect(escapeAttr(input)).toBe(escapeHtml(input));
    },
  );
});
