import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, vendors, vendorSelections, preferenceEnum } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { and, asc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm';
import { isUuid, monthToUtcDate } from '@/lib/vendor-selection-upload';

/**
 * Student directory for a superAdmin — one row per STUDENT, scoped to a working MONTH.
 * The month drives the opted-in status, the vendor shown, and the row change/delete actions.
 * Filtering + pagination happen in SQL (there can be thousands of students). superAdmin ONLY.
 *
 * IMPORTANT: only `vendors.name` is ever selected here — `vendors.email` must never reach a client.
 *
 *   GET /api/admin/students?month=YYYY-MM&page=1&pageSize=25
 *       &search=<q>&optedIn=yes|no|all&vendorIds=a,b&batches=..&preferences=..
 */

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const VALID_PREFERENCES = preferenceEnum.enumValues as readonly string[];

const err = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

// Split a comma-separated multi-select param into a clean, de-duplicated list.
function multi(param: string | null): string[] {
    if (!param) return [];
    return Array.from(new Set(param.split(',').map((s) => s.trim()).filter(Boolean)));
}

export async function GET(req: NextRequest) {
    try {
        await requireRole(['superAdmin']);

        const sp = req.nextUrl.searchParams;

        const forMonth = monthToUtcDate(sp.get('month') ?? '');
        if (!forMonth) return err('A valid month (YYYY-MM) is required.', 400);

        const page = Math.max(1, Number(sp.get('page')) || 1);
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(sp.get('pageSize')) || DEFAULT_PAGE_SIZE));

        const optedIn = sp.get('optedIn') ?? 'all'; // yes | no | all
        const search = sp.get('search')?.trim();
        const vendorIds = multi(sp.get('vendorIds')).filter(isUuid);
        const batches = multi(sp.get('batches'));
        const preferences = multi(sp.get('preferences')).filter((p) => VALID_PREFERENCES.includes(p));

        // --- WHERE conditions (shared by the page query and the count query) ---
        const conditions: SQL[] = [eq(users.role, 'student')];

        if (search) {
            // Escape LIKE metacharacters so % and _ match literally, then match name/email/roll.
            const term = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
            const like = or(ilike(users.name, term), ilike(users.email, term), ilike(users.roll, term));
            if (like) conditions.push(like);
        }
        if (batches.length) conditions.push(inArray(users.batch, batches));

        // Opt-in filters reference the month-scoped selection join below.
        if (optedIn === 'yes') conditions.push(isNotNull(vendorSelections.id));
        else if (optedIn === 'no') conditions.push(isNull(vendorSelections.id));
        // A vendor or preference filter only makes sense for opted-in students (both live on the selection).
        if (vendorIds.length) conditions.push(inArray(vendorSelections.vendorId, vendorIds));
        if (preferences.length) conditions.push(inArray(vendorSelections.preference, preferences as typeof preferenceEnum.enumValues[number][]));

        const where = and(...conditions);
        // Join the selection for THIS month only (0 or 1 per student — enforced by the unique index).
        const selectionJoin = and(eq(vendorSelections.userId, users.id), eq(vendorSelections.forMonth, forMonth));

        const rows = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                roll: users.roll,
                batch: users.batch,
                picture: users.picture,
                selectionId: vendorSelections.id,
                vendorId: vendorSelections.vendorId,
                preference: vendorSelections.preference,
                vendorName: vendors.name, // name only — never vendors.email
            })
            .from(users)
            .leftJoin(vendorSelections, selectionJoin)
            .leftJoin(vendors, eq(vendors.id, vendorSelections.vendorId))
            .where(where)
            .orderBy(asc(users.name))
            .limit(pageSize)
            .offset((page - 1) * pageSize);

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(users)
            .leftJoin(vendorSelections, selectionJoin)
            .where(where);

        const total = Number(count) || 0;

        const students = rows.map((r) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            roll: r.roll,
            batch: r.batch,
            picture: r.picture,
            optedIn: r.selectionId !== null,
            vendorId: r.vendorId,
            vendorName: r.vendorName,
            preference: r.preference,
        }));

        return NextResponse.json({
            success: true,
            students,
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return err('Unauthorized', 401);
            if (error.message === 'Forbidden') return err('Forbidden', 403);
        }
        console.error('Failed to list students:', error);
        return err('Failed to load students.', 500);
    }
}
