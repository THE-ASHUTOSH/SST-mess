import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { vendors, vendorSelections } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { isUuid, MAX_UPLOAD_EMAILS, monthToUtcDate } from '@/lib/vendor-selection-upload';

/**
 * Commit step of the per-vendor bulk selection upload. Takes the user ids the admin approved in
 * the verify/review step and writes them in bulk (a few queries total, no per-row round-trips):
 *  - createUserIds:    students with no selection this month -> insert a selection for this vendor
 *  - overwriteUserIds: students who already have a selection this month -> move it to this vendor
 * Re-checks current DB state so it stays correct/idempotent even if things changed since verify.
 * superAdmin only.
 *
 *   POST /api/admin/upload-vendor-selection/commit   (JSON: vendorId, month, createUserIds, overwriteUserIds)
 */

const CHUNK = 500;

export async function POST(req: Request) {
    try {
        const actor = await requireRole(['superAdmin']);

        const body = await req.json().catch(() => null);
        const vendorId: unknown = body?.vendorId;
        const month: unknown = body?.month;
        const createUserIds: string[] = Array.isArray(body?.createUserIds) ? body.createUserIds : [];
        const overwriteUserIds: string[] = Array.isArray(body?.overwriteUserIds) ? body.overwriteUserIds : [];

        if (typeof vendorId !== 'string' || !isUuid(vendorId)) {
            return NextResponse.json({ success: false, message: 'A valid vendor is required' }, { status: 400 });
        }
        const forMonth = monthToUtcDate(typeof month === 'string' ? month : '');
        if (!forMonth) {
            return NextResponse.json({ success: false, message: 'A valid month (YYYY-MM) is required' }, { status: 400 });
        }
        const allIds = [...createUserIds, ...overwriteUserIds];
        if (allIds.some((id) => typeof id !== 'string' || !isUuid(id))) {
            return NextResponse.json({ success: false, message: 'Invalid user id in request' }, { status: 400 });
        }
        if (allIds.length === 0) {
            return NextResponse.json({ success: false, message: 'Nothing to save' }, { status: 400 });
        }
        if (new Set(allIds).size > MAX_UPLOAD_EMAILS) {
            return NextResponse.json(
                { success: false, message: `Too many students (max ${MAX_UPLOAD_EMAILS.toLocaleString('en-US')} per upload). Please split into smaller batches.` },
                { status: 400 },
            );
        }

        const [vendor] = await db
            .select({ id: vendors.id })
            .from(vendors)
            .where(and(eq(vendors.id, vendorId), isNull(vendors.deletedAt)));
        if (!vendor) {
            return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
        }

        // Re-derive who currently has a selection this month (idempotent against changes since verify).
        const involved = Array.from(new Set(allIds));
        const existing = await db
            .select({ userId: vendorSelections.userId })
            .from(vendorSelections)
            .where(and(eq(vendorSelections.forMonth, forMonth), inArray(vendorSelections.userId, involved)));
        const hasSelection = new Set(existing.map((e) => e.userId));

        // Insert for users with no selection yet (create picks + any overwrite pick that lost its row).
        const insertIds = Array.from(new Set([...createUserIds, ...overwriteUserIds])).filter((id) => !hasSelection.has(id));
        // Overwrite only users that actually have a selection to move.
        const overwriteIds = Array.from(new Set(overwriteUserIds)).filter((id) => hasSelection.has(id));

        let created = 0;
        let overwritten = 0;

        if (insertIds.length) {
            const now = new Date();
            const values = insertIds.map((id) => ({
                userId: id,
                vendorId,
                forMonth,
                dateofEntry: now,
            }));

            for (let i = 0; i < values.length; i += CHUNK) {
                const chunk = values.slice(i, i + CHUNK);
                await db.insert(vendorSelections).values(chunk);
                created += chunk.length;
            }
        }

        if (overwriteIds.length) {
            // One bulk update moves every approved duplicate to the chosen vendor.
            await db
                .update(vendorSelections)
                .set({ vendorId, dateofEntry: new Date() })
                .where(and(eq(vendorSelections.forMonth, forMonth), inArray(vendorSelections.userId, overwriteIds)));
            overwritten = overwriteIds.length;
        }

        // Opt-ins changed → refresh every user's cached meal history (all entries share this tag).
        revalidateTag('meal-history');

        console.log(`Vendor selection commit by ${actor.email}: created=${created}, overwritten=${overwritten}`);
        return NextResponse.json({
            success: true,
            message: 'Vendor selections saved.',
            created,
            overwritten,
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            if (error.message === 'Forbidden') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }
        console.error('Vendor selection commit failed:', error);
        return NextResponse.json({ success: false, message: 'Failed to save vendor selections' }, { status: 500 });
    }
}
