// Installs the repository rules of #499. Read-only by default:
//
//   node scripts/rules/install.mjs           show what would change
//   node scripts/rules/install.mjs --apply   apply it, then read it back
//
// Needs `gh` signed in as a repository administrator. It refuses to run
// unless this checkout matches origin/main, so a branch cannot install rules
// that were not merged.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MAIN_RULESET,
  mainRuleset,
  planInstall,
  RETIRED_RULESETS,
  rulesetDifferences,
  selectRuleset,
} from './rules.mjs';

const apply = process.argv.includes('--apply');
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();
const gh = (...args) => JSON.parse(run('gh', ['api', ...args]) || 'null');

const repo = run('gh', [
  'repo',
  'view',
  '--json',
  'nameWithOwner',
  '-q',
  '.nameWithOwner',
]);

run('git', ['fetch', '--quiet', 'origin', 'main']);
const rulesets = gh(`repos/${repo}/rulesets?includes_parents=false`);
const current = selectRuleset(rulesets, repo, MAIN_RULESET);
const plan = planInstall({
  repo,
  rulesets,
  stored: current ? gh(`repos/${repo}/rulesets/${current.id}`) : null,
  codeowners: run('git', ['show', 'origin/main:.github/CODEOWNERS']),
  localTree: run('git', ['rev-parse', 'HEAD:scripts/rules']),
  trustedTree: run('git', ['rev-parse', 'origin/main:scripts/rules']),
});
if (plan.refuse) throw new Error(plan.refuse);
const { changes, retired } = plan;
const proposed = mainRuleset();

console.log(
  changes.length
    ? `${MAIN_RULESET}: ${current ? 'update' : 'create'} (${changes.join(', ')})`
    : `${MAIN_RULESET}: up to date`,
);
for (const rule of retired) console.log(`${rule.name}: delete`);
if (!apply) {
  console.log('\nRead-only. Run with --apply to make these changes.');
  process.exit(0);
}

if (changes.length) {
  const file = join(tmpdir(), 'protect-main.json');
  writeFileSync(file, JSON.stringify(proposed));
  if (current)
    gh(
      '--method',
      'PUT',
      `repos/${repo}/rulesets/${current.id}`,
      '--input',
      file,
    );
  else gh('--method', 'POST', `repos/${repo}/rulesets`, '--input', file);
}
for (const rule of retired)
  run('gh', ['api', '--method', 'DELETE', `repos/${repo}/rulesets/${rule.id}`]);

// Read back what GitHub stored: the rules must be exactly the proposed ones.
const after = gh(`repos/${repo}/rulesets?includes_parents=false`);
const saved = gh(
  `repos/${repo}/rulesets/${selectRuleset(after, repo, MAIN_RULESET).id}`,
);
const left = rulesetDifferences(saved, proposed);
const lingering = RETIRED_RULESETS.filter((name) =>
  selectRuleset(after, repo, name),
);
if (left.length || lingering.length)
  throw new Error(
    `Not installed as proposed: ${[...left, ...lingering].join(', ')}`,
  );
console.log('Installed and verified.');
