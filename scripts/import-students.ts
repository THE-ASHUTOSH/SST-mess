/**
 * Roster import — bulk-inserts STUDENT users from a CSV/XLSX roster file.
 *
 * The roster is the source of truth for students: `/api/admin/users` deliberately refuses to
 * create or delete them, so this script is the intended way a student row comes into existence.
 *
 * Expected columns (header row, case-insensitive, extra columns ignored):
 *
 *     email,name,batch
 *     abhi.24bcs10595@sst.scaler.com,ABHI GUPTA,Batch 2024
 *
 * Usage:
 *   npx tsx scripts/import-students.ts "C:/path/to/students_batch_2024.csv"          # DRY RUN
 *   npx tsx scripts/import-students.ts "C:/path/to/students_batch_2024.csv" --yes    # commit
 *
 * Options:
 *   --analyse             fetch EVERY existing user and report what an import would do, including the
 *                         differences this script will not fix (names, roles, batches, missing rolls).
 *                         Read-only — it overrides --yes and never writes.
 *   --yes                 actually write. Without it the script is a full dry run (reads only).
 *   --role <role>         role for every imported row (default: student)
 *   --batch "<label>"     batch to use when a row's batch cell is blank / the column is missing
 *   --force-batch         apply --batch to EVERY row, ignoring the file's batch column
 *   --no-roll             don't derive the roll number from the email local-part
 *   --tidy-names          title-case names that arrive ALL CAPS ("ABHI GUPTA" -> "Abhi Gupta")
 *   --rejects <path>      where to write the skipped-rows CSV (default: scripts/out/<file>-rejects.csv)
 *
 * SAFETY — this script is strictly additive and idempotent:
 *   • The only statement it ever issues against `users` is INSERT ... ON CONFLICT DO NOTHING.
 *     There is no UPDATE and no DELETE anywhere in this file, so existing rows cannot be
 *     modified, re-roled, renamed, or removed. Re-running it is a no-op.
 *   • Emails already present are filtered out BEFORE the insert, matched case-insensitively via
 *     lower(users.email) — the unique index is on the raw column, so a stored "Foo@x.com" would
 *     NOT collide with an incoming "foo@x.com". ON CONFLICT is only the backstop for races.
 *   • Reads DATABASE_URL from .env.local and prints the target host — verify it before --yes.
 */
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

config({ path: path.resolve(process.cwd(), '.env.local') });

import { drizzle } from 'drizzle-orm/node-postgres';
import { pgConnection } from '../lib/db/pg';
import { asc, inArray, sql } from 'drizzle-orm';
import * as xlsx from 'xlsx';
import * as schema from '../lib/db/schema';
import { ALLOWED_EMAIL_DOMAINS_LABEL, isAllowedEmailDomain } from '../lib/email-domains';

// --- bounds -------------------------------------------------------------------------------------
const INSERT_CHUNK = 500;   // rows per INSERT — 500 x 5 cols = 2.5k bind params, far under PG's ~65k
const LOOKUP_CHUNK = 1_000; // emails per existence probe — keeps each IN (...) list bounded
const SCAN_PAGE = 5_000;    // rows per page when --analyse walks the whole users table
const MAX_ROWS = 50_000;    // refuse absurd files rather than OOM (a real roster is hundreds–thousands)
const MAX_EMAIL_LENGTH = 254;
const WARN_NAME_LENGTH = 120; // matches MAX_NAME_LENGTH in app/api/admin/users/route.ts

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// SST student ID shape, e.g. "25bcs10473" — see scripts/mess-utilisation-report.ts
const STUDENT_ID_RE = /^\d{2}[a-z]{2,5}\d+$/;

type Role = (typeof schema.roleEnum.enumValues)[number];

interface StudentRow {
    email: string;
    name: string;
    batch: string | null;
    roll: string | null;
    role: Role;
}

interface Reject {
    line: number;
    email: string;
    name: string;
    batch: string;
    reason: string;
}

// --- sanitizers ---------------------------------------------------------------------------------

/**
 * Replace C0/C1 control characters with a space. Done by code point rather than with a regex so
 * the source carries no control-character class — that would trip `no-control-regex`, and an
 * eslint-disable for a rule that may not be enabled is itself reported as an unused directive.
 */
function stripControlChars(value: string): string {
    let out = '';
    for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        out += code < 0x20 || (code >= 0x7f && code <= 0x9f) ? ' ' : value[i];
    }
    return out;
}

/** Trim, drop control characters, collapse internal whitespace runs to a single space. */
function cleanText(value: unknown): string {
    if (value == null) return '';
    return stripControlChars(String(value)).replace(/\s+/g, ' ').trim();
}

/** Lowercase, unwrap "quoted" cells, strip a mailto: prefix, and remove any stray inner spaces. */
function cleanEmail(value: unknown): string {
    return cleanText(value)
        .replace(/^["'<]+|["'>]+$/g, '')
        .replace(/^mailto:/i, '')
        .replace(/\s+/g, '')
        .toLowerCase();
}

/**
 * "ABHI GUPTA" -> "Abhi Gupta". Mixed-case names are left untouched, so "DSouza" is never mangled.
 * ASCII-only on purpose: unicode property escapes (\p{L}) need target ES2018 and this repo is ES2017.
 */
function tidyName(name: string): string {
    if (name !== name.toUpperCase()) return name;
    return name.toLowerCase().replace(/(^|[\s'\u2019-])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/**
 * The SST student ID is the FINAL dot-separated token of the email local-part:
 * "riddhima.25bcs10473@sst.scaler.com" -> "25bcs10473", "k.vamshi.25bcs10043@..." -> "25bcs10043".
 * Returns null when the token doesn't look like an ID, so we never store junk in `roll`.
 */
function rollFromEmail(email: string): string | null {
    const local = email.split('@')[0] ?? '';
    const parts = local.split('.').filter(Boolean);
    const candidate = parts.length ? parts[parts.length - 1] : '';
    return STUDENT_ID_RE.test(candidate) ? candidate : null;
}

function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

function csvCell(value: string): string {
    return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function n(value: number): string {
    return value.toLocaleString('en-US');
}

// --- file reading ------------------------------------------------------------------------------

/** Read the first sheet of a CSV/XLSX as an array-of-arrays (xlsx handles quoting, BOM, CRLF). */
function readSheetRows(file: string): unknown[][] {
    const workbook = xlsx.readFile(file, { sheetRows: MAX_ROWS + 5, raw: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('The file contains no sheets.');
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: '' });
    return rows.filter((r) => Array.isArray(r) && r.some((c) => cleanText(c) !== ''));
}

const HEADER_ALIASES: Record<'email' | 'name' | 'batch', string[]> = {
    email: ['email', 'e-mail', 'mail', 'email id', 'emailid', 'email address'],
    name: ['name', 'full name', 'fullname', 'student name', 'studentname'],
    batch: ['batch', 'batch year', 'year', 'cohort'],
};

/**
 * Resolve which column holds which field. Uses the header row when it is recognisable; if the
 * first row already looks like data (contains an '@'), falls back to positional email,name,batch.
 */
function resolveColumns(rows: unknown[][]): {
    idx: Record<'email' | 'name' | 'batch', number>;
    dataStart: number;
    usedHeader: boolean;
} {
    const first = (rows[0] ?? []).map((c) => cleanText(c).toLowerCase());
    const firstLooksLikeData = first.some((c) => c.includes('@'));

    if (!firstLooksLikeData) {
        const idx = { email: -1, name: -1, batch: -1 };
        for (const key of ['email', 'name', 'batch'] as const) {
            idx[key] = first.findIndex((h) => HEADER_ALIASES[key].includes(h));
        }
        if (idx.email >= 0) return { idx, dataStart: 1, usedHeader: true };
    }
    return {
        idx: { email: 0, name: 1, batch: 2 },
        dataStart: firstLooksLikeData ? 0 : 1,
        usedHeader: false,
    };
}

// --- args --------------------------------------------------------------------------------------

const VALUE_FLAGS = /^--(role|batch|rejects)$/;

function parseArgs(argv: string[]) {
    const flag = (name: string) => argv.includes(`--${name}`);
    const value = (name: string) => {
        const i = argv.indexOf(`--${name}`);
        const next = i >= 0 ? argv[i + 1] : undefined;
        return next && !next.startsWith('--') ? next : undefined;
    };
    // Positional = not a flag, and not the value belonging to a preceding value-taking flag.
    const positional = argv.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.test(argv[i - 1] ?? ''));

    return {
        file: positional[0],
        commit: flag('yes'),
        role: (value('role') ?? 'student') as Role,
        batchFallback: value('batch') ?? null,
        forceBatch: flag('force-batch'),
        deriveRoll: !flag('no-roll'),
        tidy: flag('tidy-names'),
        rejectsPath: value('rejects') ?? null,
        analyse: flag('analyse') || flag('analyze'),
    };
}

interface DbUser {
    email: string;
    name: string;
    role: Role | null;
    batch: string | null;
    roll: string | null;
}

/** Build the client. Wrapped so `Db` below infers the schema-aware type rather than the default. */
function makeDb(connectionString: string) {
    return drizzle({ connection: pgConnection(connectionString), schema });
}
type Db = ReturnType<typeof makeDb>;

/**
 * Walk the ENTIRE users table in pages. Used only by --analyse, which needs full DB state to say
 * what is already there and how it differs — the normal path uses bounded IN (...) probes instead.
 * Ordered by email so paging is stable.
 */
async function fetchAllUsers(db: Db): Promise<DbUser[]> {
    const all: DbUser[] = [];
    for (let offset = 0; ; offset += SCAN_PAGE) {
        const page = await db
            .select({
                email: schema.users.email,
                name: schema.users.name,
                role: schema.users.role,
                batch: schema.users.batch,
                roll: schema.users.roll,
            })
            .from(schema.users)
            .orderBy(asc(schema.users.email))
            .limit(SCAN_PAGE)
            .offset(offset);
        all.push(...page);
        process.stdout.write('.');
        if (page.length < SCAN_PAGE) break;
    }
    return all;
}

/** Group a list into "label (count)" text, biggest first. */
function tally(values: (string | null)[]): string {
    const counts = new Map<string, number>();
    for (const v of values) {
        const key = v ?? '(none)';
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([k, c]) => `${k} (${n(c)})`)
        .join(', ');
}

/**
 * --analyse: fetch every existing user and report exactly what an import would do, plus the
 * discrepancies this script will NOT fix (it only ever inserts). Read-only; never writes.
 */
function reportAnalysis(candidates: StudentRow[], dbUsers: DbUser[], role: Role) {
    const byLowerEmail = new Map(dbUsers.map((u) => [u.email.toLowerCase(), u]));

    console.log('\n--- Database snapshot ---');
    console.log(`  total users         : ${n(dbUsers.length)}`);
    console.log(`  by role             : ${tally(dbUsers.map((u) => u.role))}`);
    const students = dbUsers.filter((u) => u.role === 'student');
    console.log(`  student batches     : ${students.length ? tally(students.map((u) => u.batch)) : '(no students yet)'}`);
    console.log(`  students with roll  : ${n(students.filter((u) => u.roll).length)}/${n(students.length)}`);

    const toInsert: StudentRow[] = [];
    const caseMismatch: { csv: string; db: string }[] = [];
    const nameDiff: { email: string; csv: string; db: string }[] = [];
    const roleDiff: { email: string; db: string }[] = [];
    const batchDiff: { email: string; csv: string | null; db: string | null }[] = [];
    const missingRoll: string[] = [];

    for (const row of candidates) {
        const existing = byLowerEmail.get(row.email);
        if (!existing) {
            toInsert.push(row);
            continue;
        }
        // Present already. Record every way the stored row disagrees with the file, because this
        // script will NOT update any of it — those need a separate, deliberate fix.
        if (existing.email !== row.email) caseMismatch.push({ csv: row.email, db: existing.email });
        if (existing.name.trim().toLowerCase() !== row.name.trim().toLowerCase()) {
            nameDiff.push({ email: row.email, csv: row.name, db: existing.name });
        }
        if (existing.role !== role) roleDiff.push({ email: row.email, db: existing.role ?? '(null)' });
        if ((existing.batch ?? null) !== (row.batch ?? null)) {
            batchDiff.push({ email: row.email, csv: row.batch, db: existing.batch });
        }
        if (row.roll && !existing.roll) missingRoll.push(row.email);
    }

    const alreadyThere = candidates.length - toInsert.length;
    // Set membership, not a nested scan — at a few thousand rows on each side the naive
    // filter+some would be millions of comparisons.
    const fileEmails = new Set(candidates.map((c) => c.email));
    const notInFile = dbUsers.filter((u) => u.role === 'student' && !fileEmails.has(u.email.toLowerCase()));

    console.log('\n--- What an import would do ---');
    console.log(`  rows in file        : ${n(candidates.length)}`);
    console.log(`  WOULD INSERT        : ${n(toInsert.length)}`);
    console.log(`  already in DB (skip): ${n(alreadyThere)}`);
    console.log(`  DB students not in this file: ${n(notInFile.length)} (untouched — other batches, or left over)`);

    const sample = (label: string, lines: string[]) => {
        if (!lines.length) return;
        console.log(`\n  ${label} — ${n(lines.length)}:`);
        for (const l of lines.slice(0, 10)) console.log(`    ${l}`);
        if (lines.length > 10) console.log(`    …and ${n(lines.length - 10)} more`);
    };

    if (caseMismatch.length) {
        console.log('\n  ⚠ STORED WITH DIFFERENT LETTER-CASE — these are the rows the unique index alone');
        console.log('    would have duplicated. They are correctly skipped here.');
        sample('case mismatches', caseMismatch.map((c) => `${c.csv}  (stored as ${c.db})`));
    }
    sample('name differs from the file (NOT updated)', nameDiff.map((d) => `${d.email}: file "${d.csv}" vs db "${d.db}"`));
    sample(`role in DB is not "${role}" (NOT changed)`, roleDiff.map((d) => `${d.email}: ${d.db}`));
    sample('batch differs from the file (NOT updated)', batchDiff.map((d) => `${d.email}: file ${d.csv ?? '—'} vs db ${d.db ?? '—'}`));
    sample('already present but has no roll (NOT backfilled)', missingRoll);

    if (toInsert.length) {
        console.log(`\n  New rows that would be created — ${n(toInsert.length)}:`);
        for (const r of toInsert.slice(0, 10)) {
            console.log(`    ${r.email}  |  ${r.name}  |  batch=${r.batch ?? '—'}  roll=${r.roll ?? '—'}  role=${r.role}`);
        }
        if (toInsert.length > 10) console.log(`    …and ${n(toInsert.length - 10)} more`);
    }

    console.log('\nANALYSIS ONLY — nothing was written. Drop --analyse and add --yes to import.\n');
}

/** Write the skipped rows to a CSV so the source data can be fixed and the import re-run. */
function writeRejects(sourceFile: string, override: string | null, rejects: Reject[]) {
    const target = override
        ? path.resolve(override)
        : path.resolve(
              process.cwd(),
              'scripts',
              'out',
              `${path.basename(sourceFile, path.extname(sourceFile))}-rejects.csv`,
          );
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const body = rejects
        .map((r) => [String(r.line), r.email, r.name, r.batch, r.reason].map(csvCell).join(','))
        .join('\n');
    fs.writeFileSync(target, `line,email,name,batch,reason\n${body}\n`, 'utf-8');
    console.log(`\n  ${n(rejects.length)} skipped row(s) written to ${path.relative(process.cwd(), target)}`);
}

// --- main --------------------------------------------------------------------------------------

async function main() {
    const args = parseArgs(process.argv.slice(2));

    if (!args.file) {
        console.error(
            '\nUsage: npx tsx scripts/import-students.ts <file.csv> [--analyse] [--yes] [--role student]\n' +
                '       [--batch "Batch 2024"] [--force-batch] [--no-roll] [--tidy-names] [--rejects <path>]\n',
        );
        process.exit(1);
    }
    const file = path.resolve(args.file);
    if (!fs.existsSync(file)) {
        console.error(`\n✗ File not found: ${file}\n`);
        process.exit(1);
    }
    if (!schema.roleEnum.enumValues.includes(args.role)) {
        console.error(`\n✗ --role must be one of: ${schema.roleEnum.enumValues.join(', ')}\n`);
        process.exit(1);
    }
    // Granting superAdmin is a one-at-a-time, deliberate act — never something a CSV can do in bulk.
    // Use scripts/set-role.ts or Controls → User Management for that.
    if (args.role === 'superAdmin') {
        console.error('\n✗ --role superAdmin is not allowed here. Use scripts/set-role.ts for that.\n');
        process.exit(1);
    }
    if (args.role !== 'student') {
        console.log(`⚠ Importing as "${args.role}", NOT student — every row in the file gets this role.\n`);
    }
    if (args.forceBatch && !args.batchFallback) {
        console.error('\n✗ --force-batch requires --batch "<label>".\n');
        process.exit(1);
    }

    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('✗ DATABASE_URL is not set in .env.local. Aborting.');
        process.exit(1);
    }
    const host = (() => {
        try {
            return new URL(url).host;
        } catch {
            return '(unparseable host)';
        }
    })();

    console.log(`\nTarget database host: ${host}`);
    console.log(`Roster file:          ${file}`);
    console.log(`Role for new rows:    ${args.role}`);
    const mode = args.analyse
        ? 'ANALYSE — full DB comparison, nothing will be written'
        : args.commit
          ? 'COMMIT (--yes)'
          : 'DRY RUN — nothing will be written';
    console.log(`Mode:                 ${mode}\n`);
    if (args.analyse && args.commit) {
        console.log('⚠ --analyse wins over --yes: this run only reports, it will not write.\n');
    }

    // ---- 1. parse ------------------------------------------------------------------------------
    const rows = readSheetRows(file);
    if (rows.length === 0) {
        console.error('✗ The file has no non-empty rows.');
        process.exit(1);
    }
    const { idx, dataStart, usedHeader } = resolveColumns(rows);
    if (!usedHeader) {
        console.log('⚠ No recognisable header row — falling back to positional columns: email, name, batch.');
    }
    if (idx.name < 0) console.log('⚠ No "name" column found — rows without a name will be rejected.');
    if (idx.batch < 0 && !args.batchFallback) console.log('⚠ No "batch" column found — batch will be left empty.');

    const dataRows = rows.slice(dataStart);
    if (dataRows.length > MAX_ROWS) {
        console.error(`✗ ${n(dataRows.length)} rows exceeds the ${n(MAX_ROWS)}-row cap. Split the file.`);
        process.exit(1);
    }

    // ---- 2. sanitize + dedupe within the file ---------------------------------------------------
    const rejects: Reject[] = [];
    const byEmail = new Map<string, { row: StudentRow; line: number }>();
    let longNames = 0;
    let dupInFile = 0;
    let dupConflicting = 0;

    dataRows.forEach((raw, i) => {
        const line = dataStart + i + 1; // 1-based line number in the source file
        const rawEmail = idx.email >= 0 ? raw[idx.email] : '';
        const rawName = idx.name >= 0 ? raw[idx.name] : '';
        const rawBatch = idx.batch >= 0 ? raw[idx.batch] : '';

        const email = cleanEmail(rawEmail);
        let name = cleanText(rawName);
        const batchCell = cleanText(rawBatch);
        const reject = (reason: string) => {
            rejects.push({ line, email: email || cleanText(rawEmail), name, batch: batchCell, reason });
        };

        if (!email) return reject('missing email');
        if (email.length > MAX_EMAIL_LENGTH) return reject(`email longer than ${MAX_EMAIL_LENGTH} chars`);
        if (!EMAIL_RE.test(email)) return reject('malformed email');
        // Sign-in is domain-restricted Google SSO, so an outside address could never log in.
        if (!isAllowedEmailDomain(email)) {
            return reject(`email domain not allowed (must be ${ALLOWED_EMAIL_DOMAINS_LABEL})`);
        }
        if (!name) return reject('missing name');

        if (args.tidy) name = tidyName(name);
        if (name.length > WARN_NAME_LENGTH) longNames++;

        const existing = byEmail.get(email);
        if (existing) {
            dupInFile++;
            const sameName = existing.row.name.toLowerCase() === name.toLowerCase();
            if (!sameName) dupConflicting++;
            rejects.push({
                line,
                email,
                name,
                batch: batchCell,
                reason: sameName
                    ? `duplicate of line ${existing.line} in this file`
                    : `duplicate email of line ${existing.line} with a DIFFERENT name ("${existing.row.name}") — check the source data`,
            });
            return;
        }

        const batch = args.forceBatch ? args.batchFallback : batchCell || args.batchFallback;
        byEmail.set(email, {
            line,
            row: {
                email,
                name,
                batch: batch || null,
                roll: args.deriveRoll ? rollFromEmail(email) : null,
                role: args.role,
            },
        });
    });

    const candidates = Array.from(byEmail.values()).map((v) => v.row);

    console.log('--- Parsed ---');
    console.log(`  data rows read      : ${n(dataRows.length)}`);
    console.log(`  unique valid rows   : ${n(candidates.length)}`);
    console.log(
        `  duplicates in file  : ${n(dupInFile)}${dupConflicting ? ` (${n(dupConflicting)} with a conflicting name)` : ''}`,
    );
    console.log(`  rejected (invalid)  : ${n(rejects.length - dupInFile)}`);

    const batchCounts = new Map<string, number>();
    for (const r of candidates) {
        const key = r.batch ?? '(none)';
        batchCounts.set(key, (batchCounts.get(key) ?? 0) + 1);
    }
    console.log(
        `  batch values        : ${Array.from(batchCounts.entries()).map(([b, c]) => `${b} (${n(c)})`).join(', ')}`,
    );
    if (batchCounts.size > 1) {
        console.log('    ⚠ More than one batch label — each distinct string becomes its own filter facet in');
        console.log('      Manage Students. Use --batch / --force-batch if that is unintended.');
    }
    if (args.deriveRoll) {
        const withRoll = candidates.filter((r) => r.roll).length;
        console.log(`  roll derived        : ${n(withRoll)}/${n(candidates.length)} (rest left empty)`);
    }
    if (longNames) {
        console.log(`  ⚠ ${n(longNames)} name(s) exceed ${WARN_NAME_LENGTH} chars (the admin panel's limit) — imported as-is.`);
    }

    if (candidates.length === 0) {
        console.log('\nNothing to import.');
        if (rejects.length) writeRejects(file, args.rejectsPath, rejects);
        return;
    }

    const db = makeDb(url);

    // ---- 3a. --analyse: full-table comparison, then stop ---------------------------------------
    if (args.analyse) {
        process.stdout.write('\n--- Fetching all existing users ');
        const dbUsers = await fetchAllUsers(db);
        console.log(' done');
        if (rejects.length) writeRejects(file, args.rejectsPath, rejects);
        reportAnalysis(candidates, dbUsers, args.role);
        return;
    }

    // ---- 3b. which emails already exist? -------------------------------------------------------
    // Case-insensitive on purpose: stored emails are not guaranteed lowercase (getDbUser saves the
    // Clerk address verbatim), and the unique index is on the RAW column — so a pre-existing
    // "Foo@sst.scaler.com" would not collide with an incoming "foo@sst.scaler.com".
    const emails = candidates.map((r) => r.email);
    const present = new Set<string>();

    process.stdout.write('\n--- Checking existing users ');
    for (const group of chunk(emails, LOOKUP_CHUNK)) {
        const found = await db
            .select({ email: schema.users.email })
            .from(schema.users)
            .where(inArray(sql`lower(${schema.users.email})`, group));
        for (const r of found) present.add(r.email.toLowerCase());
        process.stdout.write('.');
    }
    console.log(' done');

    const toInsert = candidates.filter((r) => !present.has(r.email));
    const skipped = candidates.length - toInsert.length;

    console.log('\n--- Plan ---');
    console.log(`  already in DB (skip): ${n(skipped)}`);
    console.log(`  to insert           : ${n(toInsert.length)}`);

    if (rejects.length) writeRejects(file, args.rejectsPath, rejects);

    if (!args.commit) {
        console.log('\nDRY RUN — no rows were written.');
        if (toInsert.length) {
            console.log('  Sample of what would be inserted:');
            for (const r of toInsert.slice(0, 5)) {
                console.log(`    ${r.email}  |  ${r.name}  |  batch=${r.batch ?? '—'}  roll=${r.roll ?? '—'}  role=${r.role}`);
            }
            if (toInsert.length > 5) console.log(`    …and ${n(toInsert.length - 5)} more`);
        }
        console.log('\nVerify the host above is correct, then re-run with --yes to commit.\n');
        return;
    }

    if (toInsert.length === 0) {
        console.log('\n✓ Nothing new to insert — the roster is already fully imported.\n');
        return;
    }

    // ---- 4. insert ------------------------------------------------------------------------------
    // The ONLY write in this script. ON CONFLICT DO NOTHING is the backstop for a concurrent insert
    // landing between the check above and this write; existing rows are never touched.
    const t0 = Date.now();
    let inserted = 0;
    const groups = chunk(toInsert, INSERT_CHUNK);
    for (let g = 0; g < groups.length; g++) {
        const written = await db
            .insert(schema.users)
            .values(groups[g])
            .onConflictDoNothing()
            .returning({ email: schema.users.email });
        inserted += written.length;
        process.stdout.write(`\r  inserted ${n(inserted)}/${n(toInsert.length)} (chunk ${g + 1}/${groups.length})`);
    }
    const secs = ((Date.now() - t0) / 1000).toFixed(1);

    console.log(`\n\n✓ Inserted ${n(inserted)} new ${args.role}(s) in ${secs}s across ${groups.length} bulk insert(s).`);
    if (inserted !== toInsert.length) {
        console.log(`  (${n(toInsert.length - inserted)} hit ON CONFLICT — created by someone else in the meantime.)`);
    }
    console.log(`  Skipped ${n(skipped)} already-existing row(s); no existing row was modified.\n`);
}

/**
 * DrizzleQueryError stringifies the entire failed query AND every bind parameter, which for a
 * 447-email IN (...) probe buries the actual cause under thousands of lines. Unwrap to the real
 * message and print only that.
 */
function explainError(err: unknown): string {
    const cause = (err as { cause?: unknown } | null)?.cause;
    if (cause instanceof Error) return cause.message;
    if (err instanceof Error) return err.message.split('\nparams:')[0];
    return String(err);
}

// Explicit exit: the pg pool keeps the event loop alive, so returning from main() is not enough.
main().then(() => process.exit(0)).catch((err) => {
    const message = explainError(err);
    console.error(`\n✗ Import failed: ${message}`);

    if (/authentication failed|password authentication/i.test(message)) {
        console.error(
            '\n  The server rejected the DATABASE_URL credentials. This is an environment problem, not a\n' +
                '  data problem — the failure happens on a read, so nothing was written. Check that:\n' +
                '    • the connection string in .env.local is for the database you actually meant to use;\n' +
                '    • user/password match the server (for the local Docker DB they come from\n' +
                '      docker-compose.yml — mess/mess — and a stale named volume can hold an older password:\n' +
                '      `pnpm db:reset` recreates it from scratch);\n' +
                '    • the database still exists.\n' +
                '  Confirm independently with: npx tsx scripts/check-db.ts\n',
        );
    } else if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|fetch failed|ETIMEDOUT/i.test(message)) {
        console.error('\n  Could not reach the database host — check the hostname in DATABASE_URL and your network.\n');
    } else if (/relation .*users.* does not exist/i.test(message)) {
        console.error('\n  The users table is missing — run `pnpm drizzle-kit migrate` against this branch first.\n');
    } else {
        console.error('\n  Re-run with NODE_OPTIONS=--stack-trace-limit=50 for more, or inspect the query above.\n');
    }
    process.exit(1);
});
