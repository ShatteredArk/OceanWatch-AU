/**
 * Applies db/schema.sql to the configured Postgres database.
 * Safe to run multiple times — all DDL uses IF NOT EXISTS.
 *
 * Usage: pnpm db:migrate
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '@vercel/postgres';

async function migrate(): Promise<void> {
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  console.log('Applying schema migration…');
  await db.query(schema);
  console.log('Migration complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
