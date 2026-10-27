#!/usr/bin/env node
// Run after this implementation is merged. Dry-run is the default.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import { SEVERITY_LABELS } from './severity.mjs';
import { severityRuleset } from './ruleset.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const gh = (args, input) =>
  JSON.parse(execFileSync('gh', args, { cwd: root, encoding: 'utf8', input }));
const repo = gh(['repo', 'view', '--json', 'nameWithOwner']).nameWithOwner;
const apply = process.argv.includes('--apply');
if (process.argv.slice(2).some((arg) => arg !== '--apply'))
  throw new Error(
    'Usage: node scripts/delivery/install-severity.mjs [--apply]',
  );
// Verify every trusted script and workflow matches main before changing protection.
// This prevents reducing native approval requirements ahead of gate installation.
const paths = [
  '.github/workflows/delivery-stages.yml',
  '.github/workflows/agent-code-review.yml',
];
for (const dir of [
  'scripts/delivery',
  'scripts/agent-review',
  'scripts/automation',
]) {
  for (const file of readdirSync(root + dir))
    if (file.endsWith('.mjs') && !file.endsWith('.test.mjs'))
      paths.push(`${dir}/${file}`);
}
for (const path of paths) {
  const remote = gh(['api', `repos/${repo}/contents/${path}?ref=main`]);
  if (
    remote.encoding !== 'base64' ||
    !Buffer.from(remote.content, 'base64').equals(readFileSync(root + path))
  )
    throw new Error(
      `${path} is not installed on main; merge the implementation before installing rules.`,
    );
}
const rulesets = gh(['api', `repos/${repo}/rulesets`]);
const matching = rulesets.filter(
  (rule) => rule.name === 'Protect main' && rule.source === repo,
);
if (matching.length !== 1)
  throw new Error('Expected exactly one repository ruleset named Protect main');
const path = `repos/${repo}/rulesets/${matching[0].id}`;
const current = gh(['api', path]);
const proposed = severityRuleset(current);
console.log(
  JSON.stringify(
    { repo, apply, currentRules: current.rules, proposed },
    null,
    2,
  ),
);
if (!apply) {
  console.log(
    'Dry run only. Re-run with --apply to create labels and update the ruleset.',
  );
  process.exit(0);
}
const existingLabels = gh([
  'api',
  '--paginate',
  '--slurp',
  `repos/${repo}/labels?per_page=100`,
]).flat();
const descriptions = [
  'Low: CI only; documentation/text and isolated tests; no linked issue or review/QA.',
  'Standard (default): linked issue, Copilot review and current-commit QA; no scope approval.',
  'High: linked issue, David/Bogdan scope approval, Copilot review and current-commit QA.',
];
for (const [index, name] of SEVERITY_LABELS.entries()) {
  if (existingLabels.some((label) => label.name === name)) continue;
  gh(
    ['api', `repos/${repo}/labels`, '--method', 'POST', '--input', '-'],
    JSON.stringify({
      name,
      color: ['0e8a16', 'fbca04', 'b60205'][index],
      description: descriptions[index],
    }),
  );
}
gh(['api', path, '--method', 'PUT', '--input', '-'], JSON.stringify(proposed));
const installed = gh(['api', path]);
const rule = installed.rules.find(
  (rule) => rule.type === 'pull_request',
).parameters;
if (
  rule.required_approving_review_count !== 0 ||
  rule.require_last_push_approval ||
  rule.require_extra_approval_for_unattributed_changes
)
  throw new Error('Ruleset verification failed');
console.log(
  'Severity labels and ruleset installed. Reconcile all open PRs and verify live mergeability.',
);
