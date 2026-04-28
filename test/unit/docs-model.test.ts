import { describe, it, expect } from 'vitest';
import type {
  DocsModel,
  FieldEntry,
  TypeRef,
  EntityRef,
  ParsedTags,
} from '../../src/harvest/docs-model';

describe('docs-model types', () => {
  it('TypeRef can represent a nested non-null list', () => {
    const t: TypeRef = {
      kind: 'NON_NULL',
      ofType: {
        kind: 'LIST',
        ofType: {
          kind: 'NON_NULL',
          ofType: { kind: 'NAMED', name: 'Int', namedKind: 'SCALAR' },
        },
      },
    };
    expect(t.kind).toBe('NON_NULL');
  });

  it('DocsModel has all required collections', () => {
    const model: DocsModel = {
      meta: { title: 't', generatedAt: '2026-04-27T00:00:00Z', isFederated: false },
      queries: [],
      mutations: [],
      subscriptions: [],
      objectTypes: [],
      inputTypes: [],
      interfaces: [],
      unions: [],
      enums: [],
      scalars: [],
      directives: [],
    };
    expect(Object.keys(model)).toContain('queries');
  });

  it('ParsedTags supports optional fields', () => {
    const tags: ParsedTags = { examples: [] };
    const withMore: ParsedTags = { examples: ['query { me }'], auth: 'admin', since: '1.2.0' };
    expect(tags.auth).toBeUndefined();
    expect(withMore.since).toBe('1.2.0');
  });

  it('EntityRef discriminates by kind', () => {
    const e: EntityRef = { kind: 'Mutation', name: 'createUser' };
    expect(e.kind).toBe('Mutation');
  });

  it('FieldEntry carries return type and tags', () => {
    const f: FieldEntry = {
      name: 'me',
      description: '',
      args: [],
      returnType: { kind: 'NAMED', name: 'User', namedKind: 'OBJECT' },
      tags: { examples: [] },
    };
    expect(f.returnType.kind).toBe('NAMED');
  });
});
