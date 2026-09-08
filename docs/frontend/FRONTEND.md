# Frontend guide

Next.js 15 App Router + React 19 + Tailwind v4 + shadcn-style Radix UI. See
[ARCHITECTURE.md](../ARCHITECTURE.md) for the big picture.

## Routing — role-grouped App Router

Pages live under `app/(pages)/` in **route groups by role** (the `(group)` folders don't affect the URL):

```
(pages)/(student)/student/…     → /student/dashboard, /student/menu, /student/feedback, /student/mealHistory
(pages)/(admin)/admin/…         → /admin/dashboard, /admin/manageVendor, /admin/updateMenu,
                                  /admin/manageStudents (directory + bulk upload), /admin/adminControls,
                                  /admin/analytics (demand + meals), /admin/feedBackAnalysis,
                                  /admin/verifyStudentQR
(pages)/(vendorUser)/vendorUser/…→ /vendorUser/dashboard, /vendorUser/verifyStudentQR, /vendorUser/totalMeals
(pages)/login/…                 → Clerk sign-in + role redirect
```

The `/admin/*` area is **shared by `admin` and `superAdmin`**; superAdmin simply sees more (see Guards & Nav).

## Layout shell

Each role group's `layout.tsx` is a client component that wraps:

```
<Protected>                              ← auth/role gate (redirects if not allowed)
  <AppLayoutShell navConfig={…}>         ← Sidebar + Topbar + <main>
    {children}
  </AppLayoutShell>
</Protected>
```

- `components/common/layout/AppLayoutShell.tsx` — the frame (collapsible `Sidebar`, `Topbar`, scroll area).
- The admin layout builds its `navConfig` per-role: `filterNavConfigByRole(roleNavConfig.admin, user.role)`
  and labels it "Admin" vs "Super Admin".

## Nav config

`lib/dashboard/navigation.ts` is the single source for sidebar items:
- `roleNavConfig` — `{ student, admin, vendor }` shells, each with `items: AppNavItem[]`.
- `AppNavItem.roles?: ('admin'|'superAdmin')[]` — within the admin shell, tags which role sees an item.
- `filterNavConfigByRole(config, role)` / `canAccessNavItem(item, role)` — the filter used by the admin layout.
- `isNavItemActive(pathname, href)` — active-link logic.

To add an admin page: create the page, add an `AppNavItem` (with `roles`), and (if superAdmin-only) wrap
the page in `RequireRole`.

## Guards

Two layers, both client-side (the **API** `requireRole` is the real security boundary — see
[backend/CONVENTIONS.md](../backend/CONVENTIONS.md#roles--access)):

- **`Protected`** (one per role group, e.g. `(admin)/admin/Protected.tsx`) — gates the whole shell.
  Admin's admits `admin` **and** `superAdmin`; student's admits `student`; vendor's admits `vendor`.
  Redirects to `/login` while `loading` shows a skeleton.
- **`RequireRole`** (`(admin)/admin/RequireRole.tsx`) — wraps individual **superAdmin-only** pages
  (Manage Vendors, Upload Selection, Verify QR) and bounces others to `/admin/dashboard`.

## Contexts

- **`context/UserContext.tsx`** → `useUser()` gives `{ user, loading, notRegistered, authError }`.
  On Clerk load it fetches `/api/user/me` for the DB user (role, email, batch, …) and enforces the
  domain restriction. **This is how the client knows the role.**
  - It **never synthesises a user from Clerk data.** A row in `users` is the authorization, so a
    role-less stand-in would slip past the guards and land an admin on the student dashboard.
  - `403 { code: "not_registered" }` sets `notRegistered`; the login page and every `Protected`
    shell route those users to **`/noAccess`** instead of `/login`, which they already passed.
  - Any other failure leaves `user` null, so a transient DB outage fails closed (back to `/login`)
    rather than silently downgrading the role.
- **`context/DashboardContext.tsx`** → student dashboard data (`latestSelection`, `isFeedbackEnabled`).

## Data fetching

Use **`lib/axiosInstance.ts`** for all client→API calls — it attaches the Clerk bearer token and
`withCredentials`. Form submits build a `FormData` and POST/PUT to the route handler; JSON for simple
mutations. Show a `sonner` `toast` for success/error.

## UI kit & conventions

- `components/ui/*` — shadcn-style Radix primitives (`Button`, `Card`, `Input`, `Select`, `Dialog`,
  `Checkbox`, `Skeleton`, `Badge`, …). Compose these; don't hand-roll.
- `components/common/` — `layout/PageHeader`, `EventCard`, `Skeletons`, shells.
- **Conventions:** `"use client"` on interactive pages; `cn()` (`lib/utils`) for class merging;
  theme tokens (`text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`) — not raw colors;
  loading states use `Skeleton` (see `mealHistory` for a structured, staggered skeleton);
  destructive actions confirm via `Dialog`; kebab-case route folders, PascalCase components.

## Page map (by role)

| Role | Pages |
|---|---|
| student | Dashboard (QR panel), Vendors/Menu, Feedback, **Meal History** |
| vendor | Dashboard, **Verify QR** (scoped to own vendor), **Total Meals** (own vendor) |
| admin | Dashboard, Update Menu, Choice/Feedback Analysis, Controls, Total Meals |
| superAdmin | all admin pages **+** Verify QR, Manage Vendors, Upload Selection, and User Mgmt + Vendor Directory inside Controls |
