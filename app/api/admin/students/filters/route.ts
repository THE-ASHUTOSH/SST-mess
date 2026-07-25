import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, vendors, preferenceEnum } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm';

/**
 * Filter options for the Manage Students page — active vendors (id + name only, never email),
 * plus the distinct batches / hostels actually present on student rows, and the preference enum.
 * superAdmin ONLY.
 *
 *   GET /api/admin/students/filters
 */
export async function GET() {
    try {
        await requireRole(['superAdmin']);

        const [vendorRows, batchRows, hostelRows] = await Promise.all([
            db
                .select({ id: vendors.id, name: vendors.name })
                .from(vendors)
                .where(isNull(vendors.deletedAt))
                .orderBy(asc(vendors.name)),
            db
                .selectDistinct({ batch: users.batch })
                .from(users)
                .where(and(eq(users.role, 'student'), isNotNull(users.batch)))
                .orderBy(asc(users.batch)),
            db
                .selectDistinct({ hostel: users.hostel })
                .from(users)
                .where(and(eq(users.role, 'student'), isNotNull(users.hostel)))
                .orderBy(asc(users.hostel)),
        ]);

        return NextResponse.json({
            success: true,
            vendors: vendorRows,
            batches: batchRows.map((r) => r.batch).filter((b): b is string => !!b),
            hostels: hostelRows.map((r) => r.hostel).filter((h): h is string => !!h),
            preferences: preferenceEnum.enumValues,
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            if (error.message === 'Forbidden') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }
        console.error('Failed to load student filters:', error);
        return NextResponse.json({ success: false, message: 'Failed to load filter options.' }, { status: 500 });
    }
}
