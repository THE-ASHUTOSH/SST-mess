import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vendors, menus } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import generateMenu from '@/lib/utils/generateMenu';
import { eq } from 'drizzle-orm';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const user = await requireRole(['admin']);
        console.log("Vendor update triggered by user:", user.email);

        const { id } = params;
        const vendorId = id;

        const formData = await req.formData();
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const price = formData.get('price') as string;
        const menuUrl = formData.get('menuUrl') as string;
        const mealsOptions = formData.get('mealsOptions') as string;
        const menuFile = formData.get('menuFile') as File | null;

        if (!name || !price) {
            return NextResponse.json({ message: "Name and price are required" }, { status: 400 });
        }

        const parsedMealsOptions = mealsOptions ? JSON.parse(mealsOptions) : undefined;
        // Map parsedMealsOptions (e.g. { breakfast: true, ... }) to separate columns if needed.
        // Vendor table columns: breakfast, lunch, dinner.

        if (menuFile) {
            const buffer = Buffer.from(await menuFile.arrayBuffer());
            const csvContent = buffer.toString('utf-8');
            const menuData = generateMenu(csvContent);
            
            // Get vendor to check for existing menu
            const [vendor] = await db.select().from(vendors).where(eq(vendors.id, vendorId));

            if (vendor && vendor.menuId) {
                // Update existing menu
                await db.update(menus).set(menuData).where(eq(menus.id, vendor.menuId));
            } else {
                // Insert new menu and update vendor
                const [newMenu] = await db.insert(menus).values(menuData).returning();
                await db.update(vendors).set({ menuId: newMenu.id }).where(eq(vendors.id, vendorId));
            }
        }

        const updateData: any = {
            name,
            description,
            price: Number(price),
            menuUrl,
            updatedAt: new Date(),
        };

        if (parsedMealsOptions) {
            if (parsedMealsOptions.breakfast !== undefined) updateData.breakfast = parsedMealsOptions.breakfast;
            if (parsedMealsOptions.lunch !== undefined) updateData.lunch = parsedMealsOptions.lunch;
            if (parsedMealsOptions.dinner !== undefined) updateData.dinner = parsedMealsOptions.dinner;
        }

        // We don't need to update 'menu' field on vendor as it's implied via relation, unless we really want it.
        // The schema doesn't have it.

        const [updatedVendor] = await db.update(vendors)
            .set(updateData)
            .where(eq(vendors.id, vendorId))
            .returning();

        return NextResponse.json({ message: "Vendor updated successfully", vendor: updatedVendor });

    } catch (error: any) {
        if (error.message === "Unauthorized") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (error.message === "Forbidden") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        return NextResponse.json({ message: "Error updating vendor", error: error.message }, { status: 500 });
    }
}
