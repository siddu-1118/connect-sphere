import 'dotenv/config';
import { db } from './db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const res = await db.execute(
      sql`SELECT id, email FROM auth.users WHERE email = 'saisiddharthvooka@gmail.com' LIMIT 1`
    );
    console.log('Result from db.execute:', res);
    console.log('Rows:', res.rows);
  } catch (err) {
    console.error('Error running db.execute:', err);
  }
}

main();
