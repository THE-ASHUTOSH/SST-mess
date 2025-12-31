import { NextResponse } from 'next/server';
import { getDbUser } from '@/lib/auth-helper';

export async function GET() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ success: true, user });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return NextResponse.json({ success: false, message: "Server error", error: errorMessage }, { status: 500 });
    }
}
