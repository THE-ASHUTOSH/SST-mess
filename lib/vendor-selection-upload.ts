import { db } from '@/lib/db';
import { users, vendorSelections } from '@/lib/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import * as xlsx from 'xlsx';

/**
 * Shared helpers for the (bulk) per-vendor vendor-selection upload. The upload now takes a
 * VENDOR + MONTH picked in the UI plus a list of student EMAILS (from a file or pasted text);
 * these helpers turn that into a classification the verify step reviews and the commit step writes.
 *
 * Email matching is CASE-INSENSITIVE: inputs are lowercased and compared against `lower(users.email)`,
 * because stored emails are not guaranteed lowercase (getDbUser saves the Clerk address verbatim).
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Hard caps that keep one bulk upload bounded (see the load audit): reject oversized input with a
// clean 400 rather than hitting Postgres' ~65k bind-parameter limit, a function timeout, or OOM.
// Real monthly opt-in lists are hundreds–low-thousands, so this is generous; raise it only together
// with chunking the read/update queries below.
export const MAX_UPLOAD_EMAILS = 10_000;
export const MAX_UPLOAD_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
// Bound the rows xlsx expands into memory (mitigates row-explosion / zip-bomb style files).
const MAX_PARSE_ROWS = MAX_UPLOAD_EMAILS + 2_000;

export function isUuid(value: string): boolean {
    return UUID_RE.test(value);
}

// "YYYY-MM" -> UTC month-start Date (explicit UTC avoids the timezone drift noted in docs/PLAN.md).
export function monthToUtcDate(month: string): Date | null {
    if (!/^\d{4}-\d{2}$/.test(month)) return null;
    const d = new Date(`${month}-01T00:00:00.000Z`);
    return isNaN(d.getTime()) ? null : d;
}

// Split pasted text into candidate email tokens (only keep tokens that contain '@', so stray
// words/names are ignored while malformed emails are still surfaced by normalizeEmails).
export function parseEmailTokens(text: string): string[] {
    return text
        .split(/[\s,;]+/)
        .map((t) => t.trim())
        .filter((t) => t.includes('@'));
}

// Scan every cell of an uploaded CSV/XLSX and return the cells that look like emails (contain '@').
// This tolerates headers/extra columns — non-email cells are simply ignored.
export async function extractEmailsFromFile(file: File): Promise<string[]> {
    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: 'buffer', sheetRows: MAX_PARSE_ROWS });
    const tokens: string[] = [];
    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
        for (const row of rows) {
            if (!Array.isArray(row)) continue;
            for (const cell of row) {
                if (cell == null) continue;
                const s = String(cell).trim();
                if (s.includes('@')) tokens.push(s);
            }
        }
    }
    return tokens;
}

// Lowercase + dedupe candidate tokens into unique valid emails, collecting the malformed ones.
export function normalizeEmails(rawTokens: string[]): { valid: string[]; invalid: string[] } {
    const seen = new Set<string>();
    const valid: string[] = [];
    const invalidSet = new Set<string>();
    for (const token of rawTokens) {
        const trimmed = token.trim();
        if (!trimmed) continue;
        const email = trimmed.toLowerCase();
        if (EMAIL_RE.test(email)) {
            if (!seen.has(email)) {
                seen.add(email);
                valid.push(email);
            }
        } else {
            invalidSet.add(trimmed);
        }
    }
    return { valid, invalid: Array.from(invalidSet) };
}

export interface CreateEntry {
    email: string;
    userId: string;
    name: string;
}

export interface DuplicateEntry {
    email: string;
    userId: string;
    name: string;
    currentVendorId: string;
    currentVendorName: string | null;
    alreadyThisVendor: boolean;
}

export interface Classification {
    toCreate: CreateEntry[];
    duplicates: DuplicateEntry[];
    notFound: string[];
}

/**
 * Classify already-validated, lowercased emails against DB state for a vendor + month:
 *  - toCreate:   student exists and has NO selection this month
 *  - duplicates: student exists but ALREADY has a selection this month (incl. which vendor)
 *  - notFound:   no student with that email
 * Uses two bulk queries total (users lookup + existing selections), not per-email round-trips.
 */
export async function classifyEmails(params: { vendorId: string; forMonth: Date; emails: string[] }): Promise<Classification> {
    const { vendorId, forMonth, emails } = params;
    if (emails.length === 0) return { toCreate: [], duplicates: [], notFound: [] };

    const userRows = await db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(inArray(sql`lower(${users.email})`, emails));
    const byEmail = new Map(userRows.map((u) => [u.email.toLowerCase(), u]));

    const notFound: string[] = [];
    const foundUsers: { email: string; id: string; name: string }[] = [];
    for (const email of emails) {
        const u = byEmail.get(email);
        if (u) foundUsers.push({ email, id: u.id, name: u.name });
        else notFound.push(email);
    }

    const foundIds = foundUsers.map((u) => u.id);
    const existing = foundIds.length
        ? await db.query.vendorSelections.findMany({
              where: and(eq(vendorSelections.forMonth, forMonth), inArray(vendorSelections.userId, foundIds)),
              columns: { userId: true, vendorId: true },
              with: { vendor: { columns: { name: true } } },
          })
        : [];
    const existingByUser = new Map(existing.map((s) => [s.userId, s]));

    const toCreate: CreateEntry[] = [];
    const duplicates: DuplicateEntry[] = [];
    for (const u of foundUsers) {
        const sel = existingByUser.get(u.id);
        if (!sel) {
            toCreate.push({ email: u.email, userId: u.id, name: u.name });
        } else {
            duplicates.push({
                email: u.email,
                userId: u.id,
                name: u.name,
                currentVendorId: sel.vendorId,
                currentVendorName: sel.vendor?.name ?? null,
                alreadyThisVendor: sel.vendorId === vendorId,
            });
        }
    }

    return { toCreate, duplicates, notFound };
}
