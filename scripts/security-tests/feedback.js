const { Report, request, summarize } = require('./lib/test-helpers');

const primaryVendorId = process.env.PRIMARY_VENDOR_ID || '';
const secondaryVendorId = process.env.SECONDARY_VENDOR_ID || '';
const feedbackVendorId = process.env.FEEDBACK_VENDOR_ID || primaryVendorId;

function feedbackPayload(vendorId) {
  return {
    vendor: vendorId,
    feedback: 'security test payload',
    ratings: {
      hygiene: 5,
      quantity: 5,
      timeliness: 5,
      variety: 5,
      staff: 5,
      overall: 5,
    },
  };
}

async function setFeedbackToggle(enabled) {
  const current = await request({ role: 'admin', path: '/api/controls/feedback-toggle', method: 'GET' });
  if (!current.ok || typeof current.body?.enabled !== 'boolean') {
    throw new Error(`unable to read feedback toggle: ${summarize(current.body)}`);
  }

  if (current.body.enabled === enabled) {
    return current.body.enabled;
  }

  const toggled = await request({ role: 'admin', path: '/api/controls/feedback-toggle', method: 'PATCH' });
  if (!toggled.ok || toggled.body?.enabled !== enabled) {
    throw new Error(`unable to set feedback toggle=${enabled}: ${summarize(toggled.body)}`);
  }

  return current.body.enabled;
}

async function testAnyVendorFeedback(report) {
  if (!secondaryVendorId) {
    report.skipped('D1-01', 'submit feedback for any vendor', 'set SECONDARY_VENDOR_ID to target a different vendor');
    return;
  }

  const response = await request({
    role: 'student',
    path: '/api/vendor/vendorFeedbackForm',
    method: 'POST',
    json: feedbackPayload(secondaryVendorId),
  });

  if (response.ok && response.body?.success === true) {
    report.vulnerable('D1-01', 'student submitted feedback for a different vendor', summarize(response.body));
    return;
  }

  report.secure('D1-01', 'student could not submit feedback for a different vendor', `status=${response.status}`);
}

async function testDuplicateFeedback(report) {
  if (!feedbackVendorId) {
    report.skipped('D2-01', 'duplicate feedback spam', 'set FEEDBACK_VENDOR_ID or PRIMARY_VENDOR_ID');
    return;
  }

  const payload = feedbackPayload(feedbackVendorId);
  const responses = await Promise.all([
    request({ role: 'student', path: '/api/vendor/vendorFeedbackForm', method: 'POST', json: payload }),
    request({ role: 'student', path: '/api/vendor/vendorFeedbackForm', method: 'POST', json: payload }),
    request({ role: 'student', path: '/api/vendor/vendorFeedbackForm', method: 'POST', json: payload }),
  ]);

  const successes = responses.filter((response) => response.ok && response.body?.success === true);

  if (successes.length > 1) {
    report.vulnerable('D2-01', 'duplicate feedback spam succeeded', `successes=${successes.length}`);
    return;
  }

  report.secure('D2-01', 'duplicate feedback spam was limited', `statuses=${responses.map((response) => response.status).join(', ')}`);
}

async function testFeedbackToggleEnforcement(report) {
  if (!feedbackVendorId) {
    report.skipped('D3-01', 'feedback toggle enforcement', 'set FEEDBACK_VENDOR_ID or PRIMARY_VENDOR_ID');
    return;
  }

  let originalState;

  try {
    originalState = await setFeedbackToggle(false);
    const response = await request({
      role: 'student',
      path: '/api/vendor/vendorFeedbackForm',
      method: 'POST',
      json: feedbackPayload(feedbackVendorId),
    });

    if (response.ok && response.body?.success === true) {
      report.vulnerable('D3-01', 'feedback submission ignored disabled toggle', summarize(response.body));
      return;
    }

    report.secure('D3-01', 'feedback submission respected disabled toggle', `status=${response.status}`);
  } catch (error) {
    report.error('D3-01', 'feedback toggle enforcement', error instanceof Error ? error.message : String(error));
  } finally {
    if (typeof originalState === 'boolean') {
      try {
        await setFeedbackToggle(originalState);
      } catch (error) {
        report.error('D3-restore', 'restore feedback toggle', error instanceof Error ? error.message : String(error));
      }
    }
  }
}

async function testNonStudentFeedback(report, role) {
  if (!feedbackVendorId) {
    report.skipped(`D4-${role}-01`, `${role} feedback submission`, 'set FEEDBACK_VENDOR_ID or PRIMARY_VENDOR_ID');
    return;
  }

  const response = await request({
    role,
    path: '/api/vendor/vendorFeedbackForm',
    method: 'POST',
    json: feedbackPayload(feedbackVendorId),
  });

  if (response.ok && response.body?.success === true) {
    report.vulnerable(`D4-${role}-01`, `${role} submitted end-user vendor feedback`, summarize(response.body));
    return;
  }

  report.secure(`D4-${role}-01`, `${role} could not submit end-user vendor feedback`, `status=${response.status}`);
}

async function main() {
  const report = new Report('Feedback Abuse');

  await testAnyVendorFeedback(report);
  await testDuplicateFeedback(report);
  await testFeedbackToggleEnforcement(report);
  await testNonStudentFeedback(report, 'vendor');
  await testNonStudentFeedback(report, 'admin');

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