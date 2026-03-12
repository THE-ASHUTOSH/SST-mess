const { Report, request, summarize } = require('./lib/test-helpers');

const TEST_CASES = [
  { id: 'A1-01', method: 'GET', path: '/api/meal/generate-qr' },
  { id: 'A1-02', method: 'GET', path: '/api/meal/status' },
  { id: 'A1-03', method: 'POST', path: '/api/meal/verify-qr', json: {} },
  { id: 'A1-04', method: 'POST', path: '/api/meal/total-meals', json: {} },
  { id: 'A1-05', method: 'GET', path: '/api/vendor/getVendors' },
  { id: 'A1-06', method: 'POST', path: '/api/vendor/choice-analysis', json: {} },
  { id: 'A1-07', method: 'POST', path: '/api/vendor/vendorFeedbackForm', json: {} },
  { id: 'A1-08', method: 'GET', path: '/api/vendor/feedback-analysis' },
  { id: 'A1-09', method: 'POST', path: '/api/vendor/addVendor' },
  { id: 'A1-10', method: 'POST', path: '/api/admin/upload-vendor-selection' },
  { id: 'A1-11', method: 'GET', path: '/api/user/me' },
  { id: 'A1-12', method: 'GET', path: '/api/user/latest-vendor' },
];

function isProtectedResponse(response) {
  if ([401, 403, 302, 303, 307, 308].includes(response.status)) {
    return true;
  }

  if (typeof response.body === 'object' && response.body?.message === 'Unauthorized') {
    return true;
  }

  return false;
}

async function main() {
  const report = new Report('Authentication Baseline');

  for (const testCase of TEST_CASES) {
    try {
      const response = await request({
        method: testCase.method,
        path: testCase.path,
        json: testCase.json,
        redirect: 'manual',
      });

      if (isProtectedResponse(response)) {
        report.secure(testCase.id, `${testCase.method} ${testCase.path}`, `status=${response.status}`);
      } else {
        report.vulnerable(
          testCase.id,
          `${testCase.method} ${testCase.path}`,
          `anonymous request was not blocked: status=${response.status}, body=${summarize(response.body)}`,
        );
      }
    } catch (error) {
      report.error(testCase.id, `${testCase.method} ${testCase.path}`, error instanceof Error ? error.message : String(error));
    }
  }

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