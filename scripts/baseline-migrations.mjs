/**
 * ONE-OFF: adopt a pre-existing database into the drizzle migration ledger ("baselining").
 *
 * WHY THIS EXISTS
 * ---------------
 * A database whose schema was created before `drizzle-kit migrate` was adopted has no rows in
 * drizzle.__drizzle_migrations. migrate therefore believes NOTHING has been applied and would
 * replay 0000 onto a populated database, failing with "relation already exists".
 *
 * This script writes the missing ledger rows, so migrate knows which migrations are already
 * reflected in the schema and runs only the ones that genuinely remain.
 *
 * Run it ONCE per database. Afterwards `generate` + `migrate` is the whole workflow and this
 * script is never needed again — it can be deleted once every environment has been adopted.
 *
 * HOW MIGRATE DECIDES (drizzle-orm .../migrator.cjs)
 * -------------------------------------------------
 *   select ... from drizzle.__drizzle_migrations order by created_at desc limit 1
 *   if (!last || Number(last.created_at) < migration.folderMillis) -> apply it
 *
 * Only the newest row matters. `created_at` is the `when` field from drizzle/meta/_journal.json.
 * `hash` is sha256 of the .sql file — stored for auditing, never compared. We still insert one
 * row per baselined migration so the table reads as an honest history.
 *
 * SAFETY
 * ------
 * Dry run unless you pass --yes. Before writing anything it refuses if:
 *   1. the database looks empty (baselining one would permanently skip the migrations that
 *      create the tables, leaving a database that can never be built);
 *   2. it has already been baselined;
 *   3. the live schema does not match the snapshot for --upto. This is the important one: it
 *      proves the database really is at that point, so the migrations you are about to skip are
 *      genuinely already applied and the ones left to run will not hit missing objects.
 *
 * USAGE
 *   node scripts/baseline-migrations.mjs --upto=0007_hostel_table          # dry run
 *   node scripts/baseline-migrations.mjs --upto=0007_hostel_table --yes    # write
 *   pnpm drizzle-kit migrate                                              # applies 0008+
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = path.join(ROOT, "drizzle");

const args = process.argv.slice(2);
const apply = args.includes("--yes");
const uptoArg = args.find((a) => a.startsWith("--upto="));

const die = (msg) => {
  console.error(`\n  REFUSING  ${msg}\n`);
  process.exit(1);
};

if (!uptoArg) {
  die("--upto=<tag> is required, e.g. --upto=0007_hostel_table\n" +
      "            Everything up to AND INCLUDING that tag is marked applied;\n" +
      "            anything after it is left for `drizzle-kit migrate` to run.");
}
const upto = uptoArg.slice("--upto=".length);

// DATABASE_URL: prefer the real env, fall back to .env.local like the app does.
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  const envPath = path.join(ROOT, ".env.local");
  if (fs.existsSync(envPath)) {
    const m = fs.readFileSync(envPath, "utf8").match(/^DATABASE_URL\s*=\s*["']?([^"'\n\r]+)/m);
    if (m) dbUrl = m[1];
  }
}
if (!dbUrl) die("DATABASE_URL is not set and .env.local has none.");

const journal = JSON.parse(fs.readFileSync(path.join(MIGRATIONS_DIR, "meta/_journal.json"), "utf8"));
const entries = [...journal.entries].sort((a, b) => a.when - b.when);

const cutoff = entries.findIndex((e) => e.tag === upto);
if (cutoff === -1) {
  die(`no journal entry tagged "${upto}". Known tags:\n            ` + entries.map((e) => e.tag).join("\n            "));
}
const toBaseline = entries.slice(0, cutoff + 1);
const toRun = entries.slice(cutoff + 1);

const url = new URL(dbUrl);
const sql = neon(dbUrl);

console.log(`\n  host        ${url.hostname}`);
console.log(`  database    ${url.pathname.slice(1).split("?")[0]}`);
console.log(`  --upto      ${upto}  (idx ${entries[cutoff].idx})`);
console.log(`  mode        ${apply ? "APPLY — will write bookkeeping rows" : "DRY RUN — nothing will be written"}\n`);

/* ---------- guard 1: not an empty database ---------------------------------------------- */
const [{ present }] = await sql`
  select count(*)::int as present from information_schema.tables
  where table_schema = 'public' and table_name in ('users','vendors','meals','vendor_selections')`;
if (present < 4) {
  die(`only ${present}/4 core tables exist — this database looks EMPTY.\n` +
      "            Baselining would skip the migrations that create them.\n" +
      "            A fresh database needs no baseline: just run `pnpm drizzle-kit migrate`.");
}

/* ---------- guard 2: not already baselined --------------------------------------------- */
await sql`create schema if not exists drizzle`;
await sql`create table if not exists drizzle.__drizzle_migrations (
  id serial primary key, hash text not null, created_at bigint)`;
const ledger = await sql`select created_at from drizzle.__drizzle_migrations order by created_at`;
if (ledger.length > 0) {
  die(`drizzle.__drizzle_migrations already has ${ledger.length} row(s) — newest created_at=` +
      `${ledger.at(-1).created_at}.\n            This database is already baselined; run ` +
      "`pnpm drizzle-kit migrate` instead.");
}

/* ---------- guard 3: live schema must match the --upto snapshot ------------------------- */
// Presence only, never types: what decides whether the pending DDL succeeds is whether an
// object exists, and Postgres reports types in forms that differ harmlessly from the snapshot
// (e.g. "timestamp" vs "timestamp without time zone").
const snapPath = path.join(MIGRATIONS_DIR, `meta/${String(entries[cutoff].idx).padStart(4, "0")}_snapshot.json`);
if (!fs.existsSync(snapPath)) die(`snapshot ${path.basename(snapPath)} is missing; cannot verify state.`);
const snap = JSON.parse(fs.readFileSync(snapPath, "utf8"));
const lastSnap = JSON.parse(fs.readFileSync(
  path.join(MIGRATIONS_DIR, `meta/${String(entries.at(-1).idx).padStart(4, "0")}_snapshot.json`), "utf8"));

const wantCols = new Set();
const wantTables = new Set();
for (const t of Object.values(snap.tables)) {
  wantTables.add(t.name);
  for (const c of Object.keys(t.columns)) wantCols.add(`${t.name}.${c}`);
}
const wantEnums = new Map(Object.values(snap.enums ?? {}).map((e) => [e.name, [...e.values].sort().join("|")]));

const liveTablesRows = await sql`select table_name from information_schema.tables where table_schema='public'`;
const liveTables = new Set(liveTablesRows.map((r) => r.table_name).filter((t) => t !== "__drizzle_migrations"));
const liveColRows = await sql`select table_name, column_name from information_schema.columns where table_schema='public'`;
const liveCols = new Set(liveColRows.map((r) => `${r.table_name}.${r.column_name}`));
const liveEnumRows = await sql`
  select t.typname, e.enumlabel from pg_type t join pg_enum e on e.enumtypid=t.oid
  join pg_namespace n on n.oid=t.typnamespace where n.nspname='public'`;
const liveEnums = new Map();
for (const r of liveEnumRows) {
  if (!liveEnums.has(r.typname)) liveEnums.set(r.typname, []);
  liveEnums.get(r.typname).push(r.enumlabel);
}

const problems = [];
for (const t of wantTables) if (!liveTables.has(t)) problems.push(`missing table   ${t}`);
for (const t of liveTables) if (!wantTables.has(t)) problems.push(`unexpected table ${t}`);
for (const c of wantCols) if (!liveCols.has(c)) problems.push(`missing column  ${c}`);
for (const c of liveCols) {
  const table = c.split(".")[0];
  if (wantTables.has(table) && !wantCols.has(c)) problems.push(`unexpected column ${c}`);
}
for (const [name, vals] of wantEnums) {
  if (!liveEnums.has(name)) problems.push(`missing enum    ${name}`);
  else if ([...liveEnums.get(name)].sort().join("|") !== vals) problems.push(`enum values differ ${name}`);
}
for (const name of liveEnums.keys()) if (!wantEnums.has(name)) problems.push(`unexpected enum ${name}`);

// Indexes introduced by the migrations still to run must not exist yet.
const idxAt = (s) => new Set(Object.values(s.tables).flatMap((t) => Object.keys(t.indexes ?? {})));
const futureIdx = [...idxAt(lastSnap)].filter((i) => !idxAt(snap).has(i));
if (futureIdx.length) {
  const rows = await sql`select indexname from pg_indexes where schemaname='public'`;
  const live = new Set(rows.map((r) => r.indexname));
  for (const i of futureIdx) if (live.has(i)) problems.push(`index already exists (a later migration creates it): ${i}`);
}

if (problems.length) {
  console.error(`  schema does NOT match ${path.basename(snapPath)}:`);
  problems.slice(0, 25).forEach((p) => console.error(`    - ${p}`));
  if (problems.length > 25) console.error(`    … and ${problems.length - 25} more`);
  die(`this database is not at "${upto}".\n` +
      "            Baselining here would mark migrations applied that are not, and the ones left\n" +
      "            to run would hit missing or duplicate objects. Try a different --upto, or\n" +
      "            reconcile the drift with a new guarded migration first.");
}
console.log(`  verified    live schema matches ${path.basename(snapPath)} exactly\n`);

/* ---------- plan ------------------------------------------------------------------------ */
console.log("  will mark APPLIED (skipped by migrate):");
const rows = toBaseline.map((e) => {
  const file = path.join(MIGRATIONS_DIR, `${e.tag}.sql`);
  if (!fs.existsSync(file)) die(`journal references ${e.tag}.sql but the file is missing.`);
  const hash = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  console.log(`    ${String(e.idx).padStart(2, "0")}  ${e.tag.padEnd(42)} ${hash.slice(0, 12)}…`);
  return { hash, created_at: e.when };
});

console.log("\n  will be RUN by `pnpm drizzle-kit migrate`:");
if (!toRun.length) console.log("    (none — the chain is already complete)");
toRun.forEach((e) => console.log(`    ${String(e.idx).padStart(2, "0")}  ${e.tag}`));

if (!apply) {
  console.log("\n  Dry run. Re-run with --yes to write the rows above.\n");
  process.exit(0);
}

for (const r of rows) {
  await sql`insert into drizzle.__drizzle_migrations (hash, created_at) values (${r.hash}, ${r.created_at})`;
}
const [{ n }] = await sql`select count(*)::int as n from drizzle.__drizzle_migrations`;
console.log(`\n  Done — ${n} bookkeeping row(s) written. No schema was changed.`);
console.log("  Next: pnpm drizzle-kit migrate\n");
