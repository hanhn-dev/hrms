#!/usr/bin/env bash
# Point live HRMS SQL connections at dev, qa, staging, or replica.
# Shell commands: dbdev, dbqa, dbstg, dbrepl.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Configs live in the classic HRMS checkout, not in this repo.
ROOT="${SWITCH_DB_ROOT:-/d/TDG HRMS/SourceCode}"
ENV_NAME="${1:-}"

case "$ENV_NAME" in
  dev|qa|staging|replica) ;;
  *)
    echo "Usage: switch-db.sh dev|qa|staging|replica" >&2
    exit 2
    ;;
esac

python_works() {
  "$@" -c 'import sys; raise SystemExit(0 if sys.version_info[0] >= 3 else 1)' >/dev/null 2>&1
}

PY=()
if command -v python >/dev/null 2>&1 && python_works python; then
  PY=(python)
elif command -v python3 >/dev/null 2>&1 && python_works python3; then
  PY=(python3)
elif command -v py >/dev/null 2>&1 && python_works py -3; then
  PY=(py -3)
else
  for candidate in \
    "/c/Program Files/Microsoft SDKs/Azure/CLI2/python.exe" \
    "/c/Python313/python.exe" \
    "/c/Python312/python.exe" \
    "/c/Python311/python.exe" \
    "/c/Users/${USERNAME:-$USER}/AppData/Local/Programs/Python/Python313/python.exe" \
    "/c/Users/${USERNAME:-$USER}/AppData/Local/Programs/Python/Python312/python.exe" \
    "/c/Users/${USERNAME:-$USER}/AppData/Local/Programs/Python/Python311/python.exe"
  do
    if [[ -f "$candidate" ]] && python_works "$candidate"; then
      PY=("$candidate")
      break
    fi
  done
fi

if [[ ${#PY[@]} -eq 0 ]]; then
  echo "Python 3 is required to switch database connections." >&2
  exit 1
fi

"${PY[@]}" "$SCRIPT_DIR/rewrite.py" "$ENV_NAME" "$ROOT"
