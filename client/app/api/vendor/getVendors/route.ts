import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Vendor from '@/lib/models/vendor.model';
import Menu from '@/lib/models/menu.model'; // Ensure Menu is registered

export async function GET() {
    try {
        await connectDB();
        // Ensure Menu model is registered before population if not already
        // (Just importing it above handles registration)

        const vendors = await Vendor.find().populate({ path: "menu", model: Menu }).lean();
        return NextResponse.json({ success: true, vendor: vendors });
    } catch (err: any) {
        return NextResponse.json({ success: false, err: err.message }, { status: 400 });
    }
}
