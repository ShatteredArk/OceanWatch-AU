import { db, sql } from '@vercel/postgres';

export { sql, db };

/**
 * Health check: returns true if the DB is reachable and the detections table exists.
 */
export async function pingDatabase(): Promise<boolean> {
  try {
    const result = await db.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'detections'
      ) AS "exists"`
    );
    return result.rows[0]?.['exists'] === true;
  } catch {
    return false;
  }
}
