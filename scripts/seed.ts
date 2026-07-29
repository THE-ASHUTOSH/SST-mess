/**
 * Dev seed — populates a DEV database with realistic fixtures across every role so a new developer
 * can explore the whole app. See docs/DEVELOPMENT.md.
 *
 *   npx tsx scripts/seed.ts --yes
 *
 * SAFETY: reads DATABASE_URL from .env.local and WIPES the domain tables before re-inserting.
 * It refuses to run without an explicit confirm and prints the target host so you can verify it's
 * your dev branch — NEVER point .env.local at production when running this.
 */
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../lib/db/schema';

const { users, menus, vendors, meals, controls, vendorSelections, vendorFeedbacks } = schema;

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('✗ DATABASE_URL is not set in .env.local. Aborting.');
        process.exit(1);
    }

    const host = (() => {
        try { return new URL(url).host; } catch { return '(unparseable host)'; }
    })();

    const confirmed = process.argv.includes('--yes') || process.env.SEED_CONFIRM === '1';
    console.log(`\nTarget database host: ${host}`);
    if (!confirmed) {
        console.error(
            '\n✗ Refusing to seed without confirmation (this WIPES the domain tables).\n' +
            '  Verify the host above is your DEV branch, then re-run with:  npx tsx scripts/seed.ts --yes\n',
        );
        process.exit(1);
    }

    const devEmail = (process.env.DEV_SEED_EMAIL || '').toLowerCase().trim();
    if (!devEmail) {
        console.error('✗ Set DEV_SEED_EMAIL in .env.local (your login email) so you can explore every role. Aborting.');
        process.exit(1);
    }

    const db = drizzle(neon(url), { schema });
    console.log(`Seeding as dev email: ${devEmail}\n`);

    // --- Clear (delete referencing tables first to satisfy FKs) ---
    await db.delete(meals);
    await db.delete(vendorSelections);
    await db.delete(vendorFeedbacks);
    await db.delete(vendors);
    await db.delete(menus);
    await db.delete(users);
    await db.delete(controls);
    console.log('• Cleared existing domain data');

    // --- Menus (one per demo vendor) ---
    const week = (b: string[], l: string[], d: string[]) => ({ breakfast: b, lunch: l, dinner: d });
    const sampleMenu = {
        monday: week(['Idli', 'Sambar'], ['Rice', 'Dal', 'Paneer'], ['Roti', 'Rajma']),
        tuesday: week(['Poha'], ['Rice', 'Chicken Curry'], ['Roti', 'Aloo Gobi']),
        wednesday: week(['Upma'], ['Rice', 'Sambar', 'Egg Curry'], ['Roti', 'Chana Masala']),
        thursday: week(['Dosa'], ['Rice', 'Dal', 'Fish Fry'], ['Roti', 'Mixed Veg']),
        friday: week(['Paratha'], ['Rice', 'Rajma'], ['Roti', 'Paneer Butter Masala']),
        saturday: week(['Bread & Jam'], ['Fried Rice', 'Manchurian'], ['Roti', 'Dal Tadka']),
        sunday: week(['Puri', 'Bhaji'], ['Biryani', 'Raita'], ['Roti', 'Kadai Veg']),
    };
    const [menuA, menuB] = await db.insert(menus).values([{ ...sampleMenu }, { ...sampleMenu }]).returning();

    // --- Vendors (their own demo login emails — NOT the dev's email) ---
    const [vendorA, vendorB] = await db.insert(vendors).values([
        { name: 'Demo Mess A (Sodexo)', email: 'demo-vendor-a@scaler.com', description: 'Primary demo vendor', price: 3000, menuId: menuA.id },
        { name: "Demo Mess B (Gaura's)", email: 'demo-vendor-b@scaler.com', description: 'Second demo vendor', price: 2800, menuId: menuB.id },
    ]).returning();

    // --- Users: your email is ONLY the superAdmin (not a vendor). Demo vendor/admin users are
    //     separate accounts mapped to the demo vendors above. ---
    const [devUser] = await db.insert(users).values({
        email: devEmail, name: 'Dev (You)', role: 'superAdmin', batch: 'B1',
    }).returning();

    await db.insert(users).values([
        { email: 'demo-admin@scaler.com', name: 'Demo Admin', role: 'admin' },
        { email: 'demo-vendor-a@scaler.com', name: 'Demo Vendor A', role: 'vendor' },
        { email: 'demo-vendor-b@scaler.com', name: 'Demo Vendor B', role: 'vendor' },
    ]);

    const studentRows = Array.from({ length: 6 }, (_, i) => ({
        email: `demo-student-${i + 1}@scaler.com`,
        name: `Demo Student ${i + 1}`,
        role: 'student' as const,
        batch: i % 2 === 0 ? 'B1' : 'B2',
    }));
    const students = await db.insert(users).values(studentRows).returning();

    // --- Vendor selections (current month, UTC) — split students across the two vendors ---
    const now = new Date();
    const forMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const prefs = ['Vegetarian', 'Non-Vegetarian', 'Eggetarian'] as const;
    await db.insert(vendorSelections).values(
        students.map((s, i) => ({
            userId: s.id,
            vendorId: i % 2 === 0 ? vendorA.id : vendorB.id,
            preference: prefs[i % prefs.length],
            forMonth,
            dateofEntry: now,
        })),
    );

    // --- A few recorded meals today (byUser = the dev/superAdmin acting as scanner in seed data) ---
    await db.insert(meals).values(
        students.slice(0, 3).flatMap((s) => ([
            { forUserId: s.id, byUserId: devUser.id, mealType: 'breakfast' as const, date: now },
            { forUserId: s.id, byUserId: devUser.id, mealType: 'lunch' as const, date: now },
        ])),
    );

    // --- Controls: open the feedback window so students can submit feedback in dev ---
    await db.insert(controls).values({ name: 'feedbackToggle', enabled: true });

    console.log(
        `\n✓ Seed complete:\n` +
        `  • 2 menus, 2 vendors\n` +
        `  • users: 1 superAdmin (you), 1 admin, 1 vendor, ${students.length} students\n` +
        `  • ${students.length} vendor selections (this month), 6 meals today, feedback window OPEN\n\n` +
        `Log in as ${devEmail} → you're a superAdmin (only). To preview the student/admin portals,\n` +
        `switch your role and refresh:  npx tsx scripts/set-role.ts ${devEmail} student   (or admin / superAdmin)\n` +
        `For the vendor portal, first map a demo vendor's login email to yours in Manage Vendors.\n`,
    );
    process.exit(0);
}

main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
