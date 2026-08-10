
import { config } from 'dotenv';
import { defineConfig } from "drizzle-kit";
import { PG_SSL, stripSslMode } from "./lib/db/pg";

config({ path: '.env.local' });

export default defineConfig({
    schema: "./lib/db/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: stripSslMode(process.env.DATABASE_URL!),
        ssl: PG_SSL,
    },
});
