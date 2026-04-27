import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../../src/util/markdown';

describe('renderMarkdown', () => {
  it('renders empty input as empty string', () => {
    expect(renderMarkdown('')).toBe('');
  });

  it('renders h1/h2/h3 headings', () => {
    expect(renderMarkdown('# A\n## B\n### C')).toBe('<h1>A</h1>\n<h2>B</h2>\n<h3>C</h3>');
  });

  it('renders fenced code blocks with escaped content', () => {
    const out = renderMarkdown('```\nconst a = "<x>";\n```');
    expect(out).toContain('<pre><code>');
    expect(out).toContain('const a = &quot;&lt;x&gt;&quot;;');
  });

  it('renders inline code', () => {
    expect(renderMarkdown('use `foo()` here')).toBe('<p>use <code>foo()</code> here</p>');
  });

  it('renders unordered lists', () => {
    expect(renderMarkdown('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>');
  });

  it('renders links with escaped href', () => {
    expect(renderMarkdown('[x](https://example.com?a=1&b=2)')).toBe(
      '<p><a href="https://example.com?a=1&amp;b=2">x</a></p>',
    );
  });

  it('renders bold and italic', () => {
    expect(renderMarkdown('**bold** and *italic*')).toBe(
      '<p><strong>bold</strong> and <em>italic</em></p>',
    );
  });

  it('escapes raw HTML in paragraphs', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    );
  });

  it('rejects javascript: URLs in links', () => {
    expect(renderMarkdown('[x](javascript:alert(1))')).toBe('<p>[x](javascript:alert(1))</p>');
  });
});
