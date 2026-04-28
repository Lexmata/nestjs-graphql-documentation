import { describe, it, expect } from 'vitest';
import { buildSchema } from 'graphql';
import {
  detectFederation,
  isFederationInternalType,
  isFederationInternalRootField,
} from '../../src/harvest/federation';

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

  it('detects federation via the _entities root field alone', () => {
    // Covers the right-hand side of the `'_service' in fields || '_entities' in fields`
    // short-circuit - our main federation example uses _service, so v8 wouldn't
    // otherwise see the _entities-only path.
    const schema = buildSchema(`
      type User { id: ID! }
      union _Entity = User
      type Query { _entities(representations: [ID!]!): [_Entity] }
    `);
    expect(detectFederation(schema)).toBe(true);
  });

  it('detects federation via an internal type present in the type map without a root field', () => {
    // The _Entity type exists as a schema member but the query type doesn't
    // list _service/_entities - exercises the type-map scan branch.
    const schema = buildSchema(`
      type User { id: ID! }
      union _Entity = User
      type Query { hello: String }
    `);
    expect(detectFederation(schema)).toBe(true);
  });
});
