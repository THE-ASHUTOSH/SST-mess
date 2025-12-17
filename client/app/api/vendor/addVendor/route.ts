import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Vendor from '@/lib/models/vendor.model';
import Menu from '@/lib/models/menu.model';
import { requireRole } from '@/lib/auth-helper';
import generateMenu from '@/lib/utils/generateMenu';

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

        await connectDB();

        const parsedMealsOptions = mealsOptions ? JSON.parse(mealsOptions) : undefined;

        const newVendor = new Vendor({
            name,
            description,
            price: Number(price),
            menuUrl,
            mealsOptions: parsedMealsOptions,
        });

        let menuId = null;
        try {
            if (menuFile) {
                const buffer = Buffer.from(await menuFile.arrayBuffer());
                const csvContent = buffer.toString('utf-8');
                const menuData = generateMenu(csvContent);

                const newMenu = new Menu({
                    ...menuData,
                    vendor: newVendor._id,
                });
                await newMenu.save();
                menuId = newMenu._id;
            }
        } catch (menuError) {
            return NextResponse.json({ message: "Error processing menu file", menuError }, { status: 500 });
        }

        newVendor.menu = menuId;
        await newVendor.save();

        return NextResponse.json({ message: "Vendor added successfully", vendor: newVendor }, { status: 201 });

    } catch (error: any) {
        if (error.message === "Unauthorized") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (error.message === "Forbidden") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        return NextResponse.json({ message: "Error adding vendor", error: error.message }, { status: 500 });
    }
}
