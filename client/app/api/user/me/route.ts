import { NextResponse } from 'next/server';
import { getDbUser } from '@/lib/auth-helper';

export async function GET() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ user });
    } catch (error: any) {
        return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 });
    }
}
