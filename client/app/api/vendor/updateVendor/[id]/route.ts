import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Vendor from '@/lib/models/vendor.model';
import Menu from '@/lib/models/menu.model';
import { requireRole } from '@/lib/auth-helper';
import generateMenu from '@/lib/utils/generateMenu';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const user = await requireRole(['admin']);
        console.log("Vendor update triggered by user:", user.email);

        const { id } = await params;
        console.log("Vendor ID:", id);

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

        await connectDB();

        const parsedMealsOptions = mealsOptions ? JSON.parse(mealsOptions) : undefined;
        let menuId = null;

        if (menuFile) {
            const buffer = Buffer.from(await menuFile.arrayBuffer());
            const csvContent = buffer.toString('utf-8');
            const menuData = generateMenu(csvContent);

            const updatedMenu = await Menu.findOneAndUpdate(
                { vendor: id },
                { ...menuData, vendor: id },
                { new: true, upsert: true }
            );
            menuId = updatedMenu._id;

        }

        const updateData: any = {
            name,
            description,
            price: Number(price),
            menuUrl,
        };
        // console.log("Update Data:", updateData);
        if (parsedMealsOptions) updateData.mealsOptions = parsedMealsOptions;
        if (menuId) updateData.menu = menuId;

        const updatedVendor = await Vendor.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        return NextResponse.json({ message: "Vendor updated successfully", vendor: updatedVendor });

    } catch (error: any) {
        if (error.message === "Unauthorized") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (error.message === "Forbidden") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        console.error("Error updating vendor:", error);
        return NextResponse.json({ message: "Error updating vendor", error: error.message }, { status: 500 });
    }
}
