#!/bin/bash
# Runs a Node script from the repository root, with its arguments. A hook
# started by a desktop app inherits that app's environment, which may not have
# a version manager on PATH; when `node` is missing, nvm is loaded first. The
# git hook and every agent's hook commands start the gates through it.
#
#   design-system/harness/with-node.sh design-system/harness/run-gates.mjs before-commit
set -eo pipefail
cd "$(dirname "$0")/../.."
if ! command -v node >/dev/null 2>&1; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # Loading nvm puts its default on PATH; `nvm use` then switches to the
    # project's .nvmrc, and fails without one, which must not stop the script.
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || true
    nvm use --silent >/dev/null 2>&1 || true
  fi
fi
exec node "$@"
