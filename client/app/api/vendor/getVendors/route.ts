import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const vendors = await db.query.vendors.findMany({
            with: {
                menu: true,
            },
        });
        return NextResponse.json({ success: true, vendor: vendors });
    } catch (err: any) {
        return NextResponse.json({ success: false, err: err.message }, { status: 400 });
    }
}
