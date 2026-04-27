import type { GraphQLSchema } from 'graphql';

const INTERNAL_TYPES = new Set(['_Service', '_Entity', '_Any', '_FieldSet']);
const INTERNAL_ROOT_FIELDS = new Set(['_service', '_entities']);

export function detectFederation(schema: GraphQLSchema): boolean {
  const queryType = schema.getQueryType();
  if (queryType) {
    const fields = queryType.getFields();
    if ('_service' in fields || '_entities' in fields) return true;
  }
  for (const name of Object.keys(schema.getTypeMap())) {
    if (INTERNAL_TYPES.has(name)) return true;
  }
  return false;
}

export function isFederationInternalType(name: string): boolean {
  return INTERNAL_TYPES.has(name);
}

export function isFederationInternalRootField(name: string): boolean {
  return INTERNAL_ROOT_FIELDS.has(name);
}
