/**
 * Shared pg TLS/connection options — used by lib/db.ts, drizzle.config.ts and the scripts in
 * scripts/, so a change lands in one place.
 *
 * Two very different targets have to work from the same code:
 *
 *   • a managed/remote Postgres behind PgBouncer, which speaks TLS with a self-signed cert;
 *   • the local Docker Postgres from docker-compose.yml, which speaks **no TLS at all** and
 *     answers an SSLRequest with "server does not support SSL connections".
 *
 * So TLS is decided per URL rather than forced on (see `sslFor`), and `sslmode` is stripped from
 * the URL whenever we pass explicit options: pg lets the connection string overwrite them —
 * `Object.assign({}, config, parse(config.connectionString))` in pg/lib/connection-parameters.js —
 * and `sslmode=require` resolves to certificate verification ON, which a self-signed cert fails.
 * Stripping it lets PG_SSL win.
 */
export const stripSslMode = (url: string) => url.replace(/([?&])sslmode=[^&]*&?/, '$1');

export const PG_SSL = { rejectUnauthorized: false }; // PgBouncer / Neon use a self-signed cert

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]', 'host.docker.internal', 'db']);

/** The host from a Postgres URL, credentials and port removed. '' if it can't be parsed. */
const hostOf = (url: string) => {
    const afterScheme = url.split('://')[1] ?? '';
    const authority = afterScheme.split('/')[0].split('?')[0];
    const host = authority.slice(authority.lastIndexOf('@') + 1); // a password can hold '@', a host can't
    return host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.split(':')[0];
};

/**
 * TLS options for a URL — `false` means "connect in plain text", which is what a local Postgres
 * needs and what pg itself defaults to.
 *
 *   sslmode=disable        → off, always (the local Docker DB sets this explicitly)
 *   any other sslmode      → on, verification relaxed (remote, self-signed cert)
 *   no sslmode, loopback   → off  (localhost / 127.0.0.1 / ::1 / host.docker.internal / db)
 *   no sslmode, remote     → on, verification relaxed (never send prod credentials in the clear)
 */
export const sslFor = (url: string): typeof PG_SSL | false => {
    const mode = url.match(/[?&]sslmode=([^&]*)/)?.[1]?.toLowerCase();
    if (mode) return mode === 'disable' ? false : PG_SSL;
    return LOOPBACK.has(hostOf(url)) ? false : PG_SSL;
};

export const pgConnection = (url: string) => ({
    connectionString: stripSslMode(url),
    ssl: sslFor(url),
});

/**
 * Is this URL the developer's own machine? The destructive dev scripts (seed, bulk seed) refuse to
 * run when it isn't, so a `.env.local` left pointing at a shared server can't be wiped by reflex.
 */
export const isLocalDb = (url: string) => LOOPBACK.has(hostOf(url));
