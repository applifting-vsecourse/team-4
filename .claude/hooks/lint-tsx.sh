#!/usr/bin/env bash
# PostToolUse hook: lint an edited frontend .tsx file and feed errors back to Claude.
set -uo pipefail

file_path=$(node -e 'let s="";process.stdin.on("data",(d)=>(s+=d)).on("end",()=>{try{process.stdout.write(JSON.parse(s).tool_input?.file_path??"")}catch{}})')

[ -n "${CLAUDE_PROJECT_DIR:-}" ] || exit 0
frontend_dir="$CLAUDE_PROJECT_DIR/apps/frontend"
case "$file_path" in
  "$frontend_dir"/src/*.tsx) ;;
  *) exit 0 ;;
esac
[ -f "$file_path" ] || exit 0

cd "$frontend_dir" || exit 0
# Dependencies not installed yet (fresh clone): nothing to lint with.
[ -x ./node_modules/.bin/eslint ] || exit 0
if ! output=$(./node_modules/.bin/eslint "${file_path#"$frontend_dir"/}" 2>&1); then
  echo "$output" >&2
  echo "Fix these lint errors before continuing (see AGENTS.md, UI rules)." >&2
  exit 2
fi
