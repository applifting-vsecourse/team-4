#!/usr/bin/env node
// Installs the feature integration flow once its code is merged: the area
// labels and the integration branch ruleset. Dry-run is the default. The main
// branch ruleset is read only to confirm it exists; it is never changed.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { AREA_LABELS } from './feature.mjs';
import {
  INTEGRATION_RULESET,
  integrationRuleset,
  rulesetDifferences,
  selectIntegrationRuleset,
} from './ruleset.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const apply = process.argv.includes('--apply');
if (process.argv.slice(2).some((arg) => arg !== '--apply'))
  throw new Error(
    'Usage: node scripts/delivery/install-feature-flow.mjs [--apply]',
  );
// Needs gh 2.48 or newer for --slurp.
const gh = (args, input) =>
  JSON.parse(execFileSync('gh', args, { cwd: root, encoding: 'utf8', input }));
const repo = gh(['repo', 'view', '--json', 'nameWithOwner']).nameWithOwner;

// The ruleset makes child PRs mergeable on child-verify and Delivery stages, so
// the code that publishes them must already be the trusted code on main.
const paths = [
  '.github/workflows/delivery-stages.yml',
  '.github/workflows/agent-code-review.yml',
  '.github/workflows/integration-merge.yml',
  '.github/workflows/ci.yml',
];
// Tracked files only, so a local scratch script cannot block the install.
for (const file of execFileSync(
  'git',
  [
    'ls-files',
    'scripts/delivery',
    'scripts/agent-review',
    'scripts/automation',
  ],
  { cwd: root, encoding: 'utf8' },
)
  .split('\n')
  .filter(Boolean))
  if (file.endsWith('.mjs') && !file.endsWith('.test.mjs')) paths.push(file);
for (const path of paths) {
  let remote;
  try {
    remote = gh(['api', `repos/${repo}/contents/${path}?ref=main`]);
  } catch {
    remote = null; // Missing on main.
  }
  if (
    !remote ||
    remote.encoding !== 'base64' ||
    !Buffer.from(remote.content, 'base64').equals(readFileSync(root + path))
  )
    throw new Error(
      `${path} is not installed on main; merge the implementation before installing rules.`,
    );
}

const rulesets = gh([
  'api',
  '--paginate',
  '--slurp',
  `repos/${repo}/rulesets?per_page=100`,
]).flat();
if (!rulesets.some((rule) => rule.name === 'Protect main'))
  throw new Error('Expected the Protect main ruleset to exist');
const existing = selectIntegrationRuleset(rulesets, repo);
const proposed = integrationRuleset();
const labels = gh([
  'api',
  '--paginate',
  '--slurp',
  `repos/${repo}/labels?per_page=100`,
]).flat();
// GitHub label names are case-insensitive.
const missingLabels = Object.keys(AREA_LABELS).filter(
  (name) =>
    !labels.some((label) => label.name.toLowerCase() === name.toLowerCase()),
);
console.log(
  JSON.stringify(
    {
      repo,
      apply,
      missingLabels,
      ruleset: existing ? `update ${existing.id}` : 'create',
      proposed,
    },
    null,
    2,
  ),
);
if (!apply) {
  console.log(
    'Dry run only. Re-run with --apply to create the labels and the ruleset.',
  );
  process.exit(0);
}

const descriptions = {
  'area:frontend':
    'Frontend sub-issue of a feature: its child PR needs checks and stories.',
  'area:backend':
    'Backend sub-issue of a feature: its child PR needs checks and database.',
};
for (const name of missingLabels)
  gh(
    ['api', `repos/${repo}/labels`, '--method', 'POST', '--input', '-'],
    JSON.stringify({
      name,
      color: name === 'area:frontend' ? '0052cc' : '5319e7',
      description: descriptions[name],
    }),
  );
const installed = gh(
  [
    'api',
    existing
      ? `repos/${repo}/rulesets/${existing.id}`
      : `repos/${repo}/rulesets`,
    '--method',
    existing ? 'PUT' : 'POST',
    '--input',
    '-',
  ],
  JSON.stringify(proposed),
);
// Read it back as GitHub stores it: every proposed field must be in force.
const differences = rulesetDifferences(
  gh(['api', `repos/${repo}/rulesets/${installed.id}`]),
  proposed,
);
if (differences.length)
  throw new Error(`Ruleset verification failed: ${differences.join(', ')}`);
console.log(
  `${INTEGRATION_RULESET} installed. Confirm that the first integration branch can be created from a parent issue's Development section.`,
);
