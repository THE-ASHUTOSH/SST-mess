import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { vendors, menus } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import generateMenu from '@/lib/utils/generateMenu';
import { and, eq, isNull } from 'drizzle-orm';

/**
 * Menu management endpoint. Updates only a vendor's MENU — the menu URL and the
 * weekly menu (parsed from an uploaded CSV). Vendor details (name, price, meals,
 * add/delete) live in `/api/vendor/manageVendor`.
 *
 *   PUT /api/vendor/updateMenu?id=<vendorId>
 *
 * Accessible to `admin` (and `superAdmin` via the role superset).
 */

class MenuFormError extends Error {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value: string): boolean {
    return UUID_RE.test(value);
}

async function buildMenuDataFromFile(menuFile: File) {
    const buffer = Buffer.from(await menuFile.arrayBuffer());
    const csvContent = buffer.toString('utf-8');
    try {
        return generateMenu(csvContent);
    } catch {
        throw new MenuFormError('Error processing menu file');
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = await requireRole(['admin']);

        const vendorId = req.nextUrl.searchParams.get('id');
        if (!vendorId || !isUuid(vendorId)) {
            return NextResponse.json({ success: false, message: 'A valid vendor id is required' }, { status: 400 });
        }
        console.log('Menu update triggered by user:', user.email);

        const formData = await req.formData();
        const menuUrl = formData.get('menuUrl') as string | null;
        const menuFile = formData.get('menuFile') as File | null;

        // Only active (non-soft-deleted) vendors can have their menu edited.
        const [vendor] = await db.select().from(vendors)
            .where(and(eq(vendors.id, vendorId), isNull(vendors.deletedAt)));
        if (!vendor) {
            return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
        }

        // Parse the CSV first (throws 400 before any write) if one was uploaded.
        if (menuFile) {
            const menuData = await buildMenuDataFromFile(menuFile);
            if (vendor.menuId) {
                await db.update(menus).set({ ...menuData, updatedAt: new Date() }).where(eq(menus.id, vendor.menuId));
            } else {
                const [newMenu] = await db.insert(menus).values(menuData).returning();
                await db.update(vendors).set({ menuId: newMenu.id }).where(eq(vendors.id, vendorId));
            }
        }

        const [updatedVendor] = await db.update(vendors)
            .set({ menuUrl: menuUrl?.trim() || null, updatedAt: new Date() })
            .where(eq(vendors.id, vendorId))
            .returning();

        revalidateTag('vendors');
        return NextResponse.json({ success: true, message: 'Menu updated successfully', vendor: updatedVendor });
    } catch (error: unknown) {
        if (error instanceof MenuFormError) {
            return NextResponse.json({ success: false, message: error.message }, { status: 400 });
        }
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            if (error.message === 'Forbidden') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            return NextResponse.json({ success: false, message: 'Error updating menu', error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: false, message: 'An unknown error occurred while updating menu' }, { status: 500 });
    }
}
