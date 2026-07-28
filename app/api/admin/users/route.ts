import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, roleEnum, meals, vendorFeedbacks, vendorSelections, vendors } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { ALLOWED_EMAIL_DOMAINS_LABEL, isAllowedEmailDomain } from '@/lib/email-domains';
import { and, asc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';

/**
 * User administration endpoint — superAdmin ONLY. Lets a superAdmin view users, create and
 * remove staff accounts, and change roles. This is a privileged surface: every method is gated
 * by requireRole(['superAdmin']) (the real security boundary; the UI guard is cosmetic).
 *
 *   GET    /api/admin/users?search=<q>   → search users by email/name (or list privileged users)
 *   POST   /api/admin/users              → create an account       body: { email, name, role }
 *   PATCH  /api/admin/users?id=<userId>  → change a user's role    body: { role }
 *   DELETE /api/admin/users?id=<userId>  → remove an account
 *
 * Since getDbUser() no longer auto-creates on login, POST here is the ONLY way an
 * admin/superAdmin/vendor account comes into existence. Students are not managed here — they
 * come from the roster and are deliberately neither creatable nor removable through this panel.
 */

type Role = (typeof roleEnum.enumValues)[number];
const PRIVILEGED_ROLES: Role[] = ['admin', 'vendor', 'superAdmin'];

// The only roles this panel may assign, on create OR on change. 'student' is excluded on purpose
// — the roster owns students, so nobody can be created as one or demoted into one here.
const ASSIGNABLE_ROLES: readonly string[] = ['admin', 'superAdmin', 'vendor'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 120;

// Columns exposed to the panel — never select more than the UI needs.
const publicColumns = {
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    roll: users.roll,
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

// CREATE
export async function POST(req: NextRequest) {
    try {
        const actor = await requireRole(['superAdmin']);

        const body = await req.json().catch(() => null);
        const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
        const rawName = typeof body?.name === 'string' ? body.name.trim() : '';
        const role = body?.role;

        if (!rawEmail || !EMAIL_RE.test(rawEmail)) {
            return NextResponse.json({ success: false, message: 'A valid email is required' }, { status: 400 });
        }
        // Sign-in is domain-restricted Google SSO, so an outside address could never log in.
        if (!isAllowedEmailDomain(rawEmail)) {
            return NextResponse.json(
                { success: false, message: `Email must be an ${ALLOWED_EMAIL_DOMAINS_LABEL} address` },
                { status: 400 },
            );
        }
        if (!rawName || rawName.length > MAX_NAME_LENGTH) {
            return NextResponse.json(
                { success: false, message: `A name is required (max ${MAX_NAME_LENGTH} characters)` },
                { status: 400 },
            );
        }
        if (typeof role !== 'string' || !ASSIGNABLE_ROLES.includes(role)) {
            return NextResponse.json(
                { success: false, message: `Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}` },
                { status: 400 },
            );
        }

        // Match case-insensitively so an existing mixed-case row is still detected as a duplicate.
        const [existing] = await db
            .select({ id: users.id, role: users.role })
            .from(users)
            .where(sql`lower(${users.email}) = ${rawEmail}`)
            .limit(1);

        if (existing) {
            return NextResponse.json(
                { success: false, message: 'An account with this email already exists. Change their role instead.' },
                { status: 409 },
            );
        }

        const [created] = await db
            .insert(users)
            .values({ email: rawEmail, name: rawName, role: role as Role })
            .returning(publicColumns);

        console.log(`User ${created.email} created as ${created.role} by ${actor.email}`);
        return NextResponse.json({ success: true, message: 'User created successfully', user: created }, { status: 201 });
    } catch (error) {
        return mapError(error, 'creating user');
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
        // ASSIGNABLE_ROLES excludes 'student' — the roster owns students, so this panel can
        // neither create one nor demote anyone into one.
        if (typeof role !== 'string' || !ASSIGNABLE_ROLES.includes(role)) {
            return NextResponse.json(
                { success: false, message: `Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}` },
                { status: 400 },
            );
        }

        // Guard against self-lockout: a superAdmin cannot change their own role.
        // Compare case-insensitively — UUIDs are case-insensitive in Postgres and UUID_RE
        // accepts uppercase, so a raw `===` could otherwise be bypassed by uppercasing the id.
        if (targetId.toLowerCase() === actor.id.toLowerCase()) {
            return NextResponse.json({ success: false, message: 'You cannot change your own role' }, { status: 400 });
        }

        const [target] = await db
            .select({ id: users.id, email: users.email, role: users.role })
            .from(users)
            .where(eq(users.id, targetId));
        if (!target) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }

        // A user holds exactly one role, so moving a vendor operator to another role would leave
        // a vendor entity pointing at an account that can no longer sign in as a vendor. The
        // link is by email, not a foreign key, so nothing else would catch it.
        if (target.role === 'vendor' && role !== 'vendor') {
            const [claim] = await db
                .select({ name: vendors.name })
                .from(vendors)
                .where(and(sql`lower(${vendors.email}) = ${target.email.toLowerCase()}`, isNull(vendors.deletedAt)))
                .limit(1);

            if (claim) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `This account operates vendor "${claim.name}". Unlink it under Manage Vendors before changing the role.`,
                    },
                    { status: 409 },
                );
            }
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

// REMOVE
export async function DELETE(req: NextRequest) {
    try {
        const actor = await requireRole(['superAdmin']);

        const targetId = req.nextUrl.searchParams.get('id');
        if (!targetId || !UUID_RE.test(targetId)) {
            return NextResponse.json({ success: false, message: 'A valid user id is required' }, { status: 400 });
        }

        // Same case-insensitive comparison as PATCH — UUID_RE accepts uppercase, so a raw
        // `===` could otherwise be bypassed by uppercasing your own id.
        if (targetId.toLowerCase() === actor.id.toLowerCase()) {
            return NextResponse.json({ success: false, message: 'You cannot remove your own account' }, { status: 400 });
        }

        const [target] = await db
            .select({ id: users.id, email: users.email, name: users.name, role: users.role })
            .from(users)
            .where(eq(users.id, targetId))
            .limit(1);

        if (!target) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }
        if (target.role === 'student') {
            return NextResponse.json(
                { success: false, message: 'Student accounts are managed by the roster and cannot be removed here.' },
                { status: 400 },
            );
        }

        // One HTTP round trip for all four integrity checks (neon-http has no db.transaction).
        // `limit(1)` everywhere — we only need existence, never a count.
        const [mealRows, feedbackRows, selectionRows, vendorRows] = await db.batch([
            db.select({ id: meals.id }).from(meals)
                .where(or(eq(meals.forUserId, targetId), eq(meals.byUserId, targetId))).limit(1),
            db.select({ id: vendorFeedbacks.id }).from(vendorFeedbacks)
                .where(eq(vendorFeedbacks.userId, targetId)).limit(1),
            db.select({ id: vendorSelections.id }).from(vendorSelections)
                .where(eq(vendorSelections.userId, targetId)).limit(1),
            db.select({ name: vendors.name }).from(vendors)
                .where(and(sql`lower(${vendors.email}) = ${target.email.toLowerCase()}`, isNull(vendors.deletedAt)))
                .limit(1),
        ]);

        // A vendor entry points at its user by email, not by FK, so this orphan wouldn't be
        // caught by the database — it would just silently break that vendor's login.
        if (vendorRows.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: `This account is linked to vendor "${vendorRows[0].name}". Unlink it under Manage Vendors first.`,
                },
                { status: 409 },
            );
        }

        // Deleting would either violate the FKs or destroy audit history, so refuse and say why.
        const blockers: string[] = [];
        if (mealRows.length > 0) blockers.push('meal records');
        if (feedbackRows.length > 0) blockers.push('feedback');
        if (selectionRows.length > 0) blockers.push('vendor selections');

        if (blockers.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Cannot remove this account — it has ${blockers.join(', ')} attached. Change their role instead to revoke access.`,
                },
                { status: 409 },
            );
        }

        await db.delete(users).where(eq(users.id, targetId));

        console.log(`User ${target.email} (${target.role}) removed by ${actor.email}`);
        return NextResponse.json({ success: true, message: `${target.name || target.email} removed.` });
    } catch (error) {
        return mapError(error, 'removing user');
    }
}
