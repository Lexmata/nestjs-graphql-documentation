import { describe, it, expect } from 'vitest';
import { parseDescription } from '../../src/harvest/description-parser';

describe('parseDescription', () => {
  it('returns empty body and default tags for empty input', () => {
    expect(parseDescription('')).toEqual({ body: '', tags: { examples: [] } });
    expect(parseDescription(undefined)).toEqual({ body: '', tags: { examples: [] } });
  });

  it('extracts @auth and @since single-value tags', () => {
    const out = parseDescription('Does the thing.\n@auth admin\n@since 1.2.0');
    expect(out.body).toBe('Does the thing.');
    expect(out.tags.auth).toBe('admin');
    expect(out.tags.since).toBe('1.2.0');
  });

  it('extracts multi-line @example block up to next blank line or tag', () => {
    const input = [
      'Creates a user.',
      '',
      '@example',
      'mutation {',
      '  createUser(input: { name: "Jo" }) { id }',
      '}',
      '',
      '@auth admin',
    ].join('\n');
    const out = parseDescription(input);
    expect(out.body).toBe('Creates a user.');
    expect(out.tags.examples).toHaveLength(1);
    expect(out.tags.examples[0]).toContain('mutation {');
    expect(out.tags.examples[0]).toContain('createUser');
    expect(out.tags.auth).toBe('admin');
  });

  it('supports multiple @example blocks', () => {
    const input = '@example\nquery { a }\n\n@example\nquery { b }';
    const out = parseDescription(input);
    expect(out.tags.examples).toEqual(['query { a }', 'query { b }']);
  });

  it('ignores tag-like strings inside fenced code blocks', () => {
    const input = 'Body.\n```\n@example not-a-tag\n```\n@since 2.0';
    const out = parseDescription(input);
    expect(out.body).toBe('Body.\n```\n@example not-a-tag\n```');
    expect(out.tags.examples).toEqual([]);
    expect(out.tags.since).toBe('2.0');
  });

  it('ignores unknown tags (left in body)', () => {
    const out = parseDescription('Body.\n@unknown foo');
    expect(out.body).toBe('Body.\n@unknown foo');
    expect(out.tags).toEqual({ examples: [] });
  });

  it('trims trailing whitespace on body', () => {
    const out = parseDescription('Body.\n\n@auth admin');
    expect(out.body).toBe('Body.');
  });

  it('supports inline value on the @example line', () => {
    const out = parseDescription('@example query { me }');
    expect(out.tags.examples).toEqual(['query { me }']);
  });

  it('terminates an @example block when a new tag appears', () => {
    const out = parseDescription('@example\nquery { a }\n@auth admin');
    expect(out.tags.examples).toEqual(['query { a }']);
    expect(out.tags.auth).toBe('admin');
  });
});
