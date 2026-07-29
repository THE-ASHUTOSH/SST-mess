/**
 * Bulk load-test seeder — inserts N dummy STUDENT users (default 3000) and, after insertion, saves
 * their emails to fixtures/bulk-emails.csv (in the project), so you can exercise the vendor-selection
 * bulk upload (speed + every case). See docs/DEVELOPMENT.md.
 *
 *   npx tsx scripts/seed-bulk-users.ts            # 3000 (prints target host, then asks to confirm)
 *   npx tsx scripts/seed-bulk-users.ts 5000 --yes # custom count, skip the prompt
 *
 * SAFETY: reads DATABASE_URL from .env.local and prints the target host — only run against your DEV
 * branch. Inserts are idempotent (ON CONFLICT DO NOTHING on the unique email), so re-running is safe.
 */
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

config({ path: path.resolve(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../lib/db/schema';

const CHUNK = 500; // rows per insert — well under Postgres' ~65k bind-parameter ceiling

async function main() {
    const args = process.argv.slice(2);
    const count = Number(args.find((a) => /^\d+$/.test(a)) ?? 3000);
    const confirmed = args.includes('--yes') || process.env.SEED_CONFIRM === '1';

    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('✗ DATABASE_URL is not set in .env.local. Aborting.');
        process.exit(1);
    }
    const host = (() => { try { return new URL(url).host; } catch { return '(unparseable host)'; } })();
    console.log(`\nTarget database host: ${host}`);
    console.log(`About to insert ${count} dummy students.`);
    if (!confirmed) {
        console.error('\n✗ Verify the host is your DEV branch, then re-run with --yes\n');
        process.exit(1);
    }

    const pad = String(count).length;
    const rows = Array.from({ length: count }, (_, i) => {
        const n = String(i + 1).padStart(pad, '0');
        return {
            email: `bulk-student-${n}@scaler.com`,
            name: `Bulk Student ${n}`,
            role: 'student' as const,
            batch: i % 2 === 0 ? 'B1' : 'B2',
        };
    });

    const db = drizzle(neon(url), { schema });

    const t0 = Date.now();
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        await db.insert(schema.users).values(chunk).onConflictDoNothing();
        inserted += chunk.length;
        process.stdout.write(`\r  inserted ~${inserted}/${count}`);
    }
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n✓ Upserted ${count} students in ${secs}s (${Math.ceil(count / CHUNK)} bulk inserts).`);

    // After insertion, save the students' emails as a CSV in the project (tracked) so it's on hand
    // for the upload. The CSV works for both the file-upload path and the paste path (the "Email"
    // header has no "@", so it's ignored when pasted).
    const outDir = path.resolve(process.cwd(), 'fixtures');
    fs.mkdirSync(outDir, { recursive: true });
    const csvPath = path.join(outDir, 'bulk-emails.csv');
    fs.writeFileSync(csvPath, `Email\n${rows.map((r) => r.email).join('\n')}\n`, 'utf-8');
    console.log(`  emails saved to fixtures/bulk-emails.csv`);

    console.log(
        `\nTest the upload (Manage → Upload Vendor Selection, superAdmin):\n` +
        `  • speed / to-create : upload (or paste) fixtures/bulk-emails.csv for a vendor+month → all "to add"\n` +
        `  • duplicates        : run the same upload again (or a different vendor) → all "already opted / change?"\n` +
        `  • not found         : add some emails NOT in this list (e.g. ghost@scaler.com) → reported, skipped\n` +
        `  • invalid           : add malformed tokens (e.g. "not-an-email") → reported, skipped\n` +
        `  • over-limit (400)  : paste >10,000 emails → clean "too many" error\n`,
    );
    process.exit(0);
}

main().catch((err) => {
    console.error('Bulk seed failed:', err);
    process.exit(1);
});
