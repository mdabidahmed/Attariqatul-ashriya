#!/usr/bin/env bash
# Thin wrapper around `npm run dev` for anyone who would rather run a script.
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm was not found on PATH. Install Node.js 18+ and try again." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting the Vite dev server — open http://localhost:5173 (or the URL it prints)."
exec npm run dev -- "$@"
