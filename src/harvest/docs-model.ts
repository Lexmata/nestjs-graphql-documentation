export interface DocsModel {
  meta: {
    title: string;
    generatedAt: string;
    isFederated: boolean;
  };
  queries: FieldEntry[];
  mutations: FieldEntry[];
  subscriptions: FieldEntry[];
  objectTypes: TypeEntry[];
  inputTypes: TypeEntry[];
  interfaces: TypeEntry[];
  unions: UnionEntry[];
  enums: EnumEntry[];
  scalars: ScalarEntry[];
  directives: DirectiveEntry[];
}

export interface FieldEntry {
  name: string;
  description: string;
  args: ArgEntry[];
  returnType: TypeRef;
  deprecationReason?: string;
  tags: ParsedTags;
}

export interface ArgEntry {
  name: string;
  description: string;
  type: TypeRef;
  defaultValue?: string;
}

export interface TypeEntry {
  name: string;
  description: string;
  fields: FieldEntry[];
  implements?: string[];
  directives?: AppliedDirective[];
}

export interface UnionEntry {
  name: string;
  description: string;
  members: string[];
}

export interface EnumValueEntry {
  name: string;
  description: string;
  deprecationReason?: string;
}

export interface EnumEntry {
  name: string;
  description: string;
  values: EnumValueEntry[];
}

export interface ScalarEntry {
  name: string;
  description: string;
}

export interface DirectiveEntry {
  name: string;
  description: string;
  locations: string[];
  args: ArgEntry[];
}

export type NamedTypeKind =
  | 'OBJECT'
  | 'INPUT_OBJECT'
  | 'INTERFACE'
  | 'UNION'
  | 'ENUM'
  | 'SCALAR';

export type TypeRef =
  | { kind: 'NAMED'; name: string; namedKind: NamedTypeKind }
  | { kind: 'NON_NULL'; ofType: TypeRef }
  | { kind: 'LIST'; ofType: TypeRef };

export interface ParsedTags {
  examples: string[];
  auth?: string;
  since?: string;
}

export interface AppliedDirective {
  name: string;
  args: Record<string, unknown>;
}

export type EntityKind =
  | 'Query'
  | 'Mutation'
  | 'Subscription'
  | 'ObjectType'
  | 'InputType'
  | 'Interface'
  | 'Union'
  | 'Enum'
  | 'Scalar'
  | 'Directive';

export interface EntityRef {
  kind: EntityKind;
  name: string;
}
