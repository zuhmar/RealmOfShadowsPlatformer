// Official Prisma WASM engine, distributed with npm integrity verification.
// Pinned together with Prisma; no native engine downloads or disabled checksums.
import { readFile, readdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { PrismaPg } from '@prisma/adapter-pg';
import { bindMigrationAwareSqlAdapterFactory } from '@prisma/driver-adapter-utils';
export async function engine() {
  const require = createRequire(import.meta.url);
  const entry = require.resolve('@prisma/schema-engine-wasm');
  const base = new URL(`file://${entry}`);
  const glue = await import(new URL('./schema_engine_bg.js', base).href);
  const module = new WebAssembly.Module(readFileSync(new URL('./schema_engine_bg.wasm', base)));
  const instance = new WebAssembly.Instance(module, { './schema_engine_bg.js': glue });
  glue.__wbg_set_wasm(instance.exports);
  instance.exports.__wbindgen_start();
  const factory = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const schemaPath = fileURLToPath(new URL('./prisma/schema.prisma', import.meta.url));
  const schema = await readFile(schemaPath, 'utf8');
  const e = await glue.SchemaEngine.new(
    { datamodels: [[schemaPath, schema]] },
    () => {},
    bindMigrationAwareSqlAdapterFactory(factory),
  );
  return { e, schema, schemaPath };
}
export async function migrations() {
  const baseDir = fileURLToPath(new URL('./prisma/migrations', import.meta.url));
  const entries = await readdir(baseDir, { withFileTypes: true });
  return {
    baseDir,
    lockfile: {
      path: 'migration_lock.toml',
      content: await readFile(`${baseDir}/migration_lock.toml`, 'utf8'),
    },
    shadowDbInitScript: '',
    migrationDirectories: await Promise.all(
      entries
        .filter((x) => x.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(async (x) => ({
          path: x.name,
          migrationFile: {
            path: 'migration.sql',
            content: {
              tag: 'ok',
              value: await readFile(`${baseDir}/${x.name}/migration.sql`, 'utf8'),
            },
          },
        })),
    ),
  };
}
