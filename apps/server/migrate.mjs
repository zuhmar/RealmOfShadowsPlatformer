import 'dotenv/config';
import { engine, migrations } from './prisma-wasm.mjs';
const { e } = await engine();
try {
  const result = await e.applyMigrations({
    migrationsList: await migrations(),
    filters: { externalTables: [], externalEnums: [] },
  });
  console.log('Prisma migrations applied:', result);
} finally {
  e.free();
}
