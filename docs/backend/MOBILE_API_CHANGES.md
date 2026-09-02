# API changes for the mobile QR screen

For the developer building the student-facing "show my meal QR" screen. Scoped to just that — the
vendor scanner, admin and analytics endpoints are not covered.

Baseline is commit `19aa614^`, when the QR was still valid for **15 minutes**.

Auth is unchanged: send the Clerk session token as `Authorization: Bearer <token>`. Every `/api/*`
route needs a valid session.

---

## The one change that breaks a working app

`GET /api/meal/generate-qr` — **the token now expires in 30 seconds, not 15 minutes.**

That is the *only* change to this endpoint. The request takes no parameters and the success response
is unchanged:

```json
{ "success": true, "token": "eyJhbGciOiJIUzI1NiIs..." }
```

```diff
- expiresIn: "15m"
+ expiresIn: "30s"
```

**Why:** a 15-minute code could be screenshotted and shared, letting one opt-in feed several people.

**What the screen must do now.** If it fetches a token once and leaves it on screen, the code dies
30 seconds in and the vendor's scanner reports `QR code has expired.`

1. Show a **countdown from 30**.
2. At zero, **blur/hide the QR and show a Refresh button** — don't silently keep showing a dead code,
   and don't auto-refresh on a loop (the student may leave the screen open).
3. Also refresh when the screen **regains focus** or have a **button to refresh**.
4. **Never cache the token** across mounts or app launches.

The token's `exp` claim is authoritative if you'd rather read it than hardcode 30. Don't trust the
device clock for the cutoff — treat the countdown as UI only; the server decides validity.

---

## What to render when there's no QR

`generate-qr` returns a QR only when the student is actually eligible *right now*. These are normal
outcomes, not crashes — the screen needs a state for each:

| Status | `message` | Meaning for the UI |
| --- | --- | --- |
| 200 | — | show the QR + countdown |
| 403 | `Wrong meal time.` | outside any meal window — say when the next one opens |
| 403 | `Mess not opted in for this month.` | no opt-in — tell them to contact an admin |
| 403 | `Vendor does not offer <meal>.` | their vendor skips this meal |
| 403 | `You have already scanned for this meal.` | already collected — show as done, not as an error |
| 401 | `Unauthorized` | no valid session — send to sign-in |
| 500 | `Internal server error` / `Server configuration error` | fault — offer retry |

**Only the 500s are errors.** The 403s are the app doing its job; styling them all red makes the
screen look broken during normal use. A calmer "info" treatment fits better, with a retry offered
only where retrying could help.

⚠️ **Branch on the HTTP status, not the `message` string.** Those strings are UI copy and will be
reworded. If you need to distinguish the three 403s programmatically, tell us and we'll add a stable
`code` field — that's additive and won't break your current handling.

---

## Flip to "Verified" without making the student wait

`GET /api/meal/status` — poll while the QR is displayed to detect that a vendor has scanned it.

```json
{ "success": true, "status": "scanned" }      // vendor has scanned this meal
{ "success": true, "status": "not_scanned" }  // not yet
```

Also returns `401 Unauthorized`, and `403 Wrong meal time.` outside a meal window.

Pairs well with the 30-second token: poll every 10-20 seconds and switch the screen to a success state
as soon as `scanned` appears, instead of relying on the vendor to say so. Stop polling once you see
`scanned`.

---

## Checklist

- [ ] 30s countdown, refresh at zero, refresh on focus, no token caching
- [ ] A state for each 403 from `generate-qr`, styled as information rather than failure
- [ ] Poll `/api/meal/status` while the QR is shown; stop on `scanned`
- [ ] Branch on status codes, not `message` text
