import { describe, it, expect } from 'vitest';
import { buildSchema } from 'graphql';
import { detectFederation, isFederationInternalType, isFederationInternalRootField } from '../../src/harvest/federation';

describe('federation', () => {
  it('detects non-federated schema', () => {
    const schema = buildSchema(`type Query { hello: String }`);
    expect(detectFederation(schema)).toBe(false);
  });

  it('detects federation via _service root field', () => {
    const schema = buildSchema(`
      type _Service { sdl: String }
      type Query { hello: String, _service: _Service! }
    `);
    expect(detectFederation(schema)).toBe(true);
  });

  it('filters federation-internal type names', () => {
    expect(isFederationInternalType('_Service')).toBe(true);
    expect(isFederationInternalType('_Entity')).toBe(true);
    expect(isFederationInternalType('_Any')).toBe(true);
    expect(isFederationInternalType('_FieldSet')).toBe(true);
    expect(isFederationInternalType('User')).toBe(false);
  });

  it('filters federation-internal root field names', () => {
    expect(isFederationInternalRootField('_service')).toBe(true);
    expect(isFederationInternalRootField('_entities')).toBe(true);
    expect(isFederationInternalRootField('hello')).toBe(false);
  });
});
