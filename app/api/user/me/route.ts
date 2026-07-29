import { NextResponse } from 'next/server';
import { getDbUser } from '@/lib/auth-helper';

export async function GET() {
    try {
        const user = await getDbUser();
        if (!user) {
            // middleware.ts gates every /api/* route with auth.protect(), so reaching this handler
            // means a valid Clerk session exists. A null user therefore means "signed in, but not
            // on the roster" — a distinct state from unauthenticated, so the client can show the
            // no-access screen instead of bouncing back to login.
            return NextResponse.json(
                { success: false, code: "not_registered", message: "Your account is not registered for this app." },
                { status: 403 },
            );
        }
        return NextResponse.json({ success: true, user });
    } catch (error: unknown) {
        // Log the detail server-side; never ship query text or internals to the browser.
        console.error("Failed to resolve current user:", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
