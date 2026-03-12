const { Report, buildFormData, parseCsvList, request, summarize } = require('./lib/test-helpers');

const allowedVendorIds = parseCsvList(process.env.VENDOR_ALLOWED_IDS);
const primaryVendorId = process.env.PRIMARY_VENDOR_ID || allowedVendorIds[0] || '';
const secondaryVendorId = process.env.SECONDARY_VENDOR_ID || '';
const targetVendorId = process.env.TARGET_VENDOR_ID || primaryVendorId;

function isExplicitRoleBlock(response) {
  return response.status === 401 || (response.status === 403 && response.body?.message === 'Forbidden');
}

async function testNonStudentQrRoutes(report, role) {
  for (const path of ['/api/meal/generate-qr', '/api/meal/status']) {
    const response = await request({ role, path, method: 'GET' });

    if (isExplicitRoleBlock(response)) {
      report.secure(`B1-${role}-${path}`, `${role} blocked from ${path}`, `status=${response.status}`);
      continue;
    }

    report.vulnerable(
      `B1-${role}-${path}`,
      `${role} reached student endpoint ${path}`,
      `status=${response.status}, body=${summarize(response.body)}`,
    );
  }
}

async function testVendorListScope(report) {
  const response = await request({ role: 'vendor', path: '/api/vendor/getVendors', method: 'GET' });

  if (!response.ok || !Array.isArray(response.body?.vendors)) {
    report.error('B2-01', 'vendor list scope', `unexpected response: status=${response.status}, body=${summarize(response.body)}`);
    return;
  }

  const ids = response.body.vendors.map((vendor) => vendor.id);

  if (secondaryVendorId && ids.includes(secondaryVendorId)) {
    report.vulnerable('B2-01', 'vendor list leaked disallowed vendor', `vendors=${ids.join(', ')}`);
    return;
  }

  if (allowedVendorIds.length > 0 && ids.some((id) => !allowedVendorIds.includes(id))) {
    report.vulnerable('B2-01', 'vendor list leaked out-of-scope vendors', `vendors=${ids.join(', ')}`);
    return;
  }

  report.secure('B2-01', 'vendor list stayed within scope', `vendors=${ids.join(', ') || 'none'}`);
}

async function testChoiceAnalysisScope(report) {
  const now = new Date();
  const response = await request({
    role: 'vendor',
    path: '/api/vendor/choice-analysis',
    method: 'POST',
    json: { month: now.getMonth() + 1, year: now.getFullYear() },
  });

  if (!response.ok || !Array.isArray(response.body?.data)) {
    report.error('B3-01', 'choice-analysis scope', `unexpected response: status=${response.status}, body=${summarize(response.body)}`);
    return;
  }

  const leakedRows = response.body.data.filter((row) => {
    if (!row?.vendorId) {
      return false;
    }

    if (allowedVendorIds.length > 0) {
      return !allowedVendorIds.includes(row.vendorId);
    }

    return secondaryVendorId ? row.vendorId === secondaryVendorId : false;
  });

  if (leakedRows.length > 0) {
    report.vulnerable('B3-01', 'choice-analysis leaked out-of-scope selections', summarize(leakedRows[0]));
    return;
  }

  report.secure('B3-01', 'choice-analysis stayed within vendor scope', `rows=${response.body.data.length}`);
}

async function testTotalMealsScope(report) {
  if (!secondaryVendorId) {
    report.skipped('B4-01', 'total-meals vendor scope', 'set SECONDARY_VENDOR_ID to test disallowed vendor access');
    return;
  }

  const response = await request({
    role: 'vendor',
    path: '/api/meal/total-meals',
    method: 'POST',
    json: {
      date: process.env.TEST_MEAL_DATE || new Date().toISOString().slice(0, 10),
      vendorId: secondaryVendorId,
      mealType: process.env.TEST_MEAL_TYPE || 'lunch',
    },
  });

  if (response.status === 403) {
    report.secure('B4-01', 'total-meals blocked out-of-scope vendor query', `status=${response.status}`);
    return;
  }

  report.vulnerable('B4-01', 'total-meals accepted out-of-scope vendor query', `status=${response.status}, body=${summarize(response.body)}`);
}

async function testAdminBoundaries(report, role) {
  const tests = [
    { id: `B5-${role}-01`, method: 'PATCH', path: '/api/controls/feedback-toggle' },
    { id: `B5-${role}-02`, method: 'GET', path: '/api/vendor/feedback-analysis' },
    { id: `B5-${role}-03`, method: 'POST', path: '/api/vendor/addVendor', formData: buildFormData() },
    { id: `B5-${role}-04`, method: 'POST', path: '/api/admin/upload-vendor-selection', formData: buildFormData() },
  ];

  if (targetVendorId) {
    tests.push({
      id: `B5-${role}-05`,
      method: 'PUT',
      path: `/api/vendor/updateVendor/${targetVendorId}`,
      formData: buildFormData({ fields: { name: 'Unauthorized update', price: '1' } }),
    });
  }

  for (const testCase of tests) {
    const response = await request({
      role,
      method: testCase.method,
      path: testCase.path,
      formData: testCase.formData,
    });

    if (response.status === 403 || response.status === 401) {
      report.secure(testCase.id, `${role} blocked from ${testCase.method} ${testCase.path}`, `status=${response.status}`);
    } else {
      report.vulnerable(
        testCase.id,
        `${role} reached admin endpoint ${testCase.method} ${testCase.path}`,
        `status=${response.status}, body=${summarize(response.body)}`,
      );
    }
  }
}

async function main() {
  const report = new Report('Role Boundaries');

  await testNonStudentQrRoutes(report, 'vendor');
  await testNonStudentQrRoutes(report, 'admin');
  await testVendorListScope(report);
  await testChoiceAnalysisScope(report);
  await testTotalMealsScope(report);
  await testAdminBoundaries(report, 'student');
  await testAdminBoundaries(report, 'vendor');

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