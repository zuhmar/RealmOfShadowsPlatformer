#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f apps/server/.env ]; then
  cp apps/server/.env.example apps/server/.env
fi
npm ci
npm run db:generate
bash scripts/ensure-dev-db.sh
npm run db:migrate
npm run build
npm test
