#!/usr/bin/env bash
#
# DEV setup + run. Installs deps, optionally migrates / seeds, then starts the dev server.
# Uses .env.local → your Neon DEV branch (see docs/DEVELOPMENT.md).
#
# Usage:  ./dev.sh [options]
#   -s, --seed          Seed demo data (WIPES the dev DB) before starting
#   -b, --bulk[=N]      Also seed N bulk students (default 3000) for upload load-testing
#       --no-migrate    Skip applying migrations
#   -h, --help          Show this help and exit
#
# With NO options, an interactive menu lets you choose what to do.
#
set -euo pipefail
cd "$(dirname "$0")"

MIGRATE="yes"
SEED="no"
BULK="no"
BULK_N="3000"
EXPLICIT="no"   # did the user pass an action flag? (skips the menu)

# Print the header comment block (skip the shebang; stop at the first non-comment line).
usage() { awk 'NR==1{next} /^#/{sub(/^# ?/,""); print; next} {exit}' "$0"; }

for arg in "$@"; do
  case "$arg" in
    -s|--seed)      SEED="yes"; EXPLICIT="yes" ;;
    -b|--bulk)      BULK="yes"; EXPLICIT="yes" ;;
    --bulk=*)       BULK="yes"; BULK_N="${arg#*=}"; EXPLICIT="yes" ;;
    --no-migrate)   MIGRATE="no"; EXPLICIT="yes" ;;
    -h|--help)      usage; exit 0 ;;
    *) echo "Unknown option: $arg"; echo; usage; exit 1 ;;
  esac
done

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
    2) MIGRATE="yes" ;;
    3) MIGRATE="yes"; SEED="yes" ;;
    4) MIGRATE="yes"; SEED="yes"; BULK="yes"
       read -r -p "How many bulk students? [default $BULK_N] " n || n=""
       if [[ "$n" =~ ^[0-9]+$ ]]; then BULK_N="$n"; fi
       ;;
    q|Q) echo "Aborted."; exit 0 ;;
    *) echo "Unrecognized choice — just starting the dev server."; MIGRATE="no" ;;
  esac
fi

# --- 1. Env ---
if [ ! -f .env.local ]; then
  echo "✗ Missing .env.local — copy .env.example to .env.local and fill it in (see docs/DEVELOPMENT.md)."
  exit 1
fi

# --- 2. Dependencies (first run / fresh clone) ---
if [ ! -d node_modules ]; then
  echo "• Installing dependencies…"
  pnpm install
fi

# --- 3. Migrations (idempotent — applies only pending ones to your dev branch) ---
if [ "$MIGRATE" = "yes" ]; then
  echo "• Applying database migrations…"
  pnpm drizzle-kit migrate || echo "⚠ Migration step failed — continuing (check DATABASE_URL)."
fi

# --- 4. Seed demo data (guarded; WIPES the dev DB before repopulating) ---
if [ "$SEED" = "yes" ]; then
  echo "• Seeding demo data…"
  pnpm dlx tsx scripts/seed.ts --yes || echo "⚠ Seed failed — continuing (is DEV_SEED_EMAIL set in .env.local?)."
fi

# --- 5. Bulk students (for upload load-testing) ---
if [ "$BULK" = "yes" ]; then
  echo "• Seeding $BULK_N bulk students…"
  pnpm dlx tsx scripts/seed-bulk-users.ts "$BULK_N" --yes || echo "⚠ Bulk seed failed — continuing."
fi

# --- 6. Run ---
echo "▶ Starting dev server (NODE_ENV=development) → http://localhost:3000"
exec pnpm dev
