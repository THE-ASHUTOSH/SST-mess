import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { users, vendors, vendorSelections } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { and, eq, isNull } from 'drizzle-orm';
import { isUuid, monthToUtcDate } from '@/lib/vendor-selection-upload';

/**
 * Change or remove ONE student's vendor selection for a given month (superAdmin ONLY).
 *
 *   PATCH  /api/admin/students/selection   { userId, month: "YYYY-MM", vendorId }
 *          → upsert on (userId, forMonth): create the opt-in if missing, else move it to vendorId.
 *   DELETE /api/admin/students/selection?userId=<id>&month=YYYY-MM
 *          → HARD-delete that month's selection row (irreversible; the student becomes not opted-in).
 *
 * Opt-ins changed → revalidateTag('meal-history') so cached student histories refresh.
 */

const err = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

function mapAuthError(error: unknown): NextResponse | null {
    if (error instanceof Error) {
        if (error.message === 'Unauthorized') return err('Unauthorized', 401);
        if (error.message === 'Forbidden') return err('Forbidden', 403);
    }
    return null;
}

export async function PATCH(req: NextRequest) {
    try {
        const actor = await requireRole(['superAdmin']);

        const body = await req.json().catch(() => null);
        const userId: unknown = body?.userId;
        const vendorId: unknown = body?.vendorId;
        const month: unknown = body?.month;

        if (typeof userId !== 'string' || !isUuid(userId)) return err('A valid student id is required.', 400);
        if (typeof vendorId !== 'string' || !isUuid(vendorId)) return err('A valid vendor is required.', 400);
        const forMonth = monthToUtcDate(typeof month === 'string' ? month : '');
        if (!forMonth) return err('A valid month (YYYY-MM) is required.', 400);

        // Vendor must exist and be active.
        const [vendor] = await db
            .select({ id: vendors.id, name: vendors.name })
            .from(vendors)
            .where(and(eq(vendors.id, vendorId), isNull(vendors.deletedAt)));
        if (!vendor) return err('That vendor no longer exists.', 404);

        // Student must exist.
        const [student] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
        if (!student) return err('That student no longer exists.', 404);

        const now = new Date();
        // Upsert keeps the one-per-month rule (unique index) and preserves the student's preference.
        await db
            .insert(vendorSelections)
            .values({ userId, vendorId, forMonth, dateofEntry: now })
            .onConflictDoUpdate({
                target: [vendorSelections.userId, vendorSelections.forMonth],
                set: { vendorId, dateofEntry: now },
            });

        revalidateTag('meal-history');
        console.log(`Selection for student ${userId} (${month}) set to vendor ${vendor.name} by ${actor.email}`);
        return NextResponse.json({ success: true, message: 'Selection updated.', vendorId: vendor.id, vendorName: vendor.name });
    } catch (error: unknown) {
        const authErr = mapAuthError(error);
        if (authErr) return authErr;
        console.error('Failed to update selection:', error);
        return err('Failed to update the selection.', 500);
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const actor = await requireRole(['superAdmin']);

        const sp = req.nextUrl.searchParams;
        const userId = sp.get('userId') ?? '';
        if (!isUuid(userId)) return err('A valid student id is required.', 400);
        const forMonth = monthToUtcDate(sp.get('month') ?? '');
        if (!forMonth) return err('A valid month (YYYY-MM) is required.', 400);

        const deleted = await db
            .delete(vendorSelections)
            .where(and(eq(vendorSelections.userId, userId), eq(vendorSelections.forMonth, forMonth)))
            .returning({ id: vendorSelections.id });

        revalidateTag('meal-history');
        console.log(`Selection for student ${userId} (${sp.get('month')}) deleted (${deleted.length}) by ${actor.email}`);
        return NextResponse.json({
            success: true,
            deleted: deleted.length,
            message: deleted.length ? 'Selection removed.' : 'No selection existed for that month.',
        });
    } catch (error: unknown) {
        const authErr = mapAuthError(error);
        if (authErr) return authErr;
        console.error('Failed to delete selection:', error);
        return err('Failed to remove the selection.', 500);
    }
}
