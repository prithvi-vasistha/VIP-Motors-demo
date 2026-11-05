#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if command -v pnpm >/dev/null 2>&1; then exec pnpm "$@"; fi
VIP_RUNTIME="${HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies"
if [ -x "$VIP_RUNTIME/bin/fallback/pnpm" ]; then
  export PATH="$VIP_RUNTIME/node/bin:$PATH"
  exec "$VIP_RUNTIME/bin/fallback/pnpm" "$@"
fi
printf '%s\n' 'Install Node.js 20.9+ and pnpm 11, then run pnpm install --frozen-lockfile.' >&2
exit 1
