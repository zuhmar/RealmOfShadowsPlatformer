// Pinned Prisma generator API: uses the npm-distributed WASM parser and JS compiler.
// This avoids the CLI's eager native schema-engine download; verification stays enabled.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { getInternalDMMF } from '@prisma/get-dmmf';

import { enginesVersion } from '@prisma/engines-version';
const require = createRequire(import.meta.url);
const { generateClient } = require('@prisma/client-generator-js');
const schemaPath = fileURLToPath(new URL('./prisma/schema.prisma', import.meta.url));
const datamodel = await readFile(schemaPath, 'utf8');
const dmmf = getInternalDMMF({ datamodel });
if ('error' in dmmf) throw dmmf.error;
const runtimeSourcePath = fileURLToPath(
  new URL('../../node_modules/@prisma/client/runtime', import.meta.url),
);
await generateClient({
  datamodel,
  schemaPath,
  dmmf,
  outputDir: fileURLToPath(new URL('../../node_modules/.prisma/client', import.meta.url)),
  runtimeBase: '@prisma/client/runtime',
  runtimeSourcePath,
  copyRuntime: false,
  binaryPaths: {},
  engineVersion: enginesVersion,
  clientVersion: require('@prisma/client/package.json').version,
  activeProvider: 'postgresql',
  compilerBuild: 'fast',
  generator: {
    name: 'client',
    provider: { value: 'prisma-client-js', fromEnvVar: null },
    output: null,
    binaryTargets: [],
    previewFeatures: [],
    sourceFilePath: schemaPath,
    config: { engineType: 'client' },
  },
  datasources: [
    {
      name: 'db',
      provider: 'postgresql',
      activeProvider: 'postgresql',
      schemas: [],
      sourceFilePath: schemaPath,
    },
  ],
});
console.log('Generated Prisma client using verified npm-distributed JS/WASM tooling.');
