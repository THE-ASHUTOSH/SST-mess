/**
 * Dev seed — populates a DEV database with realistic fixtures across every role so a new developer
 * can explore the whole app. See docs/DEVELOPMENT.md.
 *
 *   npx tsx scripts/seed.ts --yes
 *
 * SAFETY: reads DATABASE_URL from .env.local and WIPES the domain tables before re-inserting.
 * Two gates, both must pass: the target must be a LOCAL host (the Docker Postgres from
 * docker-compose.yml), and you must pass --yes. A remote host is refused outright unless you also
 * pass --allow-remote, so a .env.local left pointing at a shared server survives a reflex `pnpm db:seed`.
 */
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

import { drizzle } from 'drizzle-orm/node-postgres';
import { isLocalDb, pgConnection } from '../lib/db/pg';
import * as schema from '../lib/db/schema';
import { getISTMenuWindow } from '../lib/utils/timezone';

const { users, menuDays, vendors, meals, controls, vendorSelections, vendorFeedbacks } = schema;

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

    if (!isLocalDb(url) && !process.argv.includes('--allow-remote')) {
        console.error(
            `\n✗ Refusing to seed "${host}" — it is not your local machine, and this script WIPES\n` +
            '  every domain table on whatever it is pointed at.\n\n' +
            '  Point DATABASE_URL at the local Docker Postgres instead (see .env.example):\n' +
            '    postgresql://mess:mess@localhost:5432/mess_dev?sslmode=disable\n' +
            '    pnpm db:up\n\n' +
            '  If you genuinely mean to wipe that remote database, re-run with --allow-remote.\n',
        );
        process.exit(1);
    }

    if (!confirmed) {
        console.error(
            '\n✗ Refusing to seed without confirmation (this WIPES the domain tables).\n' +
            '  Verify the host above is your local dev DB, then re-run with:  pnpm db:seed\n',
        );
        process.exit(1);
    }

    const devEmail = (process.env.DEV_SEED_EMAIL || '').toLowerCase().trim();
    if (!devEmail) {
        console.error('✗ Set DEV_SEED_EMAIL in .env.local (your login email) so you can explore every role. Aborting.');
        process.exit(1);
    }

    const db = drizzle({ connection: pgConnection(url), schema });
    console.log(`Seeding as dev email: ${devEmail}\n`);

    // --- Clear (delete referencing tables first to satisfy FKs) ---
    await db.delete(meals);
    await db.delete(menuDays);
    await db.delete(vendorSelections);
    await db.delete(vendorFeedbacks);
    await db.delete(vendors);
    await db.delete(users);
    await db.delete(controls);
    console.log('• Cleared existing domain data');

    // --- Vendors (their own demo login emails — NOT the dev's email) ---
    const [vendorA, vendorB] = await db.insert(vendors).values([
        { name: 'Demo Mess A (Sodexo)', email: 'demo-vendor-a@scaler.com', description: 'Primary demo vendor', price: 3000 },
        { name: "Demo Mess B (Gaura's)", email: 'demo-vendor-b@scaler.com', description: 'Second demo vendor', price: 2800 },
    ]).returning();

    // --- Per-day menus (menu_days) across the rolling IST window ---
    // A real mess runs a weekly rotation, so each vendor gets 7 day-plans cycled over the window.
    // Vendor B's last two days are left unseeded on purpose: that is the "no menu set yet" empty
    // state the editor and the student view have to handle.
    const day = (breakfast: string[], lunch: string[], dinner: string[]) => ({ breakfast, lunch, dinner });

    const rotationA = [
        day(['Idli', 'Sambar', 'Coconut Chutney', 'Boiled Eggs', 'Tea'], ['Jeera Rice', 'Dal Tadka', 'Paneer Butter Masala', 'Roti', 'Salad', 'Gulab Jamun'], ['Roti', 'Rajma Masala', 'Aloo Jeera', 'Curd', 'Rice']),
        day(['Poha', 'Sev', 'Banana', 'Filter Coffee'], ['Steamed Rice', 'Sambar', 'Chicken Curry', 'Roti', 'Beetroot Poriyal'], ['Roti', 'Chana Masala', 'Bhindi Fry', 'Dal', 'Rice']),
        day(['Upma', 'Coconut Chutney', 'Sprouts', 'Tea'], ['Veg Pulao', 'Mix Dal', 'Egg Curry', 'Roti', 'Raita'], ['Roti', 'Palak Paneer', 'Cabbage Sabzi', 'Rice', 'Rasam']),
        day(['Masala Dosa', 'Sambar', 'Tomato Chutney', 'Milk'], ['Steamed Rice', 'Dal Fry', 'Fish Fry', 'Roti', 'Cucumber Salad'], ['Roti', 'Mixed Veg Kurma', 'Dal Makhani', 'Rice', 'Curd']),
        day(['Aloo Paratha', 'Curd', 'Pickle', 'Tea'], ['Rajma Chawal', 'Roti', 'Bhindi Masala', 'Papad', 'Buttermilk'], ['Roti', 'Paneer Bhurji', 'Lauki Chana Dal', 'Rice']),
        day(['Bread & Jam', 'Omelette', 'Fruit Bowl', 'Coffee'], ['Veg Fried Rice', 'Gobi Manchurian', 'Hakka Noodles', 'Sweet Corn Soup'], ['Roti', 'Dal Tadka', 'Aloo Matar', 'Rice', 'Kheer']),
        day(['Puri', 'Aloo Bhaji', 'Halwa', 'Tea'], ['Chicken Biryani', 'Veg Biryani', 'Raita', 'Mirchi Ka Salan', 'Ice Cream'], ['Roti', 'Kadai Veg', 'Moong Dal', 'Rice', 'Curd']),
    ];

    const rotationB = [
        day(['Uttapam', 'Sambar', 'Peanut Chutney', 'Tea'], ['Curd Rice', 'Sambar Rice', 'Veg Kootu', 'Roti', 'Appalam'], ['Roti', 'Soya Chunk Masala', 'Carrot Beans Poriyal', 'Rice']),
        day(['Vada Pav', 'Boiled Eggs', 'Sprouts', 'Milk'], ['Lemon Rice', 'Dal Palak', 'Mutton Curry', 'Roti', 'Onion Salad'], ['Roti', 'Matar Paneer', 'Jeera Aloo', 'Dal', 'Rice']),
        day(['Chole Bhature', 'Curd', 'Tea'], ['Steamed Rice', 'Rasam', 'Egg Masala', 'Roti', 'Cabbage Thoran'], ['Roti', 'Veg Kolhapuri', 'Toor Dal', 'Rice', 'Curd']),
        day(['Rava Dosa', 'Coconut Chutney', 'Banana', 'Coffee'], ['Veg Tehri', 'Dal Fry', 'Chilli Chicken', 'Roti', 'Raita'], ['Roti', 'Baingan Bharta', 'Masoor Dal', 'Rice']),
        day(['Methi Thepla', 'Curd', 'Pickle', 'Tea'], ['Steamed Rice', 'Kadhi', 'Aloo Gobi', 'Roti', 'Papad', 'Sooji Halwa'], ['Roti', 'Mushroom Masala', 'Dal Tadka', 'Rice', 'Salad']),
        day(['Idiyappam', 'Veg Stew', 'Fruit Bowl', 'Milk'], ['Schezwan Fried Rice', 'Chilli Paneer', 'Veg Noodles', 'Hot & Sour Soup'], ['Roti', 'Chana Dal', 'Tinda Masala', 'Rice', 'Curd']),
        day(['Sabudana Khichdi', 'Omelette', 'Tea'], ['Veg Biryani', 'Egg Biryani', 'Raita', 'Salan', 'Rasmalai'], ['Roti', 'Dum Aloo', 'Yellow Dal', 'Rice', 'Curd']),
    ];

    const menuWindow = getISTMenuWindow();
    await db.insert(menuDays).values([
        ...menuWindow.map((date, i) => ({ vendorId: vendorA.id, date, ...rotationA[i % rotationA.length] })),
        ...menuWindow.slice(0, -2).map((date, i) => ({ vendorId: vendorB.id, date, ...rotationB[i % rotationB.length] })),
    ]);

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
        `  • 2 vendors, ${menuWindow.length} menu days for A and ${menuWindow.length - 2} for B (last 2 left empty)\n` +
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
