import { describe, it, expect } from 'vitest';
import { renderCss, BUILT_IN_CSS } from '../../src/render/css';

describe('renderCss', () => {
  it('returns built-in CSS when no customCss provided', () => {
    expect(renderCss()).toBe(BUILT_IN_CSS);
  });

  it('appends customCss after built-in CSS', () => {
    const out = renderCss('.foo { color: red; }');
    expect(out.startsWith(BUILT_IN_CSS)).toBe(true);
    expect(out.endsWith('.foo { color: red; }')).toBe(true);
  });

  it('built-in CSS includes sidebar layout rules', () => {
    expect(BUILT_IN_CSS).toMatch(/\.ngd-sidebar/);
    expect(BUILT_IN_CSS).toMatch(/\.ngd-main/);
  });
});
