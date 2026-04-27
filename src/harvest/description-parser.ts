import type { ParsedTags } from './docs-model';

export interface ParsedDescription {
  body: string;
  tags: ParsedTags;
}

type TagName = 'example' | 'auth' | 'since';
const KNOWN_TAGS: TagName[] = ['example', 'auth', 'since'];

export function parseDescription(input: string | undefined | null): ParsedDescription {
  const tags: ParsedTags = { examples: [] };
  if (!input) return { body: '', tags };

  const lines = input.split(/\r?\n/);
  const bodyLines: string[] = [];
  let inFence = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      inFence = !inFence;
      bodyLines.push(line);
      i++;
      continue;
    }

    if (!inFence) {
      const tag = matchTag(line);
      if (tag) {
        if (tag.name === 'example') {
          const exampleLines: string[] = [];
          if (tag.value) exampleLines.push(tag.value);
          i++;
          while (i < lines.length) {
            const cur = lines[i];
            if (cur.trim() === '') break;
            if (matchTag(cur)) break;
            exampleLines.push(cur);
            i++;
          }
          tags.examples.push(exampleLines.join('\n'));
          continue;
        } else if (tag.name === 'auth') {
          tags.auth = tag.value.trim();
          i++;
          continue;
        } else if (tag.name === 'since') {
          tags.since = tag.value.trim();
          i++;
          continue;
        }
      }
    }

    bodyLines.push(line);
    i++;
  }

  // Strip leading and trailing blank lines from body
  while (bodyLines.length && bodyLines[0].trim() === '') bodyLines.shift();
  while (bodyLines.length && bodyLines[bodyLines.length - 1].trim() === '') bodyLines.pop();

  return { body: bodyLines.join('\n'), tags };
}

function matchTag(line: string): { name: TagName; value: string } | null {
  const m = line.match(/^@([a-zA-Z]+)(?:\s+(.*))?$/);
  if (!m) return null;
  const name = m[1] as TagName;
  if (!KNOWN_TAGS.includes(name)) return null;
  return { name, value: m[2] ?? '' };
}
