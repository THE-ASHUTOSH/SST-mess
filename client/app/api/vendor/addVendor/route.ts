import { NextResponse } from 'next/server';
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

        if (!name || !price) {
            return NextResponse.json({ message: "All fields are required" }, { status: 400 });
        }

        const parsedMealsOptions = mealsOptions ? JSON.parse(mealsOptions) : undefined;

        const [newVendor] = await db.insert(vendors).values({
            name,
            description,
            price: Number(price),
            menuUrl,
            breakfast: parsedMealsOptions?.breakfast,
            lunch: parsedMealsOptions?.lunch,
            dinner: parsedMealsOptions?.dinner,
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
            return NextResponse.json({ message: "Error processing menu file", menuError }, { status: 500 });
        }

        return NextResponse.json({ message: "Vendor added successfully", vendor: newVendor }, { status: 201 });

    } catch (error: any) {
        if (error.message === "Unauthorized") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (error.message === "Forbidden") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        return NextResponse.json({ message: "Error adding vendor", error: error.message }, { status: 500 });
    }
}
