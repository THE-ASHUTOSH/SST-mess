/**
 * Self-check for pgConnection: run with `npx tsx lib/db/pg.check.ts` (or `pnpm db:check`).
 *
 * Three ways this can fail silently and none is obvious from reading the regexes: leaving `sslmode`
 * in place (pg then overrides our options and TLS verification stays ON), eating too much of the
 * URL (connecting to the wrong database), or sending an SSLRequest to the local Docker Postgres,
 * which has no TLS and answers "server does not support SSL connections". All three are asserted
 * here against pg's real resolver.
 */
import assert from 'assert';
import { createRequire } from 'module';
import { pgConnection } from './pg';

const ConnectionParameters = createRequire(require.resolve('pg/package.json'))('./lib/connection-parameters.js');

// [url, expected ssl] — `false` means plain TCP, the object means TLS with verification relaxed.
const RELAXED = { rejectUnauthorized: false };
const CASES: [string, typeof RELAXED | false][] = [
    // remote: TLS on, verification relaxed, sslmode never survives into pg's resolver
    ['postgres://u:p@h:6432/messdb?sslmode=require', RELAXED],
    ['postgres://u:p@h:6432/messdb?sslmode=verify-full&application_name=mess', RELAXED],
    ['postgres://u:p@h:6432/messdb?application_name=mess&sslmode=require', RELAXED],
    ['postgres://u:p@h:6432/messdb', RELAXED],
    // local Docker Postgres (docker-compose.yml): no TLS, by sslmode or by loopback host
    ['postgres://u:p@localhost:6432/messdb?sslmode=disable', false],
    ['postgres://u:p@127.0.0.1:6432/messdb', false],
    ['postgres://u:p@h:6432/messdb?sslmode=disable', false],
    // a password containing '@' or ':' must not be mistaken for the host
    ['postgres://u:p@ss:word@localhost:6432/messdb', false],
];

for (const [url, expectedSsl] of CASES) {
    const resolved = new ConnectionParameters(pgConnection(url));
    assert.deepStrictEqual(resolved.ssl, expectedSsl, `wrong TLS decision for ${url}`);
    assert.strictEqual(resolved.database, 'messdb', `database name mangled for ${url}`);
    assert.strictEqual(resolved.port, 6432, `port mangled for ${url}`);
}

console.log(`pg connection options OK (${CASES.length} cases)`);
