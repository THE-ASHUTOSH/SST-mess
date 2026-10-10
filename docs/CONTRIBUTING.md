# Contributing

Thanks for helping out. Setup is in [DEVELOPMENT.md](./DEVELOPMENT.md); the rules every change follows
are in [CLAUDE.md](../CLAUDE.md) (they apply to humans too).

## Flow

1. Branch off `main`: `<type>/<short-name>`, e.g. `feat/menu-editor`, `fix/qr-batch`.
2. Commit however you like on the branch.
3. Open a PR into `main`. Fill in the template — especially **API / mobile impact** and **Database**.
4. CI must pass: lint, typecheck, build, and the PR-title check.
5. PRs are **squash-merged**: the PR title becomes the single commit on `main`.

Never push to `main` directly.

## PR titles — Conventional Commits

```
<type>(<optional scope>)<optional !>: <subject>
```

| Type | Use for |
| --- | --- |
| `feat` | A new user-facing feature or endpoint |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `refactor` | Code change with no behaviour change |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `build` | Dependencies, build config, Docker |
| `ci` | GitHub Actions |
| `chore` | Anything else that doesn't touch `app/` or `lib/` behaviour |
| `revert` | Reverting an earlier commit |

- **Subject:** imperative, lowercase start, no trailing period — `add per-day editor`, not `Added editor.`
- **Scope (optional):** the area — `menu`, `qr`, `auth`, `admin`, `vendor`, `db`, `api`, `ui`.
- **Breaking change:** add `!` before the colon and explain it in the PR body. Anything that removes or
  renames an API endpoint, field, or param is breaking — the mobile app depends on the API.

Examples:

```
feat(menu): add rolling 15-day menu editor
fix(qr): show student batch on scan result
feat(api)!: replace updateMenu with /api/vendor/menu
docs: add menu API change notes
build(deps): bump next to 15.5.8
```

## Database changes

Only through `lib/db/schema.ts` → `pnpm db:generate --name <desc>` → review the SQL. Migrations are
applied to production **by hand, after the deploy** — a destructive one (`DROP`, data rewrite) needs a
backup and a rollout note in the PR. Details: [backend/CONVENTIONS.md](./backend/CONVENTIONS.md).

## Security

Never commit `.env*`, keys, database URLs, or real student data. Found a vulnerability? Don't open a
public issue — contact the maintainers privately.
