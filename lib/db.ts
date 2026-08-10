
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./db/schema";

/** Wrapped so the global cache below infers the schema-aware type. */
const makeDb = () => {
    const client = drizzle(process.env.DATABASE_URL!, { schema });
    // Required: pg re-emits errors from *idle* clients on the pool, and an unhandled 'error'
    // event takes down the process. Serverless freezes instances, so the server closing an
    // idle connection is routine, not exceptional. The pool replaces the client itself.
    // `?.` because drizzle leaves $client undefined when DATABASE_URL is unset — don't turn a
    // missing env var into a crash at import time.
    client.$client?.on('error', (err) => console.error('pg pool error (idle client dropped):', err));
    return client;
};

// Reuse one pool across dev HMR reloads — a fresh Pool per edit leaks idle connections
// until the server's limit is hit.
const cache = globalThis as unknown as { __db?: ReturnType<typeof makeDb> };
export const db = (cache.__db ??= makeDb());
