# QR Flow Security Review

Date: 2026-03-12

## Scope

This review covers the meal QR generation and verification flow, including:

- `app/api/meal/generate-qr/route.ts`
- `app/api/meal/verify-qr/route.ts`
- `app/api/meal/status/route.ts`
- `lib/auth-helper.ts`
- `lib/db/schema.ts`
- `app/api/vendor/getVendors/route.ts`
- `app/(pages)/(student)/student/getFood/page.tsx`
- `app/(pages)/(vendorUser)/vendorUser/verifyStudentQR/page.tsx`

## Flow Summary

1. A signed-in student page calls `GET /api/meal/generate-qr`.
2. The backend checks meal time, vendor selection, and whether a meal was already recorded for that user and meal on that day.
3. If allowed, the backend signs a JWT containing `userId` and `vendorId` with a 15 minute expiry.
4. A vendor or admin scanner page reads the QR and posts `{ token, vendorId }` to `POST /api/meal/verify-qr`.
5. The verifier checks the JWT signature and expiry, checks that the supplied `vendorId` matches the `vendorId` inside the token, checks the current meal window, and inserts a meal record.

## Existing Security Controls

The flow has some valid protections already:

- API routes are behind Clerk auth middleware in `middleware.ts`.
- QR payloads are signed server-side with `JWT_SECRET_KEY` in `app/api/meal/generate-qr/route.ts`.
- Tokens expire after 15 minutes.
- Invalid and expired JWTs are rejected in `app/api/meal/verify-qr/route.ts`.
- Vendor users are now server-side scoped through `users.vendorId`, `getScopedVendorIds()`, and the verifier path in `app/api/meal/verify-qr/route.ts`.
- The vendor list endpoint restricts vendor-role users to their scoped vendor ids.
- The verifier checks the current meal window before recording a meal.

These controls help, but they do not fully secure the QR flow.

The earlier concern that any vendor could verify for any other vendor appears to be partially mitigated in the current codebase. I did not confirm a cross-vendor verification bypass for vendor-role users in the current implementation.

## Findings

### 1. High: Duplicate meal protection is race-prone because the database uniqueness model is wrong

#### Evidence

- Verification first checks for an existing meal in application code: `app/api/meal/verify-qr/route.ts:57-69`.
- It then inserts with `onConflictDoNothing()` and assumes the database unique constraint will stop duplicates: `app/api/meal/verify-qr/route.ts:71-80`.
- The unique index is defined on `(forUserId, mealType, date)` where `date` is a full timestamp: `lib/db/schema.ts:49-58`.

#### Impact

That index does not enforce one meal per user per day. It enforces one meal per user per exact timestamp. Two inserts a few milliseconds apart will have different timestamps, so both rows can be inserted successfully.

This means two concurrent scans can both succeed and record duplicate meals for the same user and meal window.

#### Practical trigger

This is easier to hit because the scanner callback can fire rapidly and the frontend does not reject repeated submits before the async state change settles:

- The QR callback calls `handleVerify(decodedText)` directly: `app/(pages)/(vendorUser)/vendorUser/verifyStudentQR/page.tsx:108-117`.
- `handleVerify` does not short-circuit when a verification is already in progress before sending the request: `app/(pages)/(vendorUser)/vendorUser/verifyStudentQR/page.tsx:143-166`.

So the flow has both:

- a backend race window
- a frontend pattern that can amplify that race window

#### Recommendation

- Replace the uniqueness strategy with a real day-bounded key. For example, store a normalized meal date column such as `meal_day` and create a unique index on `(forUserId, mealType, meal_day)`.
- Keep the application-level existence check for user-friendly errors, but treat the database constraint as the real enforcement.
- Add an early `isProcessing` guard in the scanner handler to reduce duplicate submissions from the UI.

### 2. Medium: A student can mint multiple active QR tokens for the same meal before the first scan

#### Evidence

- Generation blocks only if a meal record already exists: `app/api/meal/generate-qr/route.ts:48-60`.
- If no meal has been recorded yet, the route signs and returns a new token every time it is called: `app/api/meal/generate-qr/route.ts:68-78`.
- There is no token issuance table, `jti`, nonce, or one-time-use record in the schema.

#### Impact

The same student can refresh or script the generate endpoint and obtain multiple valid QR tokens during the same meal window. Normally only one of them should be redeemable, but because the verification side also has a race issue, this increases the chance of duplicate meal acceptance.

#### Recommendation

- Introduce single-use token semantics with a server-side issuance record or `jti` tracking.
- Alternatively, issue one token per user and meal window and reuse it until it expires or is consumed.

### 3. Medium: The token is not bound to meal type or meal day

#### Evidence

- The token payload contains only `userId` and `vendorId`: `app/api/meal/generate-qr/route.ts:68-71`.
- Verification derives the meal type from the current server time at scan time instead of from the token: `app/api/meal/verify-qr/route.ts:50-53`.

#### Impact

The token is valid for 15 minutes, but it does not carry the meal context under which it was issued. A token created near a meal boundary can potentially be redeemed under a different meal window if the expiry overlaps and operational timing allows it.

This is a design weakness even if it is not always easy to exploit in practice.

#### Recommendation

- Include at least `mealType` and a normalized meal day in the signed payload.
- Verify those claims exactly on redemption.

### 4. Medium: QR generation and meal status do not explicitly enforce student-only authorization

#### Evidence

- Generation uses `getDbUser()` only: `app/api/meal/generate-qr/route.ts:11-14`.
- Status uses `getDbUser()` only: `app/api/meal/status/route.ts:10-13`.
- Neither route calls `requireRole(['student'])`.
- New allowed-domain sign-ins are auto-created as `student` in `lib/auth-helper.ts:36-47`.

#### Impact

These are not public endpoints, but they do broaden who can mint QR tokens and query meal state. Any authenticated database user who satisfies the vendor-selection precondition can generate a token, and any authenticated database user can hit the status endpoint for their account, even though the routes do not explicitly enforce student-only access.

#### Recommendation

- Require the student role on `generate-qr` and `status`.
- Tighten first-login provisioning so domain membership alone does not automatically create a valid student account if that is not the intended policy.

### 5. Low: Verification returns more user data than is necessary

#### Evidence

- The verifier queries the full user row after scan: `app/api/meal/verify-qr/route.ts:83-85`.
- It returns the entire user object in the API response: `app/api/meal/verify-qr/route.ts:91`.

#### Impact

The scanner UI only appears to need identity confirmation fields, but the API can expose more data than necessary from the users table. Over time this can become a privacy leak if more personal fields are added to the schema.

#### Recommendation

- Return only a minimal, explicit projection such as `id`, `name`, and optionally `picture`.

### 6. Low: The scanner UI can amplify duplicate verification attempts before the in-flight state settles

#### Evidence

- The QR callback invokes `handleVerify(decodedText)` directly on each decode event: `app/(pages)/(vendorUser)/vendorUser/verifyStudentQR/page.tsx:116` and `app/(pages)/(admin)/admin/verifyStudentQR/page.tsx:117`.
- `setIsProcessing(true)` is only applied inside the async handler after the callback has already fired: `app/(pages)/(vendorUser)/vendorUser/verifyStudentQR/page.tsx:148` and `app/(pages)/(admin)/admin/verifyStudentQR/page.tsx:149`.
- The handler does not early-return when a verification is already in progress.

#### Impact

If the scanner emits the same QR more than once in quick succession, the UI can dispatch multiple verification requests before the component re-renders into the processing state. This does not create the backend integrity issue on its own, but it makes the duplicate-meal race materially easier to hit.

#### Recommendation

- Add an immediate in-memory guard at the start of `handleVerify()`.
- Debounce or temporarily disable the scanner callback as soon as a decode is received.

## Additional Notes

### Cross-vendor verification status

The current code appears improved relative to the earlier review draft:

- `users` now has a server-side `vendorId` field: `lib/db/schema.ts:14`.
- Vendor scope is derived from the authenticated user in `getScopedVendorIds()`: `lib/auth-helper.ts:77`.
- The verifier uses that scoped vendor list for vendor-role callers: `app/api/meal/verify-qr/route.ts:17` and `app/api/meal/verify-qr/route.ts:51`.
- The vendor list endpoint filters vendor-role users down to their scoped vendors: `app/api/vendor/getVendors/route.ts:30-38`.

I did not confirm a current path where a normal vendor-role user can verify a QR for an unrelated vendor solely by tampering with the client request body.

### Role escalation review

I did not find an application-level endpoint that lets a normal user change their own role to `vendor` or `admin`.

Evidence:

- Roles are sourced from the database in `lib/auth-helper.ts:18-53`.
- Backend authorization trusts that stored role in `lib/auth-helper.ts:56-67`.
- First login auto-provisioning creates new users only as `student`: `lib/auth-helper.ts:36-47`.
- The admin spreadsheet import also creates users only as `student` and only updates `hostel` and `batch` on existing users: `app/api/admin/upload-vendor-selection/route.ts:96-113`.
- I did not find any route in the application code that updates `users.role`.

Conclusion:

- No confirmed self-service role escalation path from `student` to `vendor` or `admin` was found in the current app routes.

What still matters:

- If an attacker can change the `users.role` value by some other means, all backend checks will trust it immediately because `requireRole()` reads the role directly from the database.
- Frontend role handling is not security-sensitive. Even if a user tampers with client state in `context/UserContext.tsx`, backend routes still rely on `getDbUser()` and `requireRole()` rather than the client-provided role.
- The larger confirmed QR issue is not role escalation, but that vendor-role users are not bound to a specific vendor identity at verification time.

### Frontend guards are not security boundaries

The student and vendor page guards are useful for UX, but they do not replace backend authorization:

- Student page guard: `app/(pages)/(student)/student/Protected.tsx:11-16`
- Vendor page guard: `app/(pages)/(vendorUser)/vendorUser/Protected.tsx:11-15`

The backend must treat all client input as untrusted, including vendor selection.

### Confirmed good behavior

The following behaviors are correct and should be preserved when fixing the issues:

- Anonymous callers should not reach QR APIs because API routes are authenticated.
- JWT signature and expiry checks are in place.
- Vendor mismatch between token and requested vendor is rejected.
- Wrong meal-time redemption is rejected.

## Risk Ranking Summary

1. High: Duplicate meal race due to ineffective database uniqueness on timestamp.
2. Medium: Multiple active QR tokens can be minted before first redemption.
3. Medium: Token not bound to meal type or meal day.
4. Medium: Generation and status lack explicit student-only authorization.
5. Low: Verification returns more user data than necessary.
6. Low: Scanner callback can amplify duplicate verification attempts.

## Recommended Fix Order

1. Fix the meals uniqueness model so one user can only be recorded once per meal type per day.
2. Add one-time or single-window token issuance semantics.
3. Add `mealType` and meal-day claims to the token and verify them on redemption.
4. Require student role on generation and status routes.
5. Add an immediate frontend in-flight guard to reduce duplicate verification fan-out.
6. Minimize user data returned after verification.

## Safe Test Cases

1. Cross-vendor regression test:
   - Log in as a vendor-role user whose `users.vendorId` is bound to vendor A.
   - Send a crafted verification request for a QR token whose embedded vendor id belongs to vendor B.
   - The request should be rejected with `403`.

2. Duplicate scan race test:
   - Use the same QR token.
   - Submit two verification requests in parallel.
   - If both succeed or two meal rows are created, the uniqueness model is broken.

3. Multiple token issuance test:
   - Call `GET /api/meal/generate-qr` repeatedly before any scan.
   - If each call returns a valid token, there is no single-use issuance control.

4. Meal-boundary test:
   - Generate a token close to the end of a meal window.
   - Attempt to redeem it after the meal window changes but before token expiry.
   - If redemption succeeds under the new meal type, the token is not properly bound to meal context.

5. Student-only authorization test:
   - Call `GET /api/meal/generate-qr` and `GET /api/meal/status` using a non-student authenticated account.
   - If the routes do not reject the caller on role grounds, the authorization gap is confirmed.

## Verification Playbooks

These steps are meant for controlled testing in your own environment.

### Test setup notes

- Because API routes are behind Clerk auth, the easiest way to test is from a logged-in browser session using DevTools console, or from Burp Repeater after capturing a valid authenticated request.
- For browser-console tests, open the app while logged in as the target role and run `fetch()` requests from the same origin so session cookies are sent automatically.
- For Burp tests, capture one legitimate request from the app first, then replay and modify it.

### 1. Duplicate scan race verification

Goal:

- Confirm whether the same QR can be redeemed twice when two verification requests arrive close together.

Prerequisites:

- One student account with a valid QR token for the current meal window.
- One vendor or admin account allowed to access the scanner.
- A valid token copied from the student page or from the `GET /api/meal/generate-qr` response.

Browser-console method:

Run this from a logged-in vendor or admin browser tab after selecting the correct vendor id:

```js
const token = 'PASTE_QR_TOKEN_HERE';
const vendorId = ['PASTE_VENDOR_ID_HERE'];

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

What confirms the issue:

- Both responses return success.
- Or one succeeds and the database ends up with two meal rows for the same `forUserId`, `mealType`, and day.

Burp method:

1. Capture a normal `POST /api/meal/verify-qr` request.
2. Send it to Repeater in two tabs.
3. Fire both requests as close together as possible.
4. Compare responses and inspect the database afterward.

Expected secure behavior:

- Exactly one request succeeds.
- The other request fails with an already-scanned style error.

### 2. Multiple token issuance verification

Goal:

- Confirm whether the same student can mint multiple still-valid QR tokens before any redemption happens.

Prerequisites:

- Logged in as a student who is eligible for the current meal.

Browser-console method:

```js
await Promise.all([
   fetch('/api/meal/generate-qr', { credentials: 'include' }).then(r => r.json()),
   fetch('/api/meal/generate-qr', { credentials: 'include' }).then(r => r.json()),
   fetch('/api/meal/generate-qr', { credentials: 'include' }).then(r => r.json()),
]);
```

What confirms the issue:

- Multiple calls return `success: true` with token strings before any scan has happened.

Expected secure behavior:

- Either the same still-active token is returned each time, or later requests are rejected until the first token expires or is consumed.

### 3. Meal-boundary verification

Goal:

- Check whether a token minted at the end of one meal window can be redeemed in the next meal window if it is still within the 15 minute JWT expiry.

Prerequisites:

- A time boundary between meal windows.
- A student eligible for both windows operationally.

Procedure:

1. Near the end of a meal window, call `GET /api/meal/generate-qr` as the student and save the token.
2. Wait until the server-side meal window changes.
3. Before the 15 minute expiry elapses, redeem the token through `POST /api/meal/verify-qr`.

What confirms the issue:

- The token is accepted after the meal window changed.

Expected secure behavior:

- Redemption fails because the signed token claims no longer match the meal context.

### 4. Student-only authorization verification

Goal:

- Confirm that non-student authenticated users can still access student QR endpoints.

Prerequisites:

- A logged-in vendor or admin account.

Browser-console method:

```js
await fetch('/api/meal/generate-qr', { credentials: 'include' }).then(async r => ({
   status: r.status,
   body: await r.json(),
}));

await fetch('/api/meal/status', { credentials: 'include' }).then(async r => ({
   status: r.status,
   body: await r.json(),
}));
```

What confirms the issue:

- The route returns something other than `403 Forbidden` based on role.
- In the generate case, a non-student account receives a token if the account also satisfies the selection preconditions.

Expected secure behavior:

- Both routes reject non-student roles explicitly.

### 5. Verification response minimization check

Goal:

- Confirm exactly what user data is exposed to the scanner after a successful redemption.

Procedure:

1. Perform one legitimate verification.
2. Inspect the JSON response body.

What confirms the issue:

- The response includes the full database user object instead of a minimal projection.

Current behavior to expect:

- The response returns `user: foruser`, which may include role, vendor binding, hostel, batch, and any future user-table fields.

### 6. Cross-vendor regression check

Goal:

- Validate that the earlier cross-vendor concern is no longer exploitable for vendor-role users.

Prerequisites:

- Vendor user A is bound to vendor A in `users.vendorId`.
- A QR token exists whose embedded vendor id belongs to vendor B.

Procedure:

1. Log in as vendor user A.
2. Capture a valid `POST /api/meal/verify-qr` request.
3. Replace the token with one issued for vendor B.
4. Send the request.

Expected secure behavior:

- The request fails with `403` because `getScopedVendorIds()` should restrict the caller to vendor A.

If it unexpectedly succeeds:

- Re-check the user’s `vendorId` binding in the database.
- Treat it as a regression in vendor scoping.