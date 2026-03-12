const authBaseline = require('./auth-baseline');
const dataExposure = require('./data-exposure');
const feedback = require('./feedback');
const qrFlow = require('./qr-flow');
const roleBoundaries = require('./role-boundaries');
const uploads = require('./uploads');

async function main() {
  const suites = [
    ['Authentication Baseline', authBaseline.main],
    ['Role Boundaries', roleBoundaries.main],
    ['QR Flow', qrFlow.main],
    ['Feedback Abuse', feedback.main],
    ['Data Exposure', dataExposure.main],
    ['Upload Robustness', uploads.main],
  ];

  let hasFailures = false;

  for (const [name, runner] of suites) {
    console.log(`\n=== ${name} ===`);
    const suiteHasFailures = await runner();
    hasFailures = hasFailures || suiteHasFailures;
  }

  return hasFailures;
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