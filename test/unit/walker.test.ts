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
    expect(user!.fields.map((f) => f.name).sort()).toEqual(['friends', 'id', 'name']);
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
    const friends = model.objectTypes.find((t) => t.name === 'User')!.fields.find((f) => f.name === 'friends')!;
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
});
