import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { users, vendors } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { and, eq, isNull, sql } from 'drizzle-orm';

/**
 * Vendor-entity management endpoint (superAdmin only). Handles the vendor record
 * itself — name, description, price, and which meals it serves — plus soft-delete.
 * The vendor's MENU (menu URL + weekly CSV) is managed separately via
 * `/api/vendor/menu?vendorId=<id>`, which admins can also access.
 *
 *   POST   /api/vendor/manageVendor            → create a vendor
 *   PUT    /api/vendor/manageVendor?id=<id>    → update a vendor's details
 *   DELETE /api/vendor/manageVendor?id=<id>    → soft-delete a vendor
 */

interface ParsedVendorForm {
    name: string;
    email: string | null;
    description: string | null;
    price: number;
    mealsOptions?: { breakfast?: boolean; lunch?: boolean; dinner?: boolean };
}

// Client-side (400) validation failure, distinct from server errors.
class VendorFormError extends Error {}

// vendors.id is a Postgres uuid column; reject malformed ids up front so a bad
// value is a 400, not a Postgres "invalid input syntax for type uuid" 500.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value: string): boolean {
    return UUID_RE.test(value);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function parseVendorForm(req: Request): Promise<ParsedVendorForm> {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string | null;
    const description = formData.get('description') as string | null;
    const price = formData.get('price') as string;
    const mealsOptions = formData.get('mealsOptions') as string | null;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new VendorFormError('Vendor name is required');
    }
    if (!price || isNaN(Number(price)) || Number(price) < 0) {
        throw new VendorFormError('Valid price is required');
    }

    // Email is optional; when present it must be well-formed. Stored lowercased so the
    // vendor↔user mapping (getVendorForEmail) and the active-unique index are consistent.
    let normalizedEmail: string | null = null;
    if (email && email.trim()) {
        normalizedEmail = email.trim().toLowerCase();
        if (!EMAIL_RE.test(normalizedEmail)) {
            throw new VendorFormError('Invalid vendor email');
        }
    }

    let parsedMealsOptions: ParsedVendorForm['mealsOptions'];
    if (mealsOptions) {
        try {
            parsedMealsOptions = JSON.parse(mealsOptions);
        } catch {
            throw new VendorFormError('Invalid mealsOptions format');
        }
    }

    return {
        name: name.trim(),
        email: normalizedEmail,
        description: description?.trim() || null,
        price: Number(price),
        mealsOptions: parsedMealsOptions,
    };
}

function mapError(error: unknown, action: string) {
    if (error instanceof VendorFormError) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    if (error instanceof Error) {
        // Duplicate active vendor email hits the partial unique index — surface a clean 400.
        if (error.message.includes('vendors_email_active_unique')) {
            return NextResponse.json({ success: false, message: 'This email is already linked to another vendor.' }, { status: 400 });
        }
        if (error.message === 'Unauthorized') return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        if (error.message === 'Forbidden') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        return NextResponse.json({ success: false, message: `Error ${action} vendor`, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: false, message: `An unknown error occurred while ${action} vendor` }, { status: 500 });
}

/**
 * A vendor entity is bound to a login account that ALREADY exists with role 'vendor'.
 *
 * This endpoint deliberately creates and promotes nobody: accounts come only from the superAdmin
 * user panel, so the vendor form can never conjure a `users` row as a side effect. Rejects when
 * the account is missing, is not a vendor, or is already claimed by another active vendor.
 *
 * `email` is already lowercased by parseVendorForm. Pass `currentVendorId` when editing so the
 * vendor's own existing link doesn't read as a conflict.
 */
async function assertLinkableVendorAccount(email: string | null, currentVendorId?: string): Promise<void> {
    if (!email) return;

    // Both lookups concurrently — read-only existence checks, so they need no transaction.
    const [accountRows, claimRows] = await Promise.all([
        db.select({ id: users.id, role: users.role }).from(users)
            .where(sql`lower(${users.email}) = ${email}`).limit(1),
        db.select({ id: vendors.id, name: vendors.name }).from(vendors)
            .where(and(sql`lower(${vendors.email}) = ${email}`, isNull(vendors.deletedAt))).limit(1),
    ]);

    const account = accountRows[0];
    if (!account) {
        throw new VendorFormError(
            'No account exists for that email. Add it under Admin Controls → User Management first.',
        );
    }
    if (account.role !== 'vendor') {
        throw new VendorFormError(
            `That account has the role "${account.role}". Change it to vendor under User Management first.`,
        );
    }

    const claim = claimRows[0];
    if (claim && claim.id !== currentVendorId) {
        throw new VendorFormError(`That account is already linked to vendor "${claim.name}".`);
    }
}

// CREATE
export async function POST(req: NextRequest) {
    try {
        const user = await requireRole(['superAdmin']);
        console.log('Vendor addition triggered by user:', user.email);

        const form = await parseVendorForm(req);
        await assertLinkableVendorAccount(form.email);

        const [newVendor] = await db.insert(vendors).values({
            name: form.name,
            email: form.email,
            description: form.description,
            price: form.price,
            breakfast: form.mealsOptions?.breakfast ?? true,
            lunch: form.mealsOptions?.lunch ?? true,
            dinner: form.mealsOptions?.dinner ?? true,
        }).returning();

        revalidateTag('vendors');
        return NextResponse.json({ success: true, message: 'Vendor added successfully', vendor: newVendor }, { status: 201 });
    } catch (error) {
        return mapError(error, 'adding');
    }
}

// UPDATE (vendor details only — menu is handled by /api/vendor/menu)
export async function PUT(req: NextRequest) {
    try {
        const user = await requireRole(['superAdmin']);

        const vendorId = req.nextUrl.searchParams.get('id');
        if (!vendorId || !isUuid(vendorId)) {
            return NextResponse.json({ success: false, message: 'A valid vendor id is required' }, { status: 400 });
        }
        console.log('Vendor update triggered by user:', user.email);

        const form = await parseVendorForm(req);

        // Only active (non-soft-deleted) vendors are editable.
        const [vendor] = await db.select().from(vendors)
            .where(and(eq(vendors.id, vendorId), isNull(vendors.deletedAt)));
        if (!vendor) {
            return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
        }

        // Only re-validate when the link actually changes. Leaving an existing link untouched
        // must keep working even if that account was since removed or demoted — otherwise a
        // legacy vendor becomes uneditable and you couldn't even fix its name or price.
        const emailChanged = (form.email ?? '') !== (vendor.email?.toLowerCase() ?? '');
        if (emailChanged) {
            await assertLinkableVendorAccount(form.email, vendorId);
        }

        const updateData: Partial<(typeof vendors)['$inferInsert']> = {
            name: form.name,
            email: form.email,
            description: form.description,
            price: form.price,
            updatedAt: new Date(),
        };
        if (form.mealsOptions) {
            if (form.mealsOptions.breakfast !== undefined) updateData.breakfast = form.mealsOptions.breakfast;
            if (form.mealsOptions.lunch !== undefined) updateData.lunch = form.mealsOptions.lunch;
            if (form.mealsOptions.dinner !== undefined) updateData.dinner = form.mealsOptions.dinner;
        }

        const [updatedVendor] = await db.update(vendors).set(updateData).where(eq(vendors.id, vendorId)).returning();

        revalidateTag('vendors');
        return NextResponse.json({ success: true, message: 'Vendor updated successfully', vendor: updatedVendor });
    } catch (error) {
        return mapError(error, 'updating');
    }
}

// DELETE (soft-delete: sets deletedAt so the row is hidden but FKs/history remain intact)
export async function DELETE(req: NextRequest) {
    try {
        const user = await requireRole(['superAdmin']);

        const vendorId = req.nextUrl.searchParams.get('id');
        if (!vendorId || !isUuid(vendorId)) {
            return NextResponse.json({ success: false, message: 'A valid vendor id is required' }, { status: 400 });
        }
        console.log('Vendor deletion triggered by user:', user.email);

        const [vendor] = await db.select().from(vendors)
            .where(and(eq(vendors.id, vendorId), isNull(vendors.deletedAt)));
        if (!vendor) {
            return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
        }

        const now = new Date();
        const [deletedVendor] = await db.update(vendors)
            .set({ deletedAt: now, updatedAt: now })
            .where(eq(vendors.id, vendorId))
            .returning();

        revalidateTag('vendors');
        return NextResponse.json({ success: true, message: 'Vendor deleted successfully', vendor: deletedVendor });
    } catch (error) {
        return mapError(error, 'deleting');
    }
}
