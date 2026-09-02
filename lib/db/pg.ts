/**
 * Shared pg TLS/connection options — used by lib/db.ts, drizzle.config.ts and the scripts in
 * scripts/, so a change lands in one place.
 *
 * `sslmode` is stripped from the URL on purpose: pg lets the connection string overwrite the
 * explicit options — `Object.assign({}, config, parse(config.connectionString))` in
 * pg/lib/connection-parameters.js — and `sslmode=require` resolves to certificate verification
 * ON, which a self-signed certificate fails. Stripping it lets PG_SSL win.
 */
export const stripSslMode = (url: string) => url.replace(/([?&])sslmode=[^&]*&?/, '$1');

export const PG_SSL = { rejectUnauthorized: false }; // PgBouncer uses a self-signed cert

export const pgConnection = (url: string) => ({
    connectionString: stripSslMode(url),
    ssl: PG_SSL,
});
