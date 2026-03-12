
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "./db/schema";

function getDatabaseUrl(): string {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		throw new Error('DATABASE_URL is not configured');
	}

	return databaseUrl;
}

function createDb() {
	const sql = neon(getDatabaseUrl());
	return drizzle(sql, { schema });
}

type DbInstance = ReturnType<typeof createDb>;

let cachedDb: DbInstance | null = null;

function getDbInstance(): DbInstance {
	if (!cachedDb) {
		cachedDb = createDb();
	}

	return cachedDb;
}

export const db = new Proxy({} as DbInstance, {
	get(_target, prop, receiver) {
		return Reflect.get(getDbInstance(), prop, receiver);
	},
});
