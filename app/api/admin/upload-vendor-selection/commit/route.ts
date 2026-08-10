import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { preferenceEnum, vendors, vendorSelections } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { and, eq, isNull } from 'drizzle-orm';
import { isUuid, MAX_UPLOAD_EMAILS, monthToUtcDate } from '@/lib/vendor-selection-upload';

/**
 * Commit step of the per-vendor bulk selection upload — ATOMIC.
 *  - createUserIds:    students with no selection this month  -> INSERT ... ON CONFLICT DO NOTHING
 *  - overwriteUserIds: duplicates the admin chose to move      -> INSERT ... ON CONFLICT DO UPDATE (upsert)
 * All statements run inside one db.transaction() (all-or-nothing): if any statement fails, nothing
 * is written. Idempotency + the one-per-month rule are enforced by the
 * `vendor_selections_user_month_uniq` (userId, forMonth) index, so no read-then-write race. superAdmin only.
 *
 *   POST /api/admin/upload-vendor-selection/commit
 *   (JSON: vendorId, month, preference, createUserIds, overwriteUserIds)
 */

const CHUNK = 500; // rows per statement — well under Postgres' ~65k bind-parameter ceiling

// Required, never defaulted. The column defaults to 'Vegetarian', so omitting it would silently
// record the whole batch as vegetarian and skew the demand analytics for that month.
type Preference = (typeof preferenceEnum.enumValues)[number];
const VALID_PREFERENCES = preferenceEnum.enumValues as readonly string[];

const err = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

export async function POST(req: Request) {
    try {
        const actor = await requireRole(['superAdmin']);

        const body = await req.json().catch(() => null);
        const vendorId: unknown = body?.vendorId;
        const month: unknown = body?.month;
        const preference: unknown = body?.preference;
        const createUserIds: string[] = Array.isArray(body?.createUserIds) ? body.createUserIds : [];
        const overwriteUserIds: string[] = Array.isArray(body?.overwriteUserIds) ? body.overwriteUserIds : [];

        // --- Validate ---
        if (typeof vendorId !== 'string' || !isUuid(vendorId)) return err('A valid vendor is required.', 400);
        const forMonth = monthToUtcDate(typeof month === 'string' ? month : '');
        if (!forMonth) return err('A valid month (YYYY-MM) is required.', 400);
        if (typeof preference !== 'string' || !VALID_PREFERENCES.includes(preference)) {
            return err(`A meal preference is required (${VALID_PREFERENCES.join(', ')}).`, 400);
        }

        const createIds = Array.from(new Set(createUserIds));
        const overwriteIds = Array.from(new Set(overwriteUserIds));
        const allIds = [...createIds, ...overwriteIds];
        if (allIds.some((id) => typeof id !== 'string' || !isUuid(id))) return err('Invalid user id in request.', 400);
        if (allIds.length === 0) return err('Nothing to save — no students selected.', 400);
        if (new Set(allIds).size > MAX_UPLOAD_EMAILS) {
            return err(`Too many students (max ${MAX_UPLOAD_EMAILS.toLocaleString('en-US')} per upload). Split into smaller batches.`, 400);
        }

        // Vendor must exist and be active.
        const [vendor] = await db
            .select({ id: vendors.id })
            .from(vendors)
            .where(and(eq(vendors.id, vendorId), isNull(vendors.deletedAt)));
        if (!vendor) return err('That vendor no longer exists. Please start again.', 404);

        // --- Run every write in one transaction: any failure rolls all of them back ---
        const now = new Date();
        const rowsFor = (ids: string[]) =>
            ids.map((id) => ({ userId: id, vendorId, forMonth, dateofEntry: now, preference: preference as Preference }));
        const chunks = <T>(arr: T[]) => Array.from({ length: Math.ceil(arr.length / CHUNK) }, (_, i) => arr.slice(i * CHUNK, i * CHUNK + CHUNK));

        await db.transaction(async (tx) => {
            // Create picks: only add a selection if the student has none this month (keep existing untouched).
            for (const chunk of chunks(rowsFor(createIds))) {
                await tx.insert(vendorSelections).values(chunk)
                    .onConflictDoNothing({ target: [vendorSelections.userId, vendorSelections.forMonth] });
            }
            // Overwrite picks: move (or create) this month's selection to the chosen vendor. The
            // preference moves with it — leaving the old one behind would silently keep a stale dietary
            // value against a vendor the admin just reassigned.
            for (const chunk of chunks(rowsFor(overwriteIds))) {
                await tx.insert(vendorSelections).values(chunk)
                    .onConflictDoUpdate({
                        target: [vendorSelections.userId, vendorSelections.forMonth],
                        set: { vendorId, dateofEntry: now, preference: preference as Preference },
                    });
            }
        });

        // Opt-ins changed → refresh every user's cached meal history (all entries share this tag).
        revalidateTag('meal-history');

        console.log(`Vendor selection commit by ${actor.email}: created≤${createIds.length}, overwritten≤${overwriteIds.length}`);
        return NextResponse.json({
            success: true,
            message: 'Vendor selections saved.',
            created: createIds.length,
            overwritten: overwriteIds.length,
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return err('Unauthorized', 401);
            if (error.message === 'Forbidden') return err('Forbidden', 403);
            // FK violation → a selected student no longer exists; the transaction wrote nothing.
            if (error.message.includes('violates foreign key') || error.message.includes('foreign key constraint')) {
                return err('Some selected students no longer exist, so nothing was saved. Please re-verify and try again.', 409);
            }
        }
        console.error('Vendor selection commit failed:', error);
        return err('Something went wrong and nothing was saved. Please try again.', 500);
    }
}
