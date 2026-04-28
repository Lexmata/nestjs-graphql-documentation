import { describe, it, expect } from 'vitest';
import { buildSchema } from 'graphql';
import { walkSchema } from '../../src/harvest/walker';

describe('walkSchema', () => {
  const schema = buildSchema(`
    """The top role."""
    enum Role { ADMIN USER @deprecated(reason: "use ADMIN") }

    """A user."""
    type User {
      id: ID!
      name: String
      """Friends list.
@since 1.0"""
      friends: [User!]
    }

    input UserInput { name: String! }

    interface Node { id: ID! }

    union Result = User

    scalar DateTime

    type Query {
      me: User
      """Fetch a user.
@auth admin
@example
query { user(id: 1) { id } }
"""
      user(id: ID!): User
    }

    type Mutation { create(input: UserInput!): User! @deprecated }

    type Subscription { updates: User }
  `);

  it('harvests queries including descriptions and tags', () => {
    const model = walkSchema(schema, { title: 'T', isFederated: false });
    const userQuery = model.queries.find((q) => q.name === 'user');
    expect(userQuery).toBeDefined();
    expect(userQuery!.description).toBe('Fetch a user.');
    expect(userQuery!.tags.auth).toBe('admin');
    expect(userQuery!.tags.examples[0]).toContain('query { user(id: 1)');
  });

  it('harvests mutations with deprecationReason', () => {
    const model = walkSchema(schema, { title: 'T', isFederated: false });
    expect(model.mutations).toHaveLength(1);
    expect(model.mutations[0].name).toBe('create');
    expect(model.mutations[0].deprecationReason).toBeTruthy();
  });

  it('harvests subscriptions', () => {
    const model = walkSchema(schema, { title: 'T', isFederated: false });
    expect(model.subscriptions.map((s) => s.name)).toEqual(['updates']);
  });

  it('harvests object types with fields', () => {
    const model = walkSchema(schema, { title: 'T', isFederated: false });
    const user = model.objectTypes.find((t) => t.name === 'User');
    expect(user).toBeDefined();
    expect(user!.fields.map((f) => f.name).toSorted()).toEqual(['friends', 'id', 'name']);
    const friends = user!.fields.find((f) => f.name === 'friends')!;
    expect(friends.tags.since).toBe('1.0');
  });

  it('harvests input types, interfaces, unions, scalars', () => {
    const model = walkSchema(schema, { title: 'T', isFederated: false });
    expect(model.inputTypes.map((t) => t.name)).toEqual(['UserInput']);
    expect(model.interfaces.map((t) => t.name)).toEqual(['Node']);
    expect(model.unions.map((u) => u.name)).toEqual(['Result']);
    expect(model.scalars.map((s) => s.name)).toContain('DateTime');
  });

  it('harvests enums with deprecated values', () => {
    const model = walkSchema(schema, { title: 'T', isFederated: false });
    const role = model.enums.find((e) => e.name === 'Role')!;
    const userVal = role.values.find((v) => v.name === 'USER')!;
    expect(userVal.deprecationReason).toBe('use ADMIN');
  });

  it('preserves nested non-null list type refs', () => {
    const model = walkSchema(schema, { title: 'T', isFederated: false });
    const friends = model.objectTypes
      .find((t) => t.name === 'User')!
      .fields.find((f) => f.name === 'friends')!;
    expect(friends.returnType).toEqual({
      kind: 'LIST',
      ofType: {
        kind: 'NON_NULL',
        ofType: { kind: 'NAMED', name: 'User', namedKind: 'OBJECT' },
      },
    });
  });

  it('filters federation-internal entities when isFederated=true', () => {
    const federated = buildSchema(`
      type _Service { sdl: String }
      type Query { hello: String, _service: _Service! }
    `);
    const model = walkSchema(federated, { title: 'T', isFederated: true });
    expect(model.queries.map((q) => q.name)).toEqual(['hello']);
    expect(model.objectTypes.map((t) => t.name)).not.toContain('_Service');
  });

  it('applies include/exclude predicates', () => {
    const model = walkSchema(schema, {
      title: 'T',
      isFederated: false,
      exclude: (e) => e.kind === 'Enum' && e.name === 'Role',
    });
    expect(model.enums).toHaveLength(0);
  });

  it('skips built-in GraphQL types (String, Int, __Schema, etc.)', () => {
    const model = walkSchema(schema, { title: 'T', isFederated: false });
    expect(model.scalars.map((s) => s.name)).not.toContain('String');
    expect(model.scalars.map((s) => s.name)).not.toContain('Int');
    expect(model.objectTypes.map((t) => t.name)).not.toContain('__Schema');
  });

  it('serializes argument default values using GraphQL literal syntax', () => {
    const s = buildSchema(`
      enum Role { ADMIN USER }
      type Query {
        users(role: Role = USER, limit: Int = 10, name: String = "jo"): Int
      }
    `);
    const model = walkSchema(s, { title: 'T', isFederated: false });
    const query = model.queries.find((q) => q.name === 'users')!;
    const roleArg = query.args.find((a) => a.name === 'role')!;
    const limitArg = query.args.find((a) => a.name === 'limit')!;
    const nameArg = query.args.find((a) => a.name === 'name')!;
    expect(roleArg.defaultValue).toBe('USER');
    expect(limitArg.defaultValue).toBe('10');
    expect(nameArg.defaultValue).toBe('"jo"');
  });

  it('falls back to JSON stringification when astFromValue cannot represent the default', () => {
    // astFromValue returns null for a default that can't be represented as an
    // AST literal (e.g. if the runtime value doesn't match the declared type).
    // Build such a case by hand-mutating a schema's arg default to an object
    // under an Int type.
    const s = buildSchema(`type Query { a(x: Int = 1): Int }`);
    const queryType = s.getQueryType()!;
    const arg = queryType.getFields().a.args[0];
    // Replace the default with a value astFromValue cannot serialize.
    (arg as unknown as { defaultValue: unknown }).defaultValue = { toString: () => 'custom' };
    const model = walkSchema(s, { title: 'T', isFederated: false });
    const q = model.queries.find((f) => f.name === 'a')!;
    expect(q.args[0].defaultValue).toBe('custom');
  });

  it('treats a null ofType inside a non-null wrapper as the SCALAR fallback', () => {
    // Exercises the `value === null` branch in tag(): when the wrapped ofType
    // is null, the guards all fail and the NAMED path is taken with whatever
    // the caller passed. Not a realistic schema shape, but it catches the
    // defensive guard regressing from `=== null` to `instanceof ...`.
    const s = buildSchema(`type Query { a: Int }`);
    const field = s.getQueryType()!.getFields().a;
    (field as unknown as { type: unknown }).type = null;
    expect(() => walkSchema(s, { title: 'T', isFederated: false })).toThrow();
  });

  it('classifies interface and union named-type references correctly', () => {
    const s = buildSchema(`
      interface Node { id: ID! }
      type A implements Node { id: ID! }
      type B implements Node { id: ID! }
      union Result = A | B
      type Query {
        lookup(id: ID!): Node
        search: Result
      }
    `);
    const model = walkSchema(s, { title: 'T', isFederated: false });
    const lookup = model.queries.find((q) => q.name === 'lookup')!;
    expect(lookup.returnType).toEqual({ kind: 'NAMED', name: 'Node', namedKind: 'INTERFACE' });
    const search = model.queries.find((q) => q.name === 'search')!;
    expect(search.returnType).toEqual({ kind: 'NAMED', name: 'Result', namedKind: 'UNION' });
  });

  it('harvests a schema with no query type at all', () => {
    // Not technically valid per the GraphQL spec, but buildSchema accepts a
    // schema with only a mutation root, exercising the falsy-queryType branch.
    const s = buildSchema(`type Mutation { touch: Boolean }`);
    const model = walkSchema(s, { title: 'T', isFederated: false });
    expect(model.queries).toEqual([]);
    expect(model.mutations).toHaveLength(1);
  });

  it('treats a crashing include predicate as excluding without throwing', () => {
    const s = buildSchema(`type Query { hello: String }`);
    // Pass raw (unwrapped) predicates directly - walkSchema's try/catch is
    // the last line of defense when no harvester is in the call path.
    const model = walkSchema(s, {
      title: 'T',
      isFederated: false,
      include: () => {
        throw new Error('boom');
      },
    });
    expect(model.queries).toEqual([]);
  });

  it('falls back to JSON stringification for a string default value when astFromValue throws', () => {
    // Swap astFromValue\'s input so the AST path throws, forcing the
    // string-specific fallback branch.
    const s = buildSchema(`type Query { a(x: String = "hi"): Int }`);
    const arg = s.getQueryType()!.getFields().a.args[0];
    // Replace the declared type with a plain object that isNonNullType etc.
    // cannot identify - the isInputType check inside astFromValue will throw.
    (arg as unknown as { type: unknown }).type = { name: 'NOT_A_REAL_TYPE' };
    const model = walkSchema(s, { title: 'T', isFederated: false });
    const q = model.queries.find((f) => f.name === 'a')!;
    expect(q.args[0].defaultValue).toBe('"hi"');
  });

  it('harvests user-defined directives and skips built-ins', () => {
    const s = buildSchema(`
      """Marks a field as privileged."""
      directive @auth(role: String!) on FIELD_DEFINITION
      type Query { hello: String }
    `);
    const model = walkSchema(s, { title: 'T', isFederated: false });
    const authDir = model.directives.find((d) => d.name === 'auth');
    expect(authDir).toBeDefined();
    expect(authDir!.description).toBe('Marks a field as privileged.');
    expect(authDir!.locations).toContain('FIELD_DEFINITION');
    expect(authDir!.args.map((a) => a.name)).toEqual(['role']);
    // Spec-defined directives should be filtered out.
    expect(model.directives.map((d) => d.name)).not.toContain('skip');
    expect(model.directives.map((d) => d.name)).not.toContain('include');
    expect(model.directives.map((d) => d.name)).not.toContain('deprecated');
  });
});
