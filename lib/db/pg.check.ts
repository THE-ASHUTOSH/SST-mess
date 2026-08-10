/**
 * Self-check for stripSslMode: run with `npx tsx lib/db/pg.check.ts`.
 *
 * Two ways the regex can fail silently and neither is obvious from reading it: leaving `sslmode`
 * in place (pg then overrides PG_SSL and TLS verification stays ON), or eating too much of the
 * URL (connecting to the wrong database). Both are asserted here against pg's real resolver.
 */
import assert from 'assert';
import { createRequire } from 'module';
import { pgConnection } from './pg';

const ConnectionParameters = createRequire(require.resolve('pg/package.json'))('./lib/connection-parameters.js');

for (const url of [
    'postgres://u:p@h:6432/messdb?sslmode=require',
    'postgres://u:p@h:6432/messdb?sslmode=verify-full&application_name=mess',
    'postgres://u:p@h:6432/messdb?application_name=mess&sslmode=require',
    'postgres://u:p@h:6432/messdb',
]) {
    const resolved = new ConnectionParameters(pgConnection(url));
    assert.deepStrictEqual(resolved.ssl, { rejectUnauthorized: false }, `TLS verification not disabled for ${url}`);
    assert.strictEqual(resolved.database, 'messdb', `database name mangled for ${url}`);
    assert.strictEqual(resolved.port, 6432, `port mangled for ${url}`);
}

console.log('pg connection options OK');
