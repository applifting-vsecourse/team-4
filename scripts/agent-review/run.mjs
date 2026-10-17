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
  STATUS_REVIEW,
  STATUS_TESTING,
  decideIssue,
  findPriorResults,
  formatIssueNote,
  formatPrComment,
  hasBotComment,
  issueMarker,
  resultsKey,
} from './lib.mjs';

import {
  reviewersFor,
  requirementsApproval,
  requirementsMarker,
  requirementsTransition,
  readyMarker,
} from '../delivery/lib.mjs';

import { planReview, executeReview } from './batches.mjs';
import { ensureQaReviewRequest } from './qa-review.mjs';
import {
  copilotWaiver,
  waiverMarker,
  waiverObservation,
} from '../delivery/copilot-waiver.mjs';

import {
  issueRequirements,
  scopeMarker,
  scopeHash,
} from '../delivery/requirements.mjs';

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

/** Change only the status observed at the start; preserve concurrent human edits. */
async function moveStatus(board, item, target) {
  const status = await currentStatus(item.id);
  if (status !== item.status?.name) return false;
  if (status === target) return true;
  const option = board.project.field.options.find((o) => o.name === target);
  if (!option) throw new Error(`Status option "${target}" not found`);
  if (cfg.dryRun) {
    console.log(`[dry-run] would move #${item.content.number} to ${target}`);
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
      timeout: 3 * 60 * 1000,
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

async function reviewPr({ pr, issue, prCount, rules, requirements }) {
  const meta = await api(cfg.githubToken, `/repos/${cfg.repo}/pulls/${pr}`);
  const sha = meta.head.sha;
  const currentReviews = [];
  for (let page = 1; ; page++) {
    const batch = await api(
      cfg.githubToken,
      `/repos/${cfg.repo}/pulls/${pr}/reviews?per_page=100&page=${page}`,
    );
    currentReviews.push(...batch);
    if (batch.length < 100) break;
  }
  const currentIssue = await api(
    cfg.githubToken,
    `/repos/${cfg.repo}/issues/${issue.number}`,
  );
  const preflight = issueRequirements(
    currentIssue,
    await listComments(issue.number),
    [{ pr: meta, reviews: currentReviews }],
  );
  meta.requirements = preflight.approval;
  meta.requirementsVersion = preflight.version;
  if (
    meta.state !== 'open' ||
    meta.base.ref !== 'main' ||
    sha !== requirements.sha ||
    requirementsApproval(meta, currentReviews)?.id !== requirements.reviewId
  ) {
    return {
      pr,
      sha,
      status: 'stale',
      reason: 'Requirements or code changed before review',
    };
  }
  const comments = await listComments(pr);
  const waiver = copilotWaiver({ pr: meta, comments });
  if (waiver) {
    const observation = waiverObservation(meta, waiver);
    if (
      !comments.some(
        (c) =>
          c.user?.login === 'github-actions[bot]' &&
          (c.body ?? '').startsWith(observation + '\n'),
      )
    ) {
      await postComment(
        pr,
        observation +
          '\nLatest processed manual Copilot waiver. Removing or invalidating this command must not restore an older waiver.',
      );
    }
    return { pr, sha, status: 'waived', waiver, url: waiver.url };
  }
  const scopeMarker = `<!-- agent-review-scope issue=${issue.number} -->`;
  const prior = findPriorResults({
    comments: comments.filter(
      (c) =>
        (c.body ?? '').startsWith(scopeMarker + '\n') &&
        Date.parse(c.created_at) >= Date.parse(requirements.created_at),
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
  const context = { issue, prNumber: pr, prCount, diff, rules };
  let outcome;
  const attempt = prior.errorAttempts + 1;
  let plan;
  try {
    plan = planReview(context, meta);
  } catch (error) {
    outcome = {
      status: 'error',
      reason: `Review not started: ${error.message} Copilot was not called.`,
    };
  }
  if (plan)
    outcome = await executeReview(plan, context, runCopilot, console.log);

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
        coverage: outcome.coverage,
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

  async function snapshots() {
    const all = [];
    for (const number of prNumbers) {
      const pr = await api(
        cfg.githubToken,
        `/repos/${cfg.repo}/pulls/${number}`,
      );
      const reviews = [];
      for (let page = 1; ; page++) {
        const batch = await api(
          cfg.githubToken,
          `/repos/${cfg.repo}/pulls/${number}/reviews?per_page=100&page=${page}`,
        );
        reviews.push(...batch);
        if (batch.length < 100) break;
      }
      if (pr.state !== 'open' || pr.base.ref !== 'main')
        throw new Error(`PR #${number} is not open against main`);
      all.push({ pr, reviews });
    }
    const currentIssue = await api(
      cfg.githubToken,
      `/repos/${cfg.repo}/issues/${issue.number}`,
    );
    if (scopeHash(currentIssue) !== scopeHash(issue))
      throw new Error(
        'Issue scope changed during processing; retry before reviewing',
      );
    const scope = issueRequirements(
      currentIssue,
      await listComments(issue.number),
      all,
    );
    if (scope.resetRecord)
      await postComment(
        issue.number,
        `${scopeMarker('requirements-reset', scope.resetRecord)}\nRequirements re-review requested. Implementation fixes alone do not revoke scope approval.`,
      );
    if (scope.grantRecord)
      await postComment(
        issue.number,
        `${scopeMarker('issue-requirements', scope.grantRecord)}\nRequirements approved by @${scope.grantRecord.reviewer} for the current issue scope. This approval survives implementation commits; use /requirements-rereview when scope changes.`,
      );
    for (const entry of all) {
      entry.pr.requirements = scope.approval;
      entry.pr.requirementsVersion = scope.version;
    }
    return all;
  }
  const initial = await snapshots();
  const transition = requirementsTransition(item.status?.name, initial);
  if (transition.review && item.status?.name === STATUS_TESTING) {
    for (const { pr, reviews } of initial) {
      const approval = requirementsApproval(pr, reviews);
      const marker = requirementsMarker(
        pr.number,
        pr.head.sha,
        issue.number,
        approval.id,
      );
      if (
        !(await listComments(pr.number)).some(
          (c) =>
            c.user?.login === 'github-actions[bot]' &&
            (c.body ?? '').startsWith(marker + '\n'),
        )
      ) {
        transition.status = STATUS_REVIEW;
        break;
      }
    }
  }
  if (!(await moveStatus(board, item, transition.status))) return;
  item = { ...item, status: { name: transition.status } };
  if (!transition.review) {
    console.log(
      `  -> ${transition.status}: waiting for current requirements approval`,
    );
    return;
  }
  const requirementRecords = new Map();
  for (const { pr, reviews } of initial) {
    const approval = requirementsApproval(pr, reviews);
    const marker = requirementsMarker(
      pr.number,
      pr.head.sha,
      issue.number,
      approval.id,
    );
    let record = (await listComments(pr.number))
      .filter(
        (c) =>
          c.user?.login === 'github-actions[bot]' &&
          (c.body ?? '').startsWith(marker + '\n'),
      )
      .at(-1);
    if (!record)
      record = await postComment(
        pr.number,
        `${marker}\n${approval.exempt ? 'Requirements review is exempt because the PR author is darebakdavca' : `Issue requirements approved by @${reviewersFor(pr.user.login).requirements}`} for commit \`${pr.head.sha}\`. Issue #${issue.number} is eligible for independent code review.`,
      );
    requirementRecords.set(pr.number, {
      ...record,
      created_at: record.created_at ?? new Date().toISOString(),
      sha: pr.head.sha,
      reviewId: approval.id,
    });
  }
  const rules = await readRules();
  const results = [];
  for (const pr of prNumbers) {
    results.push(
      await reviewPr({
        pr,
        issue,
        prCount: prNumbers.length,
        rules,
        requirements: requirementRecords.get(pr),
      }),
    );
  }

  // A push during the review makes the verdict stale: compare against the
  // heads as they are right now, immediately before deciding.
  for (const r of results) {
    if (!['pass', 'waived'].includes(r.status)) continue;
    const now = await api(cfg.githubToken, `/repos/${cfg.repo}/pulls/${r.pr}`);
    if (now.head.sha !== r.sha) r.status = 'stale';
  }

  // Re-read every head and review after Copilot. Revocation or a push must
  // return the issue to requirements review and must never hand code to QA.
  const current = await snapshots();
  const rolesByPr = new Map(
    current.map(({ pr }) => [pr.number, reviewersFor(pr.user.login)]),
  );
  const stillApproved = requirementsTransition(item.status.name, current);
  if (
    !stillApproved.review ||
    current.some(
      ({ pr }) =>
        pr.head.sha !==
          initial.find((s) => s.pr.number === pr.number).pr.head.sha ||
        pr.state !== 'open' ||
        pr.base.ref !== 'main' ||
        requirementsApproval(
          pr,
          current.find((s) => s.pr.number === pr.number).reviews,
        )?.id !==
          requirementsApproval(
            initial.find((s) => s.pr.number === pr.number).pr,
            initial.find((s) => s.pr.number === pr.number).reviews,
          )?.id,
    )
  ) {
    const next = stillApproved.review ? STATUS_REVIEW : 'In Progress';
    await moveStatus(board, item, next);
    console.log(`  -> ${next}: scope or code changed during review`);
    return;
  }
  // A deleted/edited waiver must not be cached as a successful model review.
  // Read the native PR comments again immediately before the QA handoff.
  for (const r of results) {
    if (r.status !== 'waived') continue;
    const live = copilotWaiver({
      pr: current.find(({ pr }) => pr.number === r.pr).pr,
      comments: await listComments(r.pr),
    });
    if (live?.source !== r.waiver.source) r.status = 'stale';
  }
  const decision = decideIssue(results);
  let moved = false;
  if (decision.outcome === 'pass') {
    moved = await moveStatus(board, item, STATUS_TESTING);
    if (moved) {
      for (const r of results) {
        const marker =
          readyMarker(r.pr, r.sha, issue.number) +
          (r.status === 'waived' ? '\n' + waiverMarker(r.waiver) : '');
        if (
          !(await listComments(r.pr)).some(
            (c) =>
              c.user?.login === 'github-actions[bot]' &&
              (c.body ?? '').startsWith(marker + '\n') &&
              Date.parse(c.created_at) >=
                Date.parse(requirementRecords.get(r.pr).created_at),
          )
        ) {
          await postComment(
            r.pr,
            `${marker}\n${r.status === 'waived' ? `Copilot review manually waived by @darebakdavca ([command](${r.waiver.url})). Reason: ${r.waiver.reason}. Requirements policy remains satisfied; this is not a Copilot pass` : rolesByPr.get(r.pr).requirements === null ? 'Requirements exemption applied; independent agent review passed' : 'Issue requirements approval is valid; independent agent review passed'} for commit \`${r.sha}\`. Issue #${issue.number} entered **Ready for Testing**. @${rolesByPr.get(r.pr).qa}: test this commit, then submit an approving PR review. New commits require fresh agent review and QA; issue requirements approval persists unless scope changes.`,
          );
        }
        const snapshot = current.find(({ pr }) => pr.number === r.pr);
        await ensureQaReviewRequest({
          api: (path, options) => api(cfg.githubToken, path, options),
          repo: cfg.repo,
          pr: snapshot.pr,
          issue: {
            number: issue.number,
            requirements: snapshot.pr.requirements,
            requirementsVersion: snapshot.pr.requirementsVersion,
          },
          dryRun: cfg.dryRun,
          waiver: r.waiver,
        });
      }
    }
  } else if (item.status.name === STATUS_TESTING) {
    await moveStatus(board, item, STATUS_REVIEW);
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
    [
      'In Progress',
      STATUS_REVIEW,
      STATUS_TESTING,
      'Done',
      'Accepted by PO',
    ].includes(i.status?.name) &&
    i.content?.state === 'OPEN' &&
    i.content.repository?.nameWithOwner === cfg.repo &&
    (!cfg.onlyIssue || i.content.number === cfg.onlyIssue),
);
console.log(
  `${candidates.length} issue(s) in active delivery stages${cfg.dryRun ? ' [dry-run]' : ''}`,
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
