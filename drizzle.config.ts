
import { config } from 'dotenv';
import { defineConfig } from "drizzle-kit";
import { sslFor, stripSslMode } from "./lib/db/pg";

config({ path: '.env.local' });

export default defineConfig({
    schema: "./lib/db/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: stripSslMode(process.env.DATABASE_URL!),
        ssl: sslFor(process.env.DATABASE_URL!), // `false` for the local Docker DB, which has no TLS
    },
});
