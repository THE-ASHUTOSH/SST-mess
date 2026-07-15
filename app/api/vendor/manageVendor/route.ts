import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { vendors } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { and, eq, isNull } from 'drizzle-orm';

/**
 * Vendor-entity management endpoint (superAdmin only). Handles the vendor record
 * itself — name, description, price, and which meals it serves — plus soft-delete.
 * The vendor's MENU (menu URL + weekly CSV) is managed separately via
 * `PUT /api/vendor/updateMenu?id=<id>`, which admins can also access.
 *
 *   POST   /api/vendor/manageVendor            → create a vendor
 *   PUT    /api/vendor/manageVendor?id=<id>    → update a vendor's details
 *   DELETE /api/vendor/manageVendor?id=<id>    → soft-delete a vendor
 */

interface ParsedVendorForm {
    name: string;
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

async function parseVendorForm(req: Request): Promise<ParsedVendorForm> {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string | null;
    const price = formData.get('price') as string;
    const mealsOptions = formData.get('mealsOptions') as string | null;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new VendorFormError('Vendor name is required');
    }
    if (!price || isNaN(Number(price)) || Number(price) < 0) {
        throw new VendorFormError('Valid price is required');
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
        if (error.message === 'Unauthorized') return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        if (error.message === 'Forbidden') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        return NextResponse.json({ success: false, message: `Error ${action} vendor`, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: false, message: `An unknown error occurred while ${action} vendor` }, { status: 500 });
}

// CREATE
export async function POST(req: NextRequest) {
    try {
        const user = await requireRole(['superAdmin']);
        console.log('Vendor addition triggered by user:', user.email);

        const form = await parseVendorForm(req);

        const [newVendor] = await db.insert(vendors).values({
            name: form.name,
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

// UPDATE (vendor details only — menu is handled by /api/vendor/updateMenu)
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

        const updateData: Partial<(typeof vendors)['$inferInsert']> = {
            name: form.name,
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
