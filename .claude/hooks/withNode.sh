#!/bin/bash
# Runs a hook script from this folder under Node, from the repository root.
# Claude Code's hooks inherit the app's environment, which may not have nvm on
# PATH; when `node` is missing, the project's version (.nvmrc) is loaded first.
#
#   .claude/hooks/withNode.sh lintEditedFile.mjs   (the hook's JSON on stdin)
set -eo pipefail
cd "$(dirname "$0")/../.."
if ! command -v node >/dev/null 2>&1; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 && nvm use --silent >/dev/null 2>&1
fi
exec node ".claude/hooks/$1"
