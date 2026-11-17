#!/usr/bin/env bash
# Lint the frontend .tsx files Claude edited, once per turn instead of after
# every edit, so half-done multi-edit changes are not reported. Same ESLint
# config as `pnpm check` and CI.
#
#   lint-tsx.sh record   PostToolUse: remember the edited file, lint nothing.
#   lint-tsx.sh          Stop: lint the remembered files and feed errors back.
#
# Only files Claude edited are linted: not the developer's own uncommitted
# work, and still the files Claude committed during the turn.
set -uo pipefail

input=$(cat)
field() {
  node -e 'const v=JSON.parse(process.argv[1])[process.argv[2]];process.stdout.write(v==null?"":String(v))' "$input" "$1" 2>/dev/null
}
tool_file() {
  node -e 'const i=JSON.parse(process.argv[1]).tool_input??{};process.stdout.write(i.file_path??"")' "$input" 2>/dev/null
}

[ -n "${CLAUDE_PROJECT_DIR:-}" ] || exit 0
frontend="$CLAUDE_PROJECT_DIR/apps/frontend"
session=$(field session_id)
state="${TMPDIR:-/tmp}/akcio-lint-tsx-${session:-default}"
list="$state.files"
rounds="$state.rounds"

if [ "${1:-}" = "record" ]; then
  file=$(tool_file)
  case "$file" in
    "$frontend"/src/*.tsx) echo "$file" >>"$list" ;;
  esac
  exit 0
fi

# Dependencies not installed yet (fresh clone): nothing to lint with.
[ -x "$frontend/node_modules/.bin/eslint" ] || exit 0
[ -s "$list" ] || exit 0

files=()
while IFS= read -r file; do
  [ -f "$file" ] && files+=("${file#"$frontend"/}")
done < <(sort -u "$list")
if [ "${#files[@]}" -eq 0 ]; then
  rm -f "$list" "$rounds"
  exit 0
fi

cd "$frontend" || exit 0
if output=$(./node_modules/.bin/eslint "${files[@]}" 2>&1); then
  rm -f "$list" "$rounds"
  exit 0
fi

# A few rounds of fixing, then let the turn end instead of looping.
count=$(($(cat "$rounds" 2>/dev/null || echo 0) + 1))
echo "$count" >"$rounds"
echo "$output" >&2
if [ "$count" -ge 3 ]; then
  echo "Lint errors remain after $count rounds; report them to the developer." >&2
  rm -f "$list" "$rounds"
  exit 0
fi
echo "Fix these lint errors before finishing (see AGENTS.md, UI rules)." >&2
exit 2
