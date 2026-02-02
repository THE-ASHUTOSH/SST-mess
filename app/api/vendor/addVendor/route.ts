import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { vendors, menus } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import generateMenu from '@/lib/utils/generateMenu';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
    try {
        const user = await requireRole(['admin']);

        console.log("Vendor addition triggered by user:", user.email);


        const formData = await req.formData();
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const price = formData.get('price') as string;
        const menuUrl = formData.get('menuUrl') as string;
        const mealsOptions = formData.get('mealsOptions') as string;
        const menuFile = formData.get('menuFile') as File | null;

        // Validate required fields
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ success: false, message: "Vendor name is required" }, { status: 400 });
        }

        if (!price || isNaN(Number(price)) || Number(price) < 0) {
            return NextResponse.json({ success: false, message: "Valid price is required" }, { status: 400 });
        }

        let parsedMealsOptions;
        if (mealsOptions) {
            try {
                parsedMealsOptions = JSON.parse(mealsOptions);
            } catch {
                return NextResponse.json({ success: false, message: "Invalid mealsOptions format" }, { status: 400 });
            }
        }

        const [newVendor] = await db.insert(vendors).values({
            name: name.trim(),
            description: description?.trim() || null,
            price: Number(price),
            menuUrl: menuUrl?.trim() || null,
            breakfast: parsedMealsOptions?.breakfast ?? true,
            lunch: parsedMealsOptions?.lunch ?? true,
            dinner: parsedMealsOptions?.dinner ?? true,
        }).returning();

        try {
            if (menuFile) {
                const buffer = Buffer.from(await menuFile.arrayBuffer());
                const csvContent = buffer.toString('utf-8');
                const menuData = generateMenu(csvContent);

                const [newMenu] = await db.insert(menus).values({
                    ...menuData,
                }).returning();

                await db.update(vendors).set({ menuId: newMenu.id }).where(eq(vendors.id, newVendor.id));
            }
        } catch (menuError) {
            const errorMessage = menuError instanceof Error ? menuError.message : "Unknown error";
            return NextResponse.json({ success: false, message: "Error processing menu file", error: errorMessage }, { status: 500 });
        }

        revalidateTag('vendors');
        return NextResponse.json({ success: true, message: "Vendor added successfully", vendor: newVendor }, { status: 201 });

    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
            if (error.message === "Forbidden") return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
            return NextResponse.json({ success: false, message: "Error adding vendor", error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: false, message: "An unknown error occurred while adding vendor" }, { status: 500 });
    }
}
