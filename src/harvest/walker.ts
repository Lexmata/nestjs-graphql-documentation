import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLEnumType,
  GraphQLScalarType,
  GraphQLField,
  GraphQLInputField,
  GraphQLArgument,
  GraphQLDirective,
  GraphQLType,
  GraphQLNamedType,
  astFromValue,
  print,
} from 'graphql';

// graphql-js ships type guards (isNonNullType, isObjectType, etc.) but they
// use `instanceof` checks that throw when the schema was built in a different
// graphql module realm than the one we imported from - a common situation
// under vitest, which transforms our TS through vite/swc while host-app
// GraphQLModule pulls graphql through Node's CJS loader. Duck-type instead of
// using the named guards; every graphql-js class sets [Symbol.toStringTag] to
// its class name, and those tags are primitive strings that cross realms.
function tag(value: unknown): string | undefined {
  if (value === null || typeof value !== 'object') return undefined;
  const t = (value as { [Symbol.toStringTag]?: unknown })[Symbol.toStringTag];
  return typeof t === 'string' ? t : undefined;
}
const isNonNullType = (t: unknown): t is { ofType: GraphQLType } => tag(t) === 'GraphQLNonNull';
const isListType = (t: unknown): t is { ofType: GraphQLType } => tag(t) === 'GraphQLList';
const isObjectType = (t: unknown): t is GraphQLObjectType => tag(t) === 'GraphQLObjectType';
const isInputObjectType = (t: unknown): t is GraphQLInputObjectType =>
  tag(t) === 'GraphQLInputObjectType';
const isInterfaceType = (t: unknown): t is GraphQLInterfaceType =>
  tag(t) === 'GraphQLInterfaceType';
const isUnionType = (t: unknown): t is GraphQLUnionType => tag(t) === 'GraphQLUnionType';
const isEnumType = (t: unknown): t is GraphQLEnumType => tag(t) === 'GraphQLEnumType';
const isScalarType = (t: unknown): t is GraphQLScalarType => tag(t) === 'GraphQLScalarType';

// Introspection types (__Schema, __Type, etc.) always start with two
// underscores per the GraphQL spec.
const isIntrospectionType = (t: GraphQLNamedType): boolean => t.name.startsWith('__');

// Built-in scalars defined by the GraphQL spec.
const SPECIFIED_SCALARS = new Set(['String', 'Int', 'Float', 'Boolean', 'ID']);
const isSpecifiedScalarType = (t: { name: string }): boolean => SPECIFIED_SCALARS.has(t.name);

// Built-in directives defined by the GraphQL spec.
const SPECIFIED_DIRECTIVES = new Set(['skip', 'include', 'deprecated', 'specifiedBy', 'oneOf']);
const isSpecifiedDirective = (d: { name: string }): boolean => SPECIFIED_DIRECTIVES.has(d.name);
import type {
  DocsModel,
  FieldEntry,
  ArgEntry,
  TypeEntry,
  UnionEntry,
  EnumEntry,
  ScalarEntry,
  DirectiveEntry,
  TypeRef,
  NamedTypeKind,
  EntityRef,
} from './docs-model.js';
import { parseDescription } from './description-parser.js';
import { isFederationInternalType, isFederationInternalRootField } from './federation.js';

export interface WalkOptions {
  title: string;
  isFederated: boolean;
  include?: (entity: EntityRef) => boolean;
  exclude?: (entity: EntityRef) => boolean;
}

export function walkSchema(schema: GraphQLSchema, opts: WalkOptions): DocsModel {
  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  const subscriptionType = schema.getSubscriptionType();

  const filter = entityFilter(opts);

  const queries: FieldEntry[] = queryType
    ? visibleFields(queryType, opts.isFederated)
        .map(toFieldEntry)
        .filter((f) => filter({ kind: 'Query', name: f.name }))
    : [];
  const mutations: FieldEntry[] = mutationType
    ? visibleFields(mutationType, opts.isFederated)
        .map(toFieldEntry)
        .filter((f) => filter({ kind: 'Mutation', name: f.name }))
    : [];
  const subscriptions: FieldEntry[] = subscriptionType
    ? visibleFields(subscriptionType, opts.isFederated)
        .map(toFieldEntry)
        .filter((f) => filter({ kind: 'Subscription', name: f.name }))
    : [];

  const objectTypes: TypeEntry[] = [];
  const inputTypes: TypeEntry[] = [];
  const interfaces: TypeEntry[] = [];
  const unions: UnionEntry[] = [];
  const enums: EnumEntry[] = [];
  const scalars: ScalarEntry[] = [];

  const rootTypeNames = new Set(
    [queryType, mutationType, subscriptionType].filter(Boolean).map((t) => t!.name),
  );

  for (const type of Object.values(schema.getTypeMap())) {
    if (isIntrospectionType(type)) continue;
    if (opts.isFederated && isFederationInternalType(type.name)) continue;
    if (rootTypeNames.has(type.name)) continue;

    if (isObjectType(type)) {
      if (filter({ kind: 'ObjectType', name: type.name })) objectTypes.push(toObjectEntry(type));
    } else if (isInputObjectType(type)) {
      if (filter({ kind: 'InputType', name: type.name })) inputTypes.push(toInputEntry(type));
    } else if (isInterfaceType(type)) {
      if (filter({ kind: 'Interface', name: type.name })) interfaces.push(toInterfaceEntry(type));
    } else if (isUnionType(type)) {
      if (filter({ kind: 'Union', name: type.name })) unions.push(toUnionEntry(type));
    } else if (isEnumType(type)) {
      if (filter({ kind: 'Enum', name: type.name })) enums.push(toEnumEntry(type));
    } else if (isScalarType(type)) {
      if (isSpecifiedScalarType(type)) continue;
      if (filter({ kind: 'Scalar', name: type.name })) scalars.push(toScalarEntry(type));
    }
  }

  const directives: DirectiveEntry[] = schema
    .getDirectives()
    .filter((d) => !isSpecifiedDirective(d))
    .map(toDirectiveEntry)
    .filter((d) => filter({ kind: 'Directive', name: d.name }));

  return {
    meta: {
      title: opts.title,
      generatedAt: new Date().toISOString(),
      isFederated: opts.isFederated,
    },
    queries,
    mutations,
    subscriptions,
    objectTypes,
    inputTypes,
    interfaces,
    unions,
    enums,
    scalars,
    directives,
  };
}

function entityFilter(opts: WalkOptions): (e: EntityRef) => boolean {
  const include = opts.include;
  const exclude = opts.exclude;
  return (e) => {
    try {
      if (include && !include(e)) return false;
      if (exclude && exclude(e)) return false;
      return true;
    } catch {
      return false;
    }
  };
}

function visibleFields(
  type: GraphQLObjectType,
  isFederated: boolean,
): GraphQLField<unknown, unknown>[] {
  return Object.values(type.getFields()).filter(
    (f) => !(isFederated && isFederationInternalRootField(f.name)),
  );
}

function toFieldEntry(field: GraphQLField<unknown, unknown>): FieldEntry {
  const parsed = parseDescription(field.description);
  return {
    name: field.name,
    description: parsed.body,
    args: field.args.map(toArgEntry),
    returnType: toTypeRef(field.type),
    deprecationReason: field.deprecationReason ?? undefined,
    tags: parsed.tags,
  };
}

function toArgEntry(arg: GraphQLArgument): ArgEntry {
  const parsed = parseDescription(arg.description);
  return {
    name: arg.name,
    description: parsed.body,
    type: toTypeRef(arg.type),
    defaultValue: arg.defaultValue === undefined ? undefined : serializeDefault(arg),
  };
}

function serializeDefault(arg: GraphQLArgument): string {
  // Prefer graphql's astFromValue for correct GraphQL literal syntax (quoted
  // strings, enum values without quotes, etc.). Fall back to JSON if the type
  // came from a different graphql module realm than our import - graphql-js
  // cross-realm type checks will throw "cannot use X from another module or
  // realm" instead of returning a usable AST.
  try {
    const ast = astFromValue(arg.defaultValue, arg.type);
    if (ast) return print(ast);
  } catch {
    // cross-realm or unrepresentable value - fall through
  }
  return typeof arg.defaultValue === 'string'
    ? JSON.stringify(arg.defaultValue)
    : String(arg.defaultValue);
}

function toObjectEntry(type: GraphQLObjectType): TypeEntry {
  const parsed = parseDescription(type.description);
  return {
    name: type.name,
    description: parsed.body,
    fields: Object.values(type.getFields()).map(toFieldEntry),
    implements: type.getInterfaces().map((i) => i.name),
  };
}

function toInputEntry(type: GraphQLInputObjectType): TypeEntry {
  const parsed = parseDescription(type.description);
  return {
    name: type.name,
    description: parsed.body,
    fields: Object.values(type.getFields()).map(toInputField),
  };
}

function toInputField(f: GraphQLInputField): FieldEntry {
  const parsed = parseDescription(f.description);
  return {
    name: f.name,
    description: parsed.body,
    args: [],
    returnType: toTypeRef(f.type),
    deprecationReason: f.deprecationReason ?? undefined,
    tags: parsed.tags,
  };
}

function toInterfaceEntry(type: GraphQLInterfaceType): TypeEntry {
  const parsed = parseDescription(type.description);
  return {
    name: type.name,
    description: parsed.body,
    fields: Object.values(type.getFields()).map(toFieldEntry),
  };
}

function toUnionEntry(type: GraphQLUnionType): UnionEntry {
  const parsed = parseDescription(type.description);
  return {
    name: type.name,
    description: parsed.body,
    members: type.getTypes().map((t) => t.name),
  };
}

function toEnumEntry(type: GraphQLEnumType): EnumEntry {
  const parsed = parseDescription(type.description);
  return {
    name: type.name,
    description: parsed.body,
    values: type.getValues().map((v) => {
      const vParsed = parseDescription(v.description);
      return {
        name: v.name,
        description: vParsed.body,
        deprecationReason: v.deprecationReason ?? undefined,
      };
    }),
  };
}

function toScalarEntry(type: GraphQLScalarType): ScalarEntry {
  const parsed = parseDescription(type.description);
  return { name: type.name, description: parsed.body };
}

function toDirectiveEntry(d: GraphQLDirective): DirectiveEntry {
  const parsed = parseDescription(d.description);
  return {
    name: d.name,
    description: parsed.body,
    locations: d.locations.map(String),
    args: d.args.map(toArgEntry),
  };
}

function toTypeRef(type: GraphQLType): TypeRef {
  if (isNonNullType(type)) return { kind: 'NON_NULL', ofType: toTypeRef(type.ofType) };
  if (isListType(type)) return { kind: 'LIST', ofType: toTypeRef(type.ofType) };
  return { kind: 'NAMED', name: (type as GraphQLNamedType).name, namedKind: namedKindOf(type) };
}

function namedKindOf(type: GraphQLType): NamedTypeKind {
  if (isObjectType(type)) return 'OBJECT';
  if (isInputObjectType(type)) return 'INPUT_OBJECT';
  if (isInterfaceType(type)) return 'INTERFACE';
  if (isUnionType(type)) return 'UNION';
  if (isEnumType(type)) return 'ENUM';
  return 'SCALAR';
}
