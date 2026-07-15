import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, roleEnum } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { and, asc, eq, ilike, inArray, or } from 'drizzle-orm';

/**
 * User administration endpoint — superAdmin ONLY. Lets a superAdmin view users and
 * change their role. This is a privileged surface: every method is gated by
 * requireRole(['superAdmin']) (the real security boundary; the UI guard is cosmetic).
 *
 *   GET   /api/admin/users?search=<q>   → search users by email/name (or list privileged users)
 *   PATCH /api/admin/users?id=<userId>  → change a user's role   body: { role }
 */

type Role = (typeof roleEnum.enumValues)[number];
const VALID_ROLES = roleEnum.enumValues as readonly string[];
const PRIVILEGED_ROLES: Role[] = ['admin', 'vendor', 'superAdmin'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Columns exposed to the panel — never select more than the UI needs.
const publicColumns = {
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    roll: users.roll,
    hostel: users.hostel,
    batch: users.batch,
};

function mapError(error: unknown, action: string) {
    if (error instanceof Error) {
        if (error.message === 'Unauthorized') return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        if (error.message === 'Forbidden') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        return NextResponse.json({ success: false, message: `Error ${action}`, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: false, message: `An unknown error occurred while ${action}` }, { status: 500 });
}

// LIST / SEARCH
export async function GET(req: NextRequest) {
    try {
        await requireRole(['superAdmin']);

        const search = req.nextUrl.searchParams.get('search')?.trim();

        // With a query: match email OR name (case-insensitive). Without: show the current
        // privileged users (admins / vendors / superAdmins) as the default working set.
        // Escape LIKE metacharacters (% and _) so they match literally rather than as wildcards.
        const term = search ? `%${search.replace(/[\\%_]/g, '\\$&')}%` : '';
        const whereClause = search
            ? or(ilike(users.email, term), ilike(users.name, term))
            : inArray(users.role, PRIVILEGED_ROLES);

        const rows = await db
            .select(publicColumns)
            .from(users)
            .where(whereClause)
            .orderBy(asc(users.name))
            .limit(100);

        return NextResponse.json({ success: true, users: rows });
    } catch (error) {
        return mapError(error, 'listing users');
    }
}

// CHANGE ROLE
export async function PATCH(req: NextRequest) {
    try {
        const actor = await requireRole(['superAdmin']);

        const targetId = req.nextUrl.searchParams.get('id');
        if (!targetId || !UUID_RE.test(targetId)) {
            return NextResponse.json({ success: false, message: 'A valid user id is required' }, { status: 400 });
        }

        const body = await req.json().catch(() => null);
        const role = body?.role;
        if (typeof role !== 'string' || !VALID_ROLES.includes(role)) {
            return NextResponse.json({ success: false, message: 'A valid role is required' }, { status: 400 });
        }

        // Guard against self-lockout: a superAdmin cannot change their own role.
        // Compare case-insensitively — UUIDs are case-insensitive in Postgres and UUID_RE
        // accepts uppercase, so a raw `===` could otherwise be bypassed by uppercasing the id.
        if (targetId.toLowerCase() === actor.id.toLowerCase()) {
            return NextResponse.json({ success: false, message: 'You cannot change your own role' }, { status: 400 });
        }

        const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetId));
        if (!target) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }

        const [updated] = await db
            .update(users)
            .set({ role: role as Role })
            .where(and(eq(users.id, targetId)))
            .returning(publicColumns);

        console.log(`Role for user ${updated.email} changed to ${role} by ${actor.email}`);
        return NextResponse.json({ success: true, message: 'Role updated successfully', user: updated });
    } catch (error) {
        return mapError(error, 'updating user role');
    }
}
