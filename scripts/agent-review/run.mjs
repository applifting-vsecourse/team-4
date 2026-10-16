#!/usr/bin/env node
// Polls the project board for issues in "Ready for Code Review", reviews every
// linked open PR with the Copilot CLI and moves the issue to "Ready for
// Testing" only when all of them pass for their current commit.
// Projects v2 emits no workflow event on column moves, hence the polling.
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import {
  MAX_ATTEMPTS,
  MAX_PROMPT_BYTES,
  STATUS_REVIEW,
  STATUS_TESTING,
  buildPrompt,
  decideIssue,
  findPriorResults,
  formatIssueNote,
  formatPrComment,
  hasBotComment,
  issueMarker,
  parseVerdict,
  resultsKey,
} from './lib.mjs';

import {
  reviewersFor,
  approved,
  latestReview,
  readyMarker,
} from '../delivery/lib.mjs';

const execFileAsync = promisify(execFile);

const cfg = {
  repo: process.env.GITHUB_REPOSITORY,
  projectOwner: process.env.PROJECT_OWNER,
  projectNumber: Number(process.env.PROJECT_NUMBER),
  // GITHUB_TOKEN reads PRs and posts comments as the Actions bot; only the
  // project PAT can read and edit Projects v2.
  githubToken: process.env.GITHUB_TOKEN,
  projectToken: process.env.PROJECT_TOKEN,
  dryRun: process.env.DRY_RUN === 'true',
  force: process.env.FORCE === 'true',
  onlyIssue: process.env.ONLY_ISSUE ? Number(process.env.ONLY_ISSUE) : null,
  copilotVersion: process.env.COPILOT_CLI_VERSION || '1.0.98',
  copilotModel: process.env.COPILOT_MODEL || '',
};

for (const key of ['repo', 'projectOwner', 'githubToken', 'projectToken']) {
  if (!cfg[key]) throw new Error(`Missing configuration: ${key}`);
}
if (!Number.isInteger(cfg.projectNumber)) {
  throw new Error('Missing configuration: projectNumber');
}

async function api(token, path, { method = 'GET', body, accept } = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept ?? 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
  }
  return accept ? res.text() : res.json();
}

async function graphql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.projectToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(`GraphQL failed: ${JSON.stringify(json.errors ?? json)}`);
  }
  return json.data;
}

async function listComments(number) {
  const all = [];
  for (let page = 1; ; page++) {
    const batch = await api(
      cfg.githubToken,
      `/repos/${cfg.repo}/issues/${number}/comments?per_page=100&page=${page}`,
    );
    all.push(...batch);
    if (batch.length < 100) return all;
  }
}

async function postComment(number, body) {
  if (cfg.dryRun) {
    console.log(`[dry-run] comment on #${number}:\n${body}\n`);
    return { html_url: null };
  }
  return api(cfg.githubToken, `/repos/${cfg.repo}/issues/${number}/comments`, {
    method: 'POST',
    body: { body },
  });
}

async function loadBoard() {
  const query = `
    query($owner: String!, $number: Int!, $cursor: String) {
      organization(login: $owner) {
        projectV2(number: $number) {
          id
          field(name: "Status") {
            ... on ProjectV2SingleSelectField { id options { id name } }
          }
          items(first: 100, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              status: fieldValueByName(name: "Status") {
                ... on ProjectV2ItemFieldSingleSelectValue { name }
              }
              content {
                ... on Issue {
                  number title body state
                  repository { nameWithOwner }
                  closedByPullRequestsReferences(first: 20, includeClosedPrs: false) {
                    pageInfo { hasNextPage }
                    nodes { number state repository { nameWithOwner } }
                  }
                }
              }
            }
          }
        }
      }
    }`;
  let project;
  const items = [];
  let cursor = null;
  do {
    const data = await graphql(query, {
      owner: cfg.projectOwner,
      number: cfg.projectNumber,
      cursor,
    });
    project = data.organization.projectV2;
    items.push(...project.items.nodes);
    cursor = project.items.pageInfo.hasNextPage
      ? project.items.pageInfo.endCursor
      : null;
  } while (cursor);
  return { project, items };
}

async function currentStatus(itemId) {
  const data = await graphql(
    `
      query ($id: ID!) {
        node(id: $id) {
          ... on ProjectV2Item {
            status: fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
              }
            }
          }
        }
      }
    `,
    { id: itemId },
  );
  return data.node?.status?.name ?? null;
}

/** Moves the card unless a human changed its status since we started. */
async function moveToTesting(board, item) {
  const status = await currentStatus(item.id);
  if (status === STATUS_TESTING) return true;
  if (status !== STATUS_REVIEW) return false;
  const option = board.project.field.options.find(
    (o) => o.name === STATUS_TESTING,
  );
  if (!option) throw new Error(`Status option "${STATUS_TESTING}" not found`);
  if (cfg.dryRun) {
    console.log(
      `[dry-run] would move #${item.content.number} to ${STATUS_TESTING}`,
    );
    return true;
  }
  await graphql(
    `
      mutation ($project: ID!, $item: ID!, $field: ID!, $option: String!) {
        updateProjectV2ItemFieldValue(
          input: {
            projectId: $project
            itemId: $item
            fieldId: $field
            value: { singleSelectOptionId: $option }
          }
        ) {
          projectV2Item {
            id
          }
        }
      }
    `,
    {
      project: board.project.id,
      item: item.id,
      field: board.project.field.id,
      option: option.id,
    },
  );
  return true;
}

async function ensureCopilot() {
  try {
    await execFileAsync('copilot', ['--version']);
  } catch {
    console.log(`Installing @github/copilot@${cfg.copilotVersion}`);
    await execFileAsync('npm', [
      'install',
      '-g',
      `@github/copilot@${cfg.copilotVersion}`,
    ]);
  }
}

async function runCopilot(prompt) {
  await ensureCopilot();
  const args = ['-p', prompt, '--no-ask-user', '-s'];
  if (cfg.copilotModel) args.push('--model', cfg.copilotModel);
  try {
    // No tool permissions are granted and the environment is stripped, so a
    // prompt injected through the diff can neither act nor read our tokens.
    const { stdout } = await execFileAsync('copilot', args, {
      timeout: 10 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        COPILOT_GITHUB_TOKEN: process.env.COPILOT_GITHUB_TOKEN,
        CI: 'true',
      },
    });
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

async function readRules() {
  const rules = [];
  for (const name of ['CLAUDE.md', 'DESIGN.md']) {
    try {
      rules.push({ name, content: await readFile(name, 'utf8') });
    } catch {
      // A missing rules file just means fewer rules to review against.
    }
  }
  return rules;
}

async function reviewPr({ pr, issue, prCount, rules }) {
  const meta = await api(cfg.githubToken, `/repos/${cfg.repo}/pulls/${pr}`);
  const sha = meta.head.sha;
  const scopeMarker = `<!-- agent-review-scope issue=${issue.number} -->`;
  const prior = findPriorResults({
    comments: (await listComments(pr)).filter((c) =>
      (c.body ?? '').startsWith(scopeMarker + '\n'),
    ),
    pr,
    sha,
  });

  if (!cfg.force && prior.final) {
    return { pr, sha, status: prior.final.result, url: prior.final.url };
  }
  if (!cfg.force && prior.errorAttempts >= MAX_ATTEMPTS) {
    return {
      pr,
      sha,
      status: 'error',
      url: prior.lastError?.url,
      reason: `agent selhal ${prior.errorAttempts}× pro tento commit; pushněte nový commit nebo spusťte workflow s volbou force`,
    };
  }

  const diff = await api(cfg.githubToken, `/repos/${cfg.repo}/pulls/${pr}`, {
    accept: 'application/vnd.github.diff',
  });
  const prompt = buildPrompt({
    issue,
    prNumber: pr,
    prCount,
    diff,
    rules,
  });

  let outcome;
  let attempt = prior.errorAttempts + 1;
  if (Buffer.byteLength(prompt) > MAX_PROMPT_BYTES) {
    // Deterministic failure: retrying would burn credits for the same result.
    attempt = MAX_ATTEMPTS;
    outcome = {
      status: 'error',
      reason: `diff je příliš velký pro jedno review (limit ${MAX_PROMPT_BYTES} B); rozdělte PR`,
    };
  } else {
    const run = await runCopilot(prompt);
    const verdict = run.ok ? parseVerdict(run.stdout) : run;
    outcome = verdict.ok
      ? { status: verdict.verdict, findings: verdict.findings }
      : { status: 'error', reason: verdict.reason };
  }

  const comment = await postComment(
    pr,
    scopeMarker +
      '\n' +
      formatPrComment({
        sha,
        result: outcome.status,
        findings: outcome.findings,
        reason: outcome.reason,
        attempt,
        pr,
        issue: issue.number,
      }),
  );
  return { pr, sha, url: comment.html_url, ...outcome };
}

async function processIssue(board, item) {
  const issue = item.content;
  console.log(`#${issue.number} ${issue.title}`);

  if (issue.closedByPullRequestsReferences.pageInfo.hasNextPage)
    throw new Error('More than 20 linked PRs; refusing partial review');
  const prNumbers = issue.closedByPullRequestsReferences.nodes
    .filter(
      (p) => p.state === 'OPEN' && p.repository.nameWithOwner === cfg.repo,
    )
    .map((p) => p.number);

  const rules = await readRules();
  const results = [];
  for (const pr of prNumbers) {
    results.push(
      await reviewPr({ pr, issue, prCount: prNumbers.length, rules }),
    );
  }

  // A push during the review makes the verdict stale: compare against the
  // heads as they are right now, immediately before deciding.
  for (const r of results) {
    if (r.status !== 'pass') continue;
    const now = await api(cfg.githubToken, `/repos/${cfg.repo}/pulls/${r.pr}`);
    if (now.head.sha !== r.sha) r.status = 'stale';
  }

  const decision = decideIssue(results);
  // Requirements approval is independent of technical review, but both must
  // pass before handing this exact code to QA.
  const rolesByPr = new Map();
  for (const r of results) {
    const meta = await api(cfg.githubToken, `/repos/${cfg.repo}/pulls/${r.pr}`);
    const roles = reviewersFor(meta.user.login);
    rolesByPr.set(r.pr, roles);
    const reviews = [];
    for (let page = 1; ; page++) {
      const batch = await api(
        cfg.githubToken,
        `/repos/${cfg.repo}/pulls/${r.pr}/reviews?per_page=100&page=${page}`,
      );
      reviews.push(...batch);
      if (batch.length < 100) break;
    }
    if (!approved(latestReview(reviews, roles.requirements), r.sha)) {
      decision.outcome = 'blocked';
      decision.reasons.push(
        `PR #${r.pr}: chybí schválení požadavků od ${roles.requirements} pro aktuální commit.`,
      );
    }
  }
  let moved = false;
  if (decision.outcome === 'pass') {
    moved = await moveToTesting(board, item);
    if (moved) {
      for (const r of results) {
        const marker = readyMarker(r.pr, r.sha, issue.number);
        if (!hasBotComment(await listComments(r.pr), marker)) {
          await postComment(
            r.pr,
            `${marker}\nRequirements approval and independent agent review passed for commit \`${r.sha}\`. Issue #${issue.number} entered **Ready for Testing**. @${rolesByPr.get(r.pr).qa}: test this commit, then submit an approving PR review. New commits require all stages again.`,
          );
        }
      }
    }
  }

  const state = `${decision.outcome === 'pass' ? (moved ? 'moved' : 'skipped') : 'blocked'}|${resultsKey(results) || 'no-pr'}`;
  const marker = issueMarker({ issue: issue.number, state });
  if (!hasBotComment(await listComments(issue.number), marker)) {
    await postComment(
      issue.number,
      formatIssueNote({
        issue: issue.number,
        state,
        outcome: decision.outcome,
        reasons: decision.reasons,
        results,
        moved,
      }),
    );
  }
  console.log(`  -> ${decision.outcome}${moved ? ' (moved)' : ''}`);
}

const board = await loadBoard();
if (!board.project.field) throw new Error('Status field not found');

const candidates = board.items.filter(
  (i) =>
    [STATUS_REVIEW, STATUS_TESTING].includes(i.status?.name) &&
    i.content?.state === 'OPEN' &&
    i.content.repository?.nameWithOwner === cfg.repo &&
    (!cfg.onlyIssue || i.content.number === cfg.onlyIssue),
);
console.log(
  `${candidates.length} issue(s) in "${STATUS_REVIEW}"${cfg.dryRun ? ' [dry-run]' : ''}`,
);

for (const item of candidates) {
  try {
    await processIssue(board, item);
  } catch (err) {
    // Keep going so one broken issue does not starve the others; the failed
    // run is still visible in Actions.
    console.error(`#${item.content.number} failed: ${err.message}`);
    process.exitCode = 1;
  }
}
