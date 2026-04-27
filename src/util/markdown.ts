import { escapeHtml, escapeAttr } from './escape';

const SAFE_URL = /^(https?:|mailto:|\/|#)/i;

export function renderMarkdown(input: string): string {
  if (!input) return '';
  const lines = input.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (/^```/.test(line)) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence (or EOF)
      out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    // Heading
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // Unordered list
    if (/^- /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].slice(2))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph: gather consecutive non-blank lines that don't start a block
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(```|#{1,3} |- )/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    out.push(`<p>${renderInline(paraLines.join(' '))}</p>`);
  }

  return out.join('\n');
}

function renderInline(text: string): string {
  // Extract inline code spans first so their contents are not further processed.
  const parts: string[] = [];
  let rest = text;
  const CODE = /`([^`]+)`/;
  let m = CODE.exec(rest);
  while (m) {
    parts.push(transformNonCode(rest.slice(0, m.index)));
    parts.push(`<code>${escapeHtml(m[1])}</code>`);
    rest = rest.slice(m.index + m[0].length);
    m = CODE.exec(rest);
  }
  parts.push(transformNonCode(rest));
  return parts.join('');
}

function transformNonCode(text: string): string {
  // Extract links before escaping, to avoid double-escaping URLs.
  const parts: string[] = [];
  let rest = text;
  const LINK = /\[([^\]]+)\]\(([^)]+)\)/;
  let m = LINK.exec(rest);
  while (m) {
    parts.push(transformNoLinks(rest.slice(0, m.index)));
    const label = m[1];
    const url = m[2];
    if (SAFE_URL.test(url)) {
      parts.push(`<a href="${escapeAttr(url)}">${escapeHtml(label)}</a>`);
    } else {
      parts.push(escapeHtml(m[0]));
    }
    rest = rest.slice(m.index + m[0].length);
    m = LINK.exec(rest);
  }
  parts.push(transformNoLinks(rest));
  return parts.join('');
}

function transformNoLinks(text: string): string {
  let s = escapeHtml(text);
  // Bold then italic (bold must run first because ** matches inside *).
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return s;
}
