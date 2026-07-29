/**
 * Set a user's role by email — the dev role-switcher and the first-superAdmin bootstrap.
 * See docs/DEVELOPMENT.md.
 *
 *   npx tsx scripts/set-role.ts <email> <student|vendor|admin|superAdmin>
 *
 * Reads DATABASE_URL from .env.local; prints the target host so you can verify it's your dev branch.
 * The user must already exist (log in once, or run the seed) — this only changes the role.
 */
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from '../lib/db/schema';

const ROLES = schema.roleEnum.enumValues; // ['admin','student','vendor','superAdmin']

async function main() {
    const [, , emailArg, roleArg] = process.argv;

    if (!emailArg || !roleArg) {
        console.error(`Usage: npx tsx scripts/set-role.ts <email> <${ROLES.join('|')}>`);
        process.exit(1);
    }
    if (!(ROLES as readonly string[]).includes(roleArg)) {
        console.error(`✗ Invalid role "${roleArg}". Must be one of: ${ROLES.join(', ')}`);
        process.exit(1);
    }

    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('✗ DATABASE_URL is not set in .env.local. Aborting.');
        process.exit(1);
    }
    const host = (() => { try { return new URL(url).host; } catch { return '(unparseable host)'; } })();
    console.log(`Target database host: ${host}`);

    const email = emailArg.toLowerCase().trim();
    const db = drizzle(neon(url), { schema });

    const updated = await db
        .update(schema.users)
        .set({ role: roleArg as (typeof ROLES)[number] })
        .where(sql`lower(${schema.users.email}) = ${email}`)
        .returning({ id: schema.users.id, email: schema.users.email, role: schema.users.role });

    if (updated.length === 0) {
        console.error(`✗ No user with email ${email}. Log in once (or run the seed) so the user exists, then retry.`);
        process.exit(1);
    }

    console.log(`✓ ${updated[0].email} is now "${updated[0].role}". Refresh the app to see that portal.`);
    process.exit(0);
}

main().catch((err) => {
    console.error('set-role failed:', err);
    process.exit(1);
});
