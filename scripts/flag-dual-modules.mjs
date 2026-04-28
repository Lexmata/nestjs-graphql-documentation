// Drops {"type": "module"} / {"type": "commonjs"} marker package.json files
// into dist/esm and dist/cjs so Node resolves each tree's .js files with the
// right module system, regardless of the outer package's "type" field.
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');

await Promise.all([
  writeFile(
    join(dist, 'cjs', 'package.json'),
    JSON.stringify({ type: 'commonjs' }, undefined, 2) + '\n',
  ),
  writeFile(
    join(dist, 'esm', 'package.json'),
    JSON.stringify({ type: 'module' }, undefined, 2) + '\n',
  ),
]);
