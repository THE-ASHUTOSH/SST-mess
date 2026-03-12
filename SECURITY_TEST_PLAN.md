# Security Test Plan

Date: 2026-03-12

## Goal

This document provides a detailed, reproducible security test plan for the current codebase. It is designed to help verify:

- authentication bypasses
- authorization and role-scope failures
- QR issuance and redemption flaws
- data exposure issues
- feedback abuse and integrity issues
- upload robustness problems
- vendor/admin boundary regressions

This is a test plan, not a claim that every listed scenario is currently exploitable. Each test includes what result would confirm a vulnerability.

## Test Environment

Use a non-production environment with test data.

Recommended test accounts:

- `student1`: valid student with a vendor selection for the current month
- `student2`: valid student with a different vendor selection
- `vendor1`: vendor-role user bound to vendor A in `users.vendorId`
- `vendor2`: vendor-role user bound to vendor B in `users.vendorId`
- `admin1`: admin-role user
- `outsider`: authenticated account that should not be treated as student, vendor, or admin for business actions

Recommended test data:

- vendor A and vendor B exist
- at least one meal window is currently active
- current month vendor selections exist for student1 and student2
- feedback toggle can be switched on and off

## Tools

Preferred tools:

- browser DevTools console while logged in
- Network tab for copying authenticated requests
- Burp Suite Repeater or Postman with copied cookies/headers
- direct database inspection after high-risk tests

Because API routes are protected by Clerk middleware, the easiest approach is:

1. Log into the app normally.
2. Capture a real request from the browser.
3. Replay or modify that request in DevTools or Repeater.

## Automated Scripts

Runnable scripts now exist under `scripts/security-tests/`.

Available commands:

- `npm run security:test:auth`
- `npm run security:test:roles`
- `npm run security:test:qr`
- `npm run security:test:feedback`
- `npm run security:test:data`
- `npm run security:test:uploads`
- `npm run security:test:all`

Base configuration:

- `SECURITY_BASE_URL`: defaults to `http://localhost:3000`
- `STUDENT_COOKIE`, `VENDOR_COOKIE`, `ADMIN_COOKIE`, `OUTSIDER_COOKIE`: raw Cookie header values copied from browser requests
- `STUDENT_BEARER_TOKEN`, `VENDOR_BEARER_TOKEN`, `ADMIN_BEARER_TOKEN`, `OUTSIDER_BEARER_TOKEN`: optional Bearer tokens if you prefer token auth over cookies

Common test data variables:

- `PRIMARY_VENDOR_ID`
- `SECONDARY_VENDOR_ID`
- `VENDOR_ALLOWED_IDS`: comma-separated list of vendor ids allowed for the vendor test account
- `TARGET_VENDOR_ID`
- `QR_TEST_TOKEN`
- `OTHER_VENDOR_QR_TOKEN`
- `VERIFY_RESPONSE_QR_TOKEN`
- `EXPIRED_QR_TOKEN`
- `QR_VENDOR_ID`
- `FEEDBACK_VENDOR_ID`
- `TEST_MEAL_DATE`
- `TEST_MEAL_TYPE`

Upload test variables:

- `LARGE_SELECTION_FILE`
- `MALFORMED_SELECTION_FILE`
- `FORMULA_SELECTION_FILE`
- `MALFORMED_MENU_FILE`

Behavior notes:

- Scripts mark confirmed problems as `VULNERABLE` and set a failing exit code.
- Missing env for optional tests produces `SKIPPED`, not failure.
- Some cases such as formula injection persistence still need manual follow-up after the upload step.

## Pass/Fail Convention

- `secure`: behavior matches expected access rules and integrity rules
- `vulnerable`: behavior confirms a flaw
- `needs review`: result is inconsistent, environment-dependent, or requires database confirmation

## Coverage Map

Primary API routes covered by this plan:

- `GET /api/meal/generate-qr`
- `POST /api/meal/verify-qr`
- `GET /api/meal/status`
- `POST /api/meal/total-meals`
- `GET /api/vendor/getVendors`
- `POST /api/vendor/choice-analysis`
- `POST /api/vendor/vendorFeedbackForm`
- `GET /api/vendor/feedback-analysis`
- `POST /api/vendor/addVendor`
- `PUT /api/vendor/updateVendor/[id]`
- `POST /api/admin/upload-vendor-selection`
- `GET /api/user/me`
- `GET /api/user/latest-vendor`
- `GET/PATCH /api/controls/feedback-toggle`
- `GET /api/health`

## Test Prerequisites

Before running the detailed tests:

1. Verify the active meal window if you are testing QR generation or redemption.
2. Capture one successful authenticated request for each role.
3. Note the current `vendorId` bindings for vendor1 and vendor2.
4. Prepare one valid QR token from `student1`.
5. Be ready to inspect the `meals`, `vendor_feedbacks`, and `vendor_selections` tables after tests.

## Detailed Tests

### A. Authentication Baseline

#### A1. Anonymous access to protected APIs

Purpose:

- Verify Clerk middleware blocks unauthenticated callers from protected routes.

Routes:

- `/api/meal/generate-qr`
- `/api/meal/verify-qr`
- `/api/meal/status`
- `/api/meal/total-meals`
- `/api/vendor/getVendors`
- `/api/vendor/choice-analysis`
- `/api/vendor/vendorFeedbackForm`
- `/api/vendor/feedback-analysis`
- `/api/vendor/addVendor`
- `/api/vendor/updateVendor/[id]`
- `/api/admin/upload-vendor-selection`
- `/api/user/me`
- `/api/user/latest-vendor`

Method:

1. Open an incognito window with no session.
2. Request each route directly.

Expected secure result:

- Protected routes return `401`, redirect to auth, or otherwise reject anonymous access.

Vulnerability signal:

- Any protected business route returns usable data or performs an action anonymously.

Notes:

- `/api/health` is expected to be public.
- `GET /api/controls/feedback-toggle` is currently not role-protected and should be reviewed separately.

### B. Role and Authorization Tests

#### B1. Non-student access to student QR routes

Purpose:

- Verify `vendor` and `admin` users cannot access student-only QR routes.

Routes:

- `GET /api/meal/generate-qr`
- `GET /api/meal/status`

Method:

Run from DevTools while logged in as `vendor1` and then as `admin1`:

```js
await fetch('/api/meal/generate-qr', { credentials: 'include' }).then(async r => ({ status: r.status, body: await r.json() }));
await fetch('/api/meal/status', { credentials: 'include' }).then(async r => ({ status: r.status, body: await r.json() }));
```

Expected secure result:

- Both routes return `403 Forbidden` for non-student roles.

Vulnerability signal:

- Any non-student authenticated user gets a QR token or meal status without role rejection.

#### B2. Vendor scope on vendor list

Purpose:

- Ensure a vendor user only receives vendors they are scoped to.

Route:

- `GET /api/vendor/getVendors`

Method:

1. Log in as `vendor1`.
2. Request `/api/vendor/getVendors`.
3. Confirm whether vendor B appears in the response.

Expected secure result:

- Only vendor A is returned.

Vulnerability signal:

- Vendor1 sees vendor B or all vendors.

#### B3. Vendor scope on choice analysis

Purpose:

- Ensure vendor analytics cannot be expanded to other vendors.

Route:

- `POST /api/vendor/choice-analysis`

Method:

1. Log in as `vendor1`.
2. Send requests for the current month and adjacent months.
3. Inspect whether data includes selections outside vendor A.

Example:

```js
await fetch('/api/vendor/choice-analysis', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ month: 3, year: 2026 }),
}).then(r => r.json());
```

Expected secure result:

- Results only include rows scoped to vendor A.

Vulnerability signal:

- Vendor1 sees choice data for vendor B or other vendors.

#### B4. Vendor scope on total meals

Purpose:

- Ensure a vendor cannot query meal totals for a different vendor.

Route:

- `POST /api/meal/total-meals`

Method:

1. Log in as `vendor1`.
2. Send a request with `vendorId` set to vendor B.

Example:

```js
await fetch('/api/meal/total-meals', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ date: '2026-03-12', vendorId: 'VENDOR_B_ID', mealType: 'lunch' }),
}).then(async r => ({ status: r.status, body: await r.json() }));
```

Expected secure result:

- Request fails with `403`.

Vulnerability signal:

- Vendor1 receives meal counts for vendor B.

#### B5. Admin endpoint access control

Purpose:

- Ensure non-admin users cannot mutate vendor or admin-managed state.

Routes:

- `POST /api/vendor/addVendor`
- `PUT /api/vendor/updateVendor/[id]`
- `POST /api/admin/upload-vendor-selection`
- `PATCH /api/controls/feedback-toggle`
- `GET /api/vendor/feedback-analysis`

Method:

1. Capture one legitimate request as admin.
2. Replay it while logged in as `student1` and `vendor1`.

Expected secure result:

- Non-admin users receive `403`.

Vulnerability signal:

- Any non-admin user can modify vendor data, upload selections, change toggles, or view admin-only feedback analytics.

### C. QR Flow Tests

#### C1. Multiple token issuance

Purpose:

- Verify whether one student can mint many still-valid QR tokens for the same meal window.

Route:

- `GET /api/meal/generate-qr`

Method:

Run as `student1`:

```js
await Promise.all([
  fetch('/api/meal/generate-qr', { credentials: 'include' }).then(r => r.json()),
  fetch('/api/meal/generate-qr', { credentials: 'include' }).then(r => r.json()),
  fetch('/api/meal/generate-qr', { credentials: 'include' }).then(r => r.json()),
]);
```

Expected secure result:

- Only one active token is possible, or subsequent issuance attempts are blocked.

Vulnerability signal:

- Multiple successful token responses are returned before any redemption.

#### C2. Duplicate redemption race

Purpose:

- Verify whether two concurrent redemption requests can create duplicate meal records.

Route:

- `POST /api/meal/verify-qr`

Method:

Run as `vendor1` or `admin1` using the same token twice in parallel:

```js
const token = 'PASTE_TOKEN';
const vendorId = ['PASTE_VENDOR_ID'];

await Promise.all([
  fetch('/api/meal/verify-qr', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, vendorId }),
  }).then(r => r.json()),
  fetch('/api/meal/verify-qr', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, vendorId }),
  }).then(r => r.json()),
]);
```

Expected secure result:

- Exactly one request succeeds.

Vulnerability signal:

- Both requests succeed, or the database contains two meal rows for the same user and meal/day.

#### C3. Meal-boundary reuse

Purpose:

- Verify whether a token minted at the end of one meal window can be redeemed in another window.

Method:

1. Generate a token near the end of breakfast or lunch.
2. Wait until the next meal window begins while token TTL remains valid.
3. Redeem the old token.

Expected secure result:

- Token is rejected because meal context changed.

Vulnerability signal:

- Token is accepted in a different meal window.

#### C4. Tampered token validation

Purpose:

- Verify JWT tampering is correctly rejected.

Method:

1. Generate a valid token.
2. Modify one character in the token.
3. Submit it to `/api/meal/verify-qr`.

Expected secure result:

- Request fails with invalid-token semantics.

Vulnerability signal:

- Tampered token is accepted.

#### C5. Expired token validation

Purpose:

- Verify token expiry is enforced.

Method:

1. Generate a valid token.
2. Wait past 15 minutes.
3. Redeem it.

Expected secure result:

- Request fails with expired-token semantics.

Vulnerability signal:

- Expired token is accepted.

#### C6. Cross-vendor regression check

Purpose:

- Confirm vendor scoping still blocks cross-vendor redemption.

Method:

1. Bind `vendor1` to vendor A.
2. Obtain a token for a student assigned to vendor B.
3. Redeem that token while logged in as `vendor1`.

Expected secure result:

- Request fails with `403`.

Vulnerability signal:

- Vendor1 can redeem a token for vendor B.

#### C7. Verification response minimization

Purpose:

- Check whether the scanner receives more user data than needed.

Method:

1. Perform one successful verification.
2. Inspect the JSON response body.

Expected secure result:

- Only minimal fields such as `id`, `name`, and optional `picture` are returned.

Vulnerability signal:

- Full user object is returned, including role, hostel, batch, vendor binding, or future sensitive fields.

### D. Feedback Flow Tests

#### D1. Submit feedback for any vendor

Purpose:

- Verify whether any authenticated user can submit feedback for any vendor id.

Route:

- `POST /api/vendor/vendorFeedbackForm`

Method:

1. Log in as `student1`.
2. Submit feedback for vendor B even if student1 is assigned to vendor A.

Example:

```js
await fetch('/api/vendor/vendorFeedbackForm', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    vendor: 'VENDOR_B_ID',
    feedback: 'test feedback',
    ratings: {
      hygiene: 5,
      quantity: 5,
      timeliness: 5,
      variety: 5,
      staff: 5,
      overall: 5,
    },
  }),
}).then(async r => ({ status: r.status, body: await r.json() }));
```

Expected secure result:

- Backend verifies that the user is allowed to rate that vendor.

Vulnerability signal:

- Any authenticated user can rate any vendor id.

#### D2. Duplicate feedback spam

Purpose:

- Verify whether a user can submit feedback repeatedly for the same vendor.

Method:

1. Submit the same feedback payload several times.
2. Check whether all rows are stored.

Expected secure result:

- Backend rate-limits or enforces one feedback per user/vendor/window.

Vulnerability signal:

- Unlimited duplicate feedback rows are accepted.

#### D3. Feedback while toggle is disabled

Purpose:

- Verify whether the backend enforces the feedback toggle, not just the UI.

Method:

1. As admin, set feedback toggle to disabled.
2. As student, submit feedback directly to the API.

Expected secure result:

- Backend rejects feedback when the toggle is disabled.

Vulnerability signal:

- API accepts feedback even though the feature is disabled in the control state.

#### D4. Non-student feedback submission

Purpose:

- Verify whether vendor or admin accounts can submit normal user feedback.

Method:

1. Log in as `vendor1` and submit to `/api/vendor/vendorFeedbackForm`.
2. Repeat as `admin1`.

Expected secure result:

- Only intended roles can submit feedback.

Vulnerability signal:

- Vendor/admin accounts can submit end-user vendor feedback.

### E. Data Exposure Tests

#### E1. User profile exposure

Purpose:

- Inspect what fields are returned by `/api/user/me`.

Method:

1. Log in as each role.
2. Call `/api/user/me`.
3. Record the fields returned.

Expected secure result:

- Only fields required by the client are returned.

Vulnerability signal:

- Unnecessary internal metadata is exposed broadly.

#### E2. Latest vendor selection exposure

Purpose:

- Ensure `/api/user/latest-vendor` only returns the caller’s data.

Method:

1. Log in as `student1` and capture response.
2. Try changing any client-side state or URL path to retrieve another student’s selection.

Expected secure result:

- Caller only receives their own selection.

Vulnerability signal:

- Another user’s selection can be retrieved.

#### E3. Public control state disclosure

Purpose:

- Decide whether exposing the feedback toggle publicly is acceptable.

Route:

- `GET /api/controls/feedback-toggle`

Method:

1. Request the route anonymously.
2. Request it as each role.

Expected secure result:

- Behavior matches intended product policy.

Vulnerability signal:

- Public disclosure of admin-controlled feature state is considered sensitive by product requirements.

### F. Upload and Parser Robustness Tests

#### F1. Oversized spreadsheet upload

Purpose:

- Check resilience of `POST /api/admin/upload-vendor-selection` to very large files.

Method:

1. Upload a very large `.xlsx` or `.csv` file.
2. Observe memory, latency, and failure mode.

Expected secure result:

- Upload is rejected with a controlled error or size limit.

Vulnerability signal:

- Server hangs, crashes, or consumes excessive resources.

#### F2. Malformed spreadsheet upload

Purpose:

- Check parser behavior on malformed input.

Method:

1. Rename a non-spreadsheet file to `.xlsx`.
2. Upload it.

Expected secure result:

- Request fails safely with a clear error.

Vulnerability signal:

- Unhandled exception, crash, or partial unwanted writes.

#### F3. Formula injection persistence

Purpose:

- Check whether imported spreadsheet values that start with `=`, `+`, `-`, or `@` are stored unsafely and later exported or rendered.

Method:

1. In spreadsheet cells such as `Name`, `Batch`, or vendor fields, insert payloads like `=HYPERLINK("http://example.com")`.
2. Upload the file.
3. Review where those values appear later in the UI or exports.

Expected secure result:

- Dangerous formula-like content is neutralized before later export or spreadsheet reuse.

Vulnerability signal:

- Imported formula payloads persist and can trigger in downstream spreadsheet workflows.

#### F4. Menu upload malformed content

Purpose:

- Check `POST /api/vendor/addVendor` and `PUT /api/vendor/updateVendor/[id]` for parser robustness.

Method:

1. Upload malformed menu CSV content.
2. Try extremely long lines and unexpected delimiters.

Expected secure result:

- Request fails safely with no partial corruption.

Vulnerability signal:

- Crash, unhandled exception, or corrupted menu/vendor state.

### G. Input Validation Tests

#### G1. Invalid enum and type coercion

Purpose:

- Check server behavior with malformed values.

Targets:

- `mealType` in `/api/meal/total-meals`
- `month` and `year` in `/api/vendor/choice-analysis`
- `ratings.*` in `/api/vendor/vendorFeedbackForm`
- `mealsOptions` in vendor add/update routes

Method:

1. Send strings, arrays, objects, negative numbers, huge values, and nulls.
2. Observe whether validation is explicit or accidental.

Expected secure result:

- Invalid input is rejected with controlled `400` responses.

Vulnerability signal:

- Server accepts malformed values, throws unhandled exceptions, or coerces dangerous input unexpectedly.

#### G2. Unexpected array/object input in QR verification

Purpose:

- Check whether `vendorId` handling can be confused through array shape or mixed-type input.

Route:

- `POST /api/meal/verify-qr`

Method:

Try payloads such as:

- `vendorId: []`
- `vendorId: ["A", "B", 123]`
- `vendorId: { id: "A" }`
- `vendorId: null`

Expected secure result:

- Server rejects malformed input with `400`.

Vulnerability signal:

- Server accepts malformed shapes or falls into unintended authorization logic.

### H. Cache and Staleness Tests

#### H1. Vendor cache staleness after updates

Purpose:

- Ensure cached vendor data does not expose deleted or outdated values longer than intended.

Route:

- `GET /api/vendor/getVendors`

Method:

1. As admin, update a vendor.
2. Immediately fetch vendor lists as student and vendor.
3. Confirm revalidation works.

Expected secure result:

- Updated values appear promptly according to revalidation intent.

Vulnerability signal:

- Sensitive stale data remains visible beyond intended cache lifetime.

## Suggested Execution Order

Run in this order so failures are easier to attribute:

1. Authentication baseline tests
2. Role and authorization tests
3. QR flow integrity tests
4. Feedback abuse tests
5. Data exposure tests
6. Upload robustness tests
7. Cache and staleness tests

## Recording Template

For each test, record:

- test id
- role used
- request payload
- response status
- response body summary
- database side effects
- result: `secure`, `vulnerable`, or `needs review`
- notes

## High-Priority Tests

If you only run a short set first, prioritize these:

1. `C2` duplicate redemption race
2. `C1` multiple token issuance
3. `B1` non-student access to QR routes
4. `D3` feedback submission while toggle is disabled
5. `D2` duplicate feedback spam
6. `B5` admin endpoint access control regression
