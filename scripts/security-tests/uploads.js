const { Report, buildFormData, request, summarize } = require('./lib/test-helpers');

const targetVendorId = process.env.TARGET_VENDOR_ID || process.env.PRIMARY_VENDOR_ID || '';
const largeSelectionFile = process.env.LARGE_SELECTION_FILE || '';
const malformedSelectionFile = process.env.MALFORMED_SELECTION_FILE || '';
const malformedMenuFile = process.env.MALFORMED_MENU_FILE || '';
const formulaSelectionFile = process.env.FORMULA_SELECTION_FILE || '';

function buildSelectionUpload(filePath) {
  return buildFormData({
    fields: { month: process.env.TEST_MONTH || '2026-03-01' },
    files: [{ fieldName: 'vendor-selection', filePath }],
  });
}

function buildVendorUpload(filePath) {
  return buildFormData({
    fields: {
      name: 'Security Test Vendor',
      description: 'security test',
      price: '1',
      mealsOptions: JSON.stringify({ breakfast: true, lunch: true, dinner: true }),
    },
    files: [{ fieldName: 'menuFile', filePath, contentType: 'text/csv' }],
  });
}

async function testLargeSpreadsheet(report) {
  if (!largeSelectionFile) {
    report.skipped('F1-01', 'oversized spreadsheet upload', 'set LARGE_SELECTION_FILE to run this test');
    return;
  }

  const response = await request({
    role: 'admin',
    path: '/api/admin/upload-vendor-selection',
    method: 'POST',
    formData: buildSelectionUpload(largeSelectionFile),
  });

  if (response.status >= 500) {
    report.vulnerable('F1-01', 'oversized spreadsheet caused server-side failure', `status=${response.status}, body=${summarize(response.body)}`);
    return;
  }

  report.secure('F1-01', 'oversized spreadsheet upload failed safely or was handled', `status=${response.status}`);
}

async function testMalformedSpreadsheet(report) {
  if (!malformedSelectionFile) {
    report.skipped('F2-01', 'malformed spreadsheet upload', 'set MALFORMED_SELECTION_FILE to run this test');
    return;
  }

  const response = await request({
    role: 'admin',
    path: '/api/admin/upload-vendor-selection',
    method: 'POST',
    formData: buildSelectionUpload(malformedSelectionFile),
  });

  if (response.status >= 500) {
    report.vulnerable('F2-01', 'malformed spreadsheet caused server-side failure', `status=${response.status}, body=${summarize(response.body)}`);
    return;
  }

  report.secure('F2-01', 'malformed spreadsheet upload failed safely or was handled', `status=${response.status}`);
}

async function testFormulaSpreadsheet(report) {
  if (!formulaSelectionFile) {
    report.skipped('F3-01', 'formula injection persistence upload', 'set FORMULA_SELECTION_FILE to upload formula-bearing spreadsheet content');
    return;
  }

  const response = await request({
    role: 'admin',
    path: '/api/admin/upload-vendor-selection',
    method: 'POST',
    formData: buildSelectionUpload(formulaSelectionFile),
  });

  if (!response.ok) {
    report.error('F3-01', 'formula injection persistence upload', `upload failed: status=${response.status}, body=${summarize(response.body)}`);
    return;
  }

  report.skipped('F3-01', 'formula injection persistence upload', 'upload succeeded; verify downstream rendering or export paths manually');
}

async function testMalformedMenuAdd(report) {
  if (!malformedMenuFile) {
    report.skipped('F4-01', 'malformed menu upload on addVendor', 'set MALFORMED_MENU_FILE to run this test');
    return;
  }

  const response = await request({
    role: 'admin',
    path: '/api/vendor/addVendor',
    method: 'POST',
    formData: buildVendorUpload(malformedMenuFile),
  });

  if (response.status >= 500) {
    report.vulnerable('F4-01', 'malformed menu upload on addVendor caused server-side failure', `status=${response.status}, body=${summarize(response.body)}`);
    return;
  }

  report.secure('F4-01', 'malformed menu upload on addVendor failed safely or was handled', `status=${response.status}`);
}

async function testMalformedMenuUpdate(report) {
  if (!malformedMenuFile || !targetVendorId) {
    report.skipped('F4-02', 'malformed menu upload on updateVendor', 'set MALFORMED_MENU_FILE and TARGET_VENDOR_ID to run this test');
    return;
  }

  const response = await request({
    role: 'admin',
    path: `/api/vendor/updateVendor/${targetVendorId}`,
    method: 'PUT',
    formData: buildVendorUpload(malformedMenuFile),
  });

  if (response.status >= 500) {
    report.vulnerable('F4-02', 'malformed menu upload on updateVendor caused server-side failure', `status=${response.status}, body=${summarize(response.body)}`);
    return;
  }

  report.secure('F4-02', 'malformed menu upload on updateVendor failed safely or was handled', `status=${response.status}`);
}

async function main() {
  const report = new Report('Upload Robustness');

  await testLargeSpreadsheet(report);
  await testMalformedSpreadsheet(report);
  await testFormulaSpreadsheet(report);
  await testMalformedMenuAdd(report);
  await testMalformedMenuUpdate(report);

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