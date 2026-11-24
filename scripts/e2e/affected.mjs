// Runs or lists the E2E specs a change needs (#499).
//
//   pnpm e2e:affected            run the specs affected since origin/main
//   pnpm e2e:affected --list     only show the selection and why
//   pnpm e2e:affected --all      run the whole suite
//   pnpm e2e:affected -- --headed   anything after `--` goes to Playwright
//
// Locally the change is the branch since its merge base with origin/main plus
// uncommitted and untracked files. In CI, E2E_BASE names the base commit and
// the selection is written to GITHUB_OUTPUT and the job summary.
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, readdirSync } from 'node:fs';
import { selectSpecs } from './select.mjs';

const args = process.argv.slice(2);
const separator = args.indexOf('--');
const own = separator === -1 ? args : args.slice(0, separator);
const playwrightArgs = separator === -1 ? [] : args.slice(separator + 1);
const listOnly = own.includes('--list');
const forceAll = own.includes('--all') || process.env.E2E_ALL === 'true';

const git = (...gitArgs) =>
  execFileSync('git', gitArgs, { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

function changedPaths() {
  const base =
    process.env.E2E_BASE || git('merge-base', 'origin/main', 'HEAD')[0];
  // Without rename detection a moved file counts at its old and new path.
  const paths = new Set(
    git('diff', '--name-only', '--no-renames', `${base}...HEAD`),
  );
  if (!process.env.CI) {
    for (const path of git('diff', '--name-only', '--no-renames', 'HEAD'))
      paths.add(path);
    for (const path of git('ls-files', '--others', '--exclude-standard'))
      paths.add(path);
  }
  return [...paths];
}

const specFiles = readdirSync('apps/frontend/e2e').filter((file) =>
  file.endsWith('.spec.ts'),
);
const selection = forceAll
  ? {
      mode: 'all',
      specs: [...specFiles].sort(),
      reasons: ['the whole suite was asked for'],
    }
  : selectSpecs(changedPaths(), specFiles);

const label = {
  all: 'the whole E2E suite',
  some: `${selection.specs.length} of ${specFiles.length} E2E specs`,
  none: 'no E2E specs',
}[selection.mode];
console.log(`Selected ${label}.`);
for (const reason of selection.reasons) console.log(`  - ${reason}`);
if (selection.mode === 'some')
  for (const spec of selection.specs) console.log(`    ${spec}`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `mode=${selection.mode}\nspecs=${selection.specs.map((spec) => `e2e/${spec}`).join(' ')}\n`,
  );
}
if (process.env.GITHUB_STEP_SUMMARY) {
  const reasons = selection.reasons.map((reason) => `- ${reason}`).join('\n');
  const specs =
    selection.mode === 'some'
      ? `\n\n**Specs:** ${selection.specs.map((spec) => `\`${spec}\``).join(', ')}`
      : '';
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### E2E selection: ${label}\n\n${reasons}${specs}\n`,
  );
}

if (listOnly || selection.mode === 'none') process.exit(0);
const result = spawnSync(
  'pnpm',
  [
    '--filter',
    'frontend',
    'exec',
    'playwright',
    'test',
    ...(selection.mode === 'some'
      ? selection.specs.map((spec) => `e2e/${spec}`)
      : []),
    ...playwrightArgs,
  ],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
