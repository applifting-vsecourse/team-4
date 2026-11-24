// On-demand Copilot review of one pull request (`/review`, #499). The review
// workflow runs this with trusted code from main; the PR's code is only read
// as a diff, never checked out or run. The result is an advisory PR comment.
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { executeReview, planReview } from './batches.mjs';
import {
  formatReviewComment,
  MAX_PROMPT_BYTES,
  MAX_STDIN_PROMPT_BYTES,
} from './prompt.mjs';

const execFileAsync = promisify(execFile);

const cfg = {
  repo: process.env.GITHUB_REPOSITORY,
  token: process.env.GITHUB_TOKEN,
  pr: Number(process.env.PR_NUMBER),
  requestedBy: process.env.REQUESTED_BY,
  commentId: process.env.COMMENT_ID,
  copilotVersion: process.env.COPILOT_CLI_VERSION || '1.0.98',
  copilotModel: process.env.COPILOT_MODEL || '',
  stdin: process.env.COPILOT_PROMPT_TRANSPORT === 'stdin',
};
for (const key of ['repo', 'token', 'requestedBy'])
  if (!cfg[key]) throw new Error(`Missing configuration: ${key}`);
if (!Number.isInteger(cfg.pr)) throw new Error('Missing configuration: pr');

async function api(path, { method = 'GET', body, accept } = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: accept ?? 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok)
    throw new Error(
      `${method} ${path}: ${response.status} ${await response.text()}`,
    );
  return accept?.includes('diff') ? response.text() : response.json();
}

/** The issue the PR closes or refers to first, if any. */
async function linkedIssue(body) {
  const match =
    /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|refs?):?\s+#(\d+)\b/i.exec(
      (body ?? '').replace(/<!--[\s\S]*?-->/g, ''),
    );
  if (!match) return null;
  try {
    const issue = await api(`/repos/${cfg.repo}/issues/${match[1]}`);
    return issue.pull_request ? null : issue;
  } catch {
    return null;
  }
}

async function readRules() {
  const rules = [];
  for (const name of ['CLAUDE.md', 'DESIGN.md', '.github/workflows/ci.yml']) {
    try {
      rules.push({ name, content: await readFile(name, 'utf8') });
    } catch {
      // A missing rules file just means fewer rules to review against.
    }
  }
  return rules;
}

async function ensureCopilot() {
  try {
    await execFileAsync('copilot', ['--version']);
  } catch {
    await execFileAsync('npm', [
      'install',
      '-g',
      `@github/copilot@${cfg.copilotVersion}`,
    ]);
  }
}

async function runCopilot(prompt) {
  await ensureCopilot();
  // Repository instructions are already in the prompt; do not load them twice.
  const args = ['--no-ask-user', '-s', '--no-custom-instructions'];
  if (!cfg.stdin) args.unshift('-p', prompt);
  if (cfg.copilotModel) args.push('--model', cfg.copilotModel);
  try {
    // No tool permissions and a stripped environment: a prompt injected
    // through the diff can neither act nor read our tokens.
    const child = execFileAsync('copilot', args, {
      timeout: 3 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        COPILOT_GITHUB_TOKEN: process.env.COPILOT_GITHUB_TOKEN,
        CI: 'true',
      },
    });
    if (cfg.stdin) {
      child.child.stdin.on('error', () => {});
      child.child.stdin.end(prompt);
    }
    const { stdout } = await child;
    return { ok: true, stdout };
  } catch (err) {
    const detail = err.killed
      ? 'vypršel časový limit'
      : String(err.stderr || err.message)
          .trim()
          .slice(0, 300);
    return { ok: false, reason: `Copilot CLI selhalo: ${detail}` };
  }
}

const meta = await api(`/repos/${cfg.repo}/pulls/${cfg.pr}`);
const sha = meta.head.sha;
if (cfg.commentId)
  await api(`/repos/${cfg.repo}/issues/comments/${cfg.commentId}/reactions`, {
    method: 'POST',
    body: { content: 'eyes' },
  }).catch(() => {});

let outcome;
try {
  const diff = await api(`/repos/${cfg.repo}/pulls/${cfg.pr}`, {
    accept: 'application/vnd.github.diff',
  });
  const context = {
    issue: await linkedIssue(meta.body),
    pullRequest: { title: meta.title, body: meta.body },
    prNumber: cfg.pr,
    diff,
    rules: await readRules(),
  };
  const limit = cfg.stdin ? MAX_STDIN_PROMPT_BYTES : MAX_PROMPT_BYTES;
  const plan = planReview(context, meta, limit);
  outcome = await executeReview(plan, context, runCopilot, console.log, limit);
} catch (error) {
  outcome = {
    status: 'error',
    reason: `Review se nespustilo: ${error.message}`,
  };
}

const comment = await api(`/repos/${cfg.repo}/issues/${cfg.pr}/comments`, {
  method: 'POST',
  body: {
    body: formatReviewComment({
      sha,
      result: outcome.status,
      findings: outcome.findings,
      reason: outcome.reason,
      coverage: outcome.coverage,
      skipped: outcome.skipped,
      requestedBy: cfg.requestedBy,
    }),
  },
});
console.log(
  `Review of #${cfg.pr} at ${sha.slice(0, 7)}: ${outcome.status} — ${comment.html_url}`,
);
