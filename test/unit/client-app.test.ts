import { Script } from 'node:vm';
import { describe, it, expect } from 'vitest';
import { CLIENT_APP_JS } from '../../src/render/client-app';

describe('CLIENT_APP_JS', () => {
  it('is a non-empty string', () => {
    expect(typeof CLIENT_APP_JS).toBe('string');
    expect(CLIENT_APP_JS.length).toBeGreaterThan(500);
  });

  it('parses as valid JS (vm.Script constructor succeeds)', () => {
    expect(() => new Script(CLIENT_APP_JS)).not.toThrow();
  });

  it('references history.pushState and fetch', () => {
    expect(CLIENT_APP_JS).toContain('history.pushState');
    expect(CLIENT_APP_JS).toContain('fetch(');
  });

  it('reads window.__INITIAL_ENTITY__', () => {
    expect(CLIENT_APP_JS).toContain('__INITIAL_ENTITY__');
  });
});
