const { Report, request, summarize } = require('./lib/test-helpers');

async function testUserProfile(report, role) {
  const response = await request({ role, path: '/api/user/me', method: 'GET' });

  if (!response.ok || !response.body?.user || typeof response.body.user !== 'object') {
    report.error(`E1-${role}-01`, `${role} user profile`, `unexpected response: status=${response.status}, body=${summarize(response.body)}`);
    return;
  }

  const exposedFields = Object.keys(response.body.user);
  const sensitiveFields = exposedFields.filter((field) => ['vendorId', 'hostel', 'batch', 'role'].includes(field));

  if (sensitiveFields.length > 0) {
    report.vulnerable(`E1-${role}-01`, `${role} profile exposed potentially sensitive fields`, sensitiveFields.join(', '));
    return;
  }

  report.secure(`E1-${role}-01`, `${role} profile stayed minimal`, exposedFields.join(', '));
}

async function testLatestVendorSelection(report) {
  const response = await request({ role: 'student', path: '/api/user/latest-vendor', method: 'GET' });

  if (response.status === 404) {
    report.skipped('E2-01', 'latest-vendor exposure', 'student account has no current vendor selection');
    return;
  }

  if (!response.ok || !response.body?.latestSelection) {
    report.error('E2-01', 'latest-vendor exposure', `unexpected response: status=${response.status}, body=${summarize(response.body)}`);
    return;
  }

  report.secure('E2-01', 'latest-vendor returned caller-owned selection shape', Object.keys(response.body.latestSelection).join(', '));
}

async function testFeedbackToggleDisclosure(report) {
  const response = await request({ path: '/api/controls/feedback-toggle', method: 'GET', redirect: 'manual' });

  if (response.ok && typeof response.body?.enabled === 'boolean') {
    report.vulnerable('E3-01', 'feedback toggle was publicly readable', `enabled=${response.body.enabled}`);
    return;
  }

  report.secure('E3-01', 'feedback toggle was not publicly readable', `status=${response.status}`);
}

async function main() {
  const report = new Report('Data Exposure');

  await testUserProfile(report, 'student');
  await testUserProfile(report, 'vendor');
  await testUserProfile(report, 'admin');
  await testLatestVendorSelection(report);
  await testFeedbackToggleDisclosure(report);

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