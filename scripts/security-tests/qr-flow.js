const { Report, mutateToken, request, summarize } = require('./lib/test-helpers');

const qrVendorId = process.env.QR_VENDOR_ID || process.env.PRIMARY_VENDOR_ID || '';
const qrTestToken = process.env.QR_TEST_TOKEN || '';
const otherVendorQrToken = process.env.OTHER_VENDOR_QR_TOKEN || '';
const verifyResponseQrToken = process.env.VERIFY_RESPONSE_QR_TOKEN || '';
const expiredQrToken = process.env.EXPIRED_QR_TOKEN || '';

async function testMultipleTokenIssuance(report) {
  const responses = await Promise.all([
    request({ role: 'student', path: '/api/meal/generate-qr', method: 'GET' }),
    request({ role: 'student', path: '/api/meal/generate-qr', method: 'GET' }),
    request({ role: 'student', path: '/api/meal/generate-qr', method: 'GET' }),
  ]);

  const successfulTokens = responses
    .filter((response) => response.ok && typeof response.body?.token === 'string')
    .map((response) => response.body.token);

  const uniqueTokens = new Set(successfulTokens);

  if (uniqueTokens.size > 1) {
    report.vulnerable('C1-01', 'student minted multiple active QR tokens', `successes=${successfulTokens.length}, uniqueTokens=${uniqueTokens.size}`);
    return;
  }

  if (successfulTokens.length > 1) {
    report.secure('C1-01', 'student only received a stable token value', `successes=${successfulTokens.length}`);
    return;
  }

  report.secure('C1-01', 'multiple token issuance was not observed', `responses=${responses.map((response) => response.status).join(', ')}`);
}

async function testDuplicateRedemption(report) {
  if (!qrTestToken || !qrVendorId) {
    report.skipped('C2-01', 'duplicate redemption race', 'set QR_TEST_TOKEN and QR_VENDOR_ID to run this test');
    return;
  }

  const payload = { token: qrTestToken, vendorId: [qrVendorId] };
  const responses = await Promise.all([
    request({ role: 'vendor', path: '/api/meal/verify-qr', method: 'POST', json: payload }),
    request({ role: 'vendor', path: '/api/meal/verify-qr', method: 'POST', json: payload }),
  ]);

  const successes = responses.filter((response) => response.ok && response.body?.success === true);

  if (successes.length > 1) {
    report.vulnerable('C2-01', 'duplicate QR redemption succeeded twice', responses.map((response) => `${response.status}:${summarize(response.body)}`).join(' | '));
    return;
  }

  report.secure('C2-01', 'duplicate redemption did not succeed twice', responses.map((response) => `${response.status}`).join(', '));
}

async function testTamperedToken(report) {
  if (!qrTestToken || !qrVendorId) {
    report.skipped('C4-01', 'tampered token verification', 'set QR_TEST_TOKEN and QR_VENDOR_ID to run this test');
    return;
  }

  const response = await request({
    role: 'vendor',
    path: '/api/meal/verify-qr',
    method: 'POST',
    json: { token: mutateToken(qrTestToken), vendorId: [qrVendorId] },
  });

  if (response.status === 401 || response.status === 403) {
    report.secure('C4-01', 'tampered token was rejected', `status=${response.status}`);
    return;
  }

  report.vulnerable('C4-01', 'tampered token was accepted', `status=${response.status}, body=${summarize(response.body)}`);
}

async function testExpiredToken(report) {
  if (!expiredQrToken || !qrVendorId) {
    report.skipped('C5-01', 'expired token verification', 'set EXPIRED_QR_TOKEN and QR_VENDOR_ID to run this test');
    return;
  }

  const response = await request({
    role: 'vendor',
    path: '/api/meal/verify-qr',
    method: 'POST',
    json: { token: expiredQrToken, vendorId: [qrVendorId] },
  });

  if (response.status === 401) {
    report.secure('C5-01', 'expired token was rejected', `status=${response.status}`);
    return;
  }

  report.vulnerable('C5-01', 'expired token was accepted', `status=${response.status}, body=${summarize(response.body)}`);
}

async function testCrossVendorRegression(report) {
  if (!otherVendorQrToken || !qrVendorId) {
    report.skipped('C6-01', 'cross-vendor regression', 'set OTHER_VENDOR_QR_TOKEN and QR_VENDOR_ID to run this test');
    return;
  }

  const response = await request({
    role: 'vendor',
    path: '/api/meal/verify-qr',
    method: 'POST',
    json: { token: otherVendorQrToken, vendorId: [qrVendorId] },
  });

  if (response.status === 403) {
    report.secure('C6-01', 'cross-vendor redemption was blocked', `status=${response.status}`);
    return;
  }

  report.vulnerable('C6-01', 'cross-vendor redemption succeeded unexpectedly', `status=${response.status}, body=${summarize(response.body)}`);
}

async function testVerificationResponseShape(report) {
  if (!verifyResponseQrToken || !qrVendorId) {
    report.skipped('C7-01', 'verification response minimization', 'set VERIFY_RESPONSE_QR_TOKEN and QR_VENDOR_ID to run this test');
    return;
  }

  const response = await request({
    role: 'vendor',
    path: '/api/meal/verify-qr',
    method: 'POST',
    json: { token: verifyResponseQrToken, vendorId: [qrVendorId] },
  });

  if (!response.ok || !response.body?.user || typeof response.body.user !== 'object') {
    report.error('C7-01', 'verification response minimization', `unexpected response: status=${response.status}, body=${summarize(response.body)}`);
    return;
  }

  const leakedFields = Object.keys(response.body.user).filter((field) => !['id', 'name', 'picture'].includes(field));

  if (leakedFields.length > 0) {
    report.vulnerable('C7-01', 'verification response exposed extra user fields', leakedFields.join(', '));
    return;
  }

  report.secure('C7-01', 'verification response returned only minimal user fields', Object.keys(response.body.user).join(', '));
}

async function main() {
  const report = new Report('QR Flow');

  await testMultipleTokenIssuance(report);
  await testDuplicateRedemption(report);
  await testTamperedToken(report);
  await testExpiredToken(report);
  await testCrossVendorRegression(report);
  await testVerificationResponseShape(report);

  report.summary();
  return report.hasFailures();
}

if (require.main === module) {
  main()
    .then((hasFailures) => {
      if (hasFailures) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = { main };