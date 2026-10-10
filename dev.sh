#!/usr/bin/env bash
#
# DEV setup + run. Starts the local Postgres container, installs deps, optionally migrates / seeds,
# then starts the dev server. Uses .env.local → the Docker DB (see docs/DEVELOPMENT.md).
#
# Needs bash — on Windows use Git Bash. The same steps are available as cross-platform pnpm
# scripts that work anywhere, including PowerShell:
#   pnpm db:up · pnpm db:migrate · pnpm db:seed · pnpm db:reset · pnpm db:psql · pnpm dev
#
# Usage:  ./dev.sh [options]
#   -s, --seed          Seed demo data (WIPES the dev DB) before starting
#   -b, --bulk[=N]      Also seed N bulk students (default 3000) for upload load-testing
#       --no-migrate    Skip applying migrations
#       --no-docker     Don't touch Docker (point .env.local at an already-running Postgres)
#   -h, --help          Show this help and exit
#
# With NO options, an interactive menu lets you choose what to do. The menu options that write to the
# database (2-4) print the target host first and ask you to confirm it's the DB you meant.
#
set -euo pipefail
cd "$(dirname "$0")"

MIGRATE="yes"
SEED="no"
BULK="no"
BULK_N="3000"
DOCKER="yes"
EXPLICIT="no"   # did the user pass an action flag? (skips the menu)

# Print the header comment block (skip the shebang; stop at the first non-comment line).
usage() { awk 'NR==1{next} /^#/{sub(/^# ?/,""); print; next} {exit}' "$0"; }

for arg in "$@"; do
  case "$arg" in
    -s|--seed)      SEED="yes"; EXPLICIT="yes" ;;
    -b|--bulk)      BULK="yes"; EXPLICIT="yes" ;;
    --bulk=*)       BULK="yes"; BULK_N="${arg#*=}"; EXPLICIT="yes" ;;
    --no-migrate)   MIGRATE="no"; EXPLICIT="yes" ;;
    --no-docker)    DOCKER="no" ;;
    -h|--help)      usage; exit 0 ;;
    *) echo "Unknown option: $arg"; echo; usage; exit 1 ;;
  esac
done

# --- 1. Env (needed before the menu so we can show which database we'd write to) ---
if [ ! -f .env.local ]; then
  echo "✗ Missing .env.local — copy .env.example to .env.local and fill it in (see docs/DEVELOPMENT.md)."
  exit 1
fi

# Host + database name from DATABASE_URL — deliberately drops the credentials so the
# confirmation prompt can name the target without printing the password.
db_target() {
  local url rest
  url="$(sed -nE 's/^[[:space:]]*DATABASE_URL[[:space:]]*=[[:space:]]*//p' .env.local \
        | tail -n1 | tr -d '\r' | sed -E 's/^["'\'']//; s/["'\'']$//')"
  [ -n "$url" ] || return 1
  rest="${url#*://}"
  rest="${rest##*@}"        # longest match: a host can't contain '@', a password can
  printf '%s\n' "${rest%%\?*}"
}

# Safety gate for the menu options that write to the DB. Aborts unless the answer is yes.
confirm_db_write() {
  local target
  if ! target="$(db_target)"; then
    echo "✗ DATABASE_URL is not set in .env.local — refusing to run a database step blind."
    exit 1
  fi
  echo
  echo "⚠ About to $1."
  echo "  Target database: $target"
  echo "  Confirm this is your LOCAL dev database — never production (see docs/DEVELOPMENT.md)."
  echo "  The local one looks like: localhost:5432/mess_dev"
  read -r -p "Continue? [y/N]: " ok || ok=""
  case "$ok" in
    y|Y|yes|YES) ;;
    *) echo "Aborted — the database was not touched."; exit 0 ;;
  esac
}

# --- Interactive menu when no action flag was given ---
if [ "$EXPLICIT" = "no" ]; then
  echo "What do you want to do?"
  echo "  1) Just start the dev server"
  echo "  2) Migrate, then start"
  echo "  3) Migrate + seed demo data, then start        (WIPES the dev DB)"
  echo "  4) Migrate + seed demo + bulk students (you pick how many), then start"
  echo "  q) Quit"
  read -r -p "Choose [1-4, q] (default 1): " choice || choice="1"
  case "${choice:-1}" in
    1) MIGRATE="no" ;;
    2) MIGRATE="yes"
       confirm_db_write "apply pending migrations" ;;
    3) MIGRATE="yes"; SEED="yes"
       confirm_db_write "apply pending migrations, then WIPE and reseed demo data" ;;
    4) MIGRATE="yes"; SEED="yes"; BULK="yes"
       read -r -p "How many bulk students? [default $BULK_N] " n || n=""
       if [[ "$n" =~ ^[0-9]+$ ]]; then BULK_N="$n"; fi
       confirm_db_write "apply pending migrations, WIPE and reseed demo data, then insert $BULK_N bulk students" ;;
    q|Q) echo "Aborted."; exit 0 ;;
    *) echo "Unrecognized choice — just starting the dev server."; MIGRATE="no" ;;
  esac
fi

# --- 2. Dependencies (first run / fresh clone) ---
if [ ! -d node_modules ]; then
  echo "• Installing dependencies…"
  pnpm install
fi

# --- 2b. Local Postgres container (docker-compose.yml) ---
# Skipped when DATABASE_URL points somewhere other than this machine, so `--no-docker` is only
# needed for the unusual case of a local Postgres you manage yourself.
if [ "$DOCKER" = "yes" ]; then
  case "$(db_target || true)" in
    localhost*|127.0.0.1*|"[::1]"*)
      if ! docker info >/dev/null 2>&1; then
        echo "✗ Docker isn't running — start Docker Desktop and try again."
        echo "  (Or use --no-docker if you run Postgres yourself.)"
        exit 1
      fi
      echo "• Starting the local Postgres container (waiting for it to accept connections)…"
      # --wait blocks on the healthcheck in docker-compose.yml, so migrations below can't race
      # the first-boot initdb, which takes a few seconds on a fresh volume.
      docker compose up -d --wait db
      ;;
    *)
      echo "• DATABASE_URL is not local — leaving Docker alone."
      ;;
  esac
fi

# --- 3. Migrations (idempotent — applies only the pending ones to your dev database) ---
if [ "$MIGRATE" = "yes" ]; then
  echo "• Applying database migrations…"
  pnpm db:migrate || echo "⚠ Migration step failed — continuing (check DATABASE_URL)."
fi

# --- 4. Seed demo data (guarded; WIPES the dev DB before repopulating) ---
if [ "$SEED" = "yes" ]; then
  echo "• Seeding demo data…"
  pnpm tsx scripts/seed.ts --yes || echo "⚠ Seed failed — continuing (is DEV_SEED_EMAIL set in .env.local?)."
fi

# --- 5. Bulk students (for upload load-testing) ---
if [ "$BULK" = "yes" ]; then
  echo "• Seeding $BULK_N bulk students…"
  pnpm tsx scripts/seed-bulk-users.ts "$BULK_N" --yes || echo "⚠ Bulk seed failed — continuing."
fi

# --- 6. Run ---
echo "▶ Starting dev server (NODE_ENV=development) → http://localhost:3000"
exec pnpm dev
