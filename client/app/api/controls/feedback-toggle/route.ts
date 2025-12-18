import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { controls } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { eq } from 'drizzle-orm';

export async function GET() {
    try {
        const [feedbackToggle] = await db.select().from(controls).where(eq(controls.name, 'feedbackToggle'));
        if (!feedbackToggle) {
            const [newToggle] = await db.insert(controls).values({ name: 'feedbackToggle', enabled: false }).returning();
            return NextResponse.json({ enabled: newToggle.enabled });
        }
        return NextResponse.json({ enabled: feedbackToggle.enabled });
    } catch (error: any) {
        return NextResponse.json({ message: 'Error fetching feedback toggle', error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const user = await requireRole(['admin']);

        let [feedbackToggle] = await db.select().from(controls).where(eq(controls.name, 'feedbackToggle'));

        if (feedbackToggle) {
            [feedbackToggle] = await db.update(controls)
                .set({ enabled: !feedbackToggle.enabled })
                .where(eq(controls.id, feedbackToggle.id))
                .returning();
        } else {
            [feedbackToggle] = await db.insert(controls)
                .values({ name: 'feedbackToggle', enabled: true })
                .returning();
        }

        console.log(`Feedback toggle set to ${feedbackToggle.enabled} by ${user.email}`);
        return NextResponse.json({ enabled: feedbackToggle.enabled });

    } catch (error: any) {
        if (error.message === "Unauthorized") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (error.message === "Forbidden") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        return NextResponse.json({ message: 'Error toggling feedback toggle', error: error.message }, { status: 500 });
    }
}
