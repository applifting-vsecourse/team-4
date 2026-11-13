#!/usr/bin/env bash
# Stop hook: when Claude finishes a turn, lint the frontend .tsx files changed
# in the working tree (against HEAD, plus untracked ones) and feed errors back.
# Runs once per turn instead of after every edit, so half-done multi-edit
# changes are not reported. Same ESLint config as `pnpm check` and CI.
set -uo pipefail

# A previous block already sent Claude back to fix errors; don't loop forever.
is_retry=$(node -e 'let s="";process.stdin.on("data",(d)=>(s+=d)).on("end",()=>{try{process.stdout.write(String(JSON.parse(s).stop_hook_active===true))}catch{}})')
[ "$is_retry" = "true" ] && exit 0

[ -n "${CLAUDE_PROJECT_DIR:-}" ] || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0
frontend_dir="apps/frontend"
# Dependencies not installed yet (fresh clone): nothing to lint with.
[ -x "$frontend_dir/node_modules/.bin/eslint" ] || exit 0

files=()
while IFS= read -r file; do
  [ -f "$file" ] && files+=("${file#"$frontend_dir"/}")
done < <(
  {
    git diff --name-only --diff-filter=d HEAD -- "$frontend_dir/src"
    git ls-files --others --exclude-standard -- "$frontend_dir/src"
  } | grep '\.tsx$' | sort -u
)
[ "${#files[@]}" -gt 0 ] || exit 0

cd "$frontend_dir" || exit 0
if ! output=$(./node_modules/.bin/eslint "${files[@]}" 2>&1); then
  echo "$output" >&2
  echo "Fix these lint errors before finishing (see AGENTS.md, UI rules)." >&2
  exit 2
fi
