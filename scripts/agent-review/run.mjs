#!/usr/bin/env node
import { severityFor, sameSeverity } from '../delivery/severity.mjs';
import {
  eventScope,
  includesIssue,
  pullRequestsLinkedToIssue,
} from '../automation/events.mjs';
// Polls the project board for issues in "Ready for Code Review", reviews every
// linked open PR with the Copilot CLI and moves the issue to "Ready for
// Testing" only when all of them pass for their current commit.
// Projects v2 emits no workflow event on column moves, hence the polling.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import {
  MAX_ATTEMPTS,
  STATUS_REVIEW,
  STATUS_TESTING,
  decideIssue,
  findCarryOver,
  findPriorResults,
  formatIssueNote,
  formatPrComment,
  hasBotComment,
  issueMarker,
  resultsKey,
} from './lib.mjs';

import {
  isStorybookPreview,
  reviewersFor,
  requirementsApproval,
  reviewStartApproval,
  requirementsMarker,
  requirementsTransition,
  readyMarker,
  storybookPreviewApproval,
  technicalReviewApproval,
  technicalReviewRequired,
} from '../delivery/lib.mjs';

import {
  buildStacks,
  inSync,
  outOfSyncNote,
  resumableBase,
  sliceFingerprint,
} from '../delivery/stack.mjs';
import { ciEvidence } from './ci-evidence.mjs';
import {
  integrationRole,
  isIntegrationBranch,
  isParentPr,
  parentReasons,
  retargetedAt,
} from '../delivery/feature.mjs';
import {
  integratedReview,
  readIssueDetails,
} from '../delivery/feature-github.mjs';
import { referencedIssueNumbers } from '../automation/issue-links.mjs';
import { isDependencyUpdate } from '../delivery/dependency-update.mjs';
import { planReview, executeReview } from './batches.mjs';
import { ensureQaReviewRequest } from './qa-review.mjs';
import { ensureTechnicalReviewRequest } from './technical-review.mjs';
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

async function listTimeline(number) {
  const all = [];
  for (let page = 1; ; page++) {
    const batch = await api(
      cfg.githubToken,
      `/repos/${cfg.repo}/issues/${number}/timeline?per_page=100&page=${page}`,
    );
    all.push(...batch);
    if (batch.length < 100) return all;
  }
}

async function pagedGet(path) {
  const all = [];
  for (let page = 1; ; page++) {
    const batch = await api(
      cfg.githubToken,
      `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`,
    );
    all.push(...batch);
    if (batch.length < 100) return all;
  }
}

const issueDetails = (number) =>
  readIssueDetails({
    repo: cfg.repo,
    number,
    graphql: (query, variables) =>
      api(cfg.githubToken, '/graphql', {
        method: 'POST',
        body: { query, variables },
      }),
  });

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
                  closedByPullRequestsReferences(first: 100, includeClosedPrs: false) {
                    pageInfo { hasNextPage }
                    nodes { number state repository { nameWithOwner } }
                  }
                  timelineItems(first: 100, itemTypes: [CROSS_REFERENCED_EVENT]) {
                    pageInfo { hasNextPage }
                    nodes {
                      __typename
                      ... on CrossReferencedEvent {
                        source {
                          __typename
                          ... on PullRequest { number state body baseRefName repository { nameWithOwner } }
                        }
                        target { __typename ... on Issue { number repository { nameWithOwner } } }
                      }
                    }
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
  for (const name of ['CLAUDE.md', 'DESIGN.md', '.github/workflows/ci.yml']) {
    try {
      rules.push({ name, content: await readFile(name, 'utf8') });
    } catch {
      // A missing rules file just means fewer rules to review against.
    }
  }
  return rules;
}

async function reviewPr({
  pr,
  issue,
  prCount,
  rules,
  requirements,
  stack,
  integration = false,
}) {
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
  const comments = await listComments(pr);
  const preflight = issueRequirements(
    currentIssue,
    await listComments(issue.number),
    [{ pr: meta, reviews: currentReviews, comments }],
  );
  meta.requirements = preflight.approval;
  meta.requirementsVersion = preflight.version;
  // A PR into an integration branch has no requirements step: its gates are
  // on the parent PR.
  if (
    meta.state !== 'open' ||
    (integration
      ? !isIntegrationBranch(meta.base.ref) || meta.draft
      : meta.base.ref !== 'main' && !stack) ||
    sha !== requirements.sha ||
    severityFor(meta) !== requirements.severity ||
    (!integration &&
      reviewStartApproval(meta, currentReviews)?.id !== requirements.reviewId)
  ) {
    return {
      pr,
      sha,
      status: 'stale',
      reason: 'Requirements or code changed before review',
    };
  }
  // A stacked PR is reviewed as its own slice, which only means something once
  // its branch contains the PR below it.
  const stackIndex = stack
    ? stack.prs.findIndex((member) => member.number === pr)
    : -1;
  if (stackIndex > 0) {
    const parent = await api(
      cfg.githubToken,
      `/repos/${cfg.repo}/pulls/${stack.prs[stackIndex - 1].number}`,
    );
    const { status } = await api(
      cfg.githubToken,
      `/repos/${cfg.repo}/compare/${parent.head.sha}...${sha}`,
    );
    if (!inSync(status))
      return {
        pr,
        sha,
        status: 'error',
        reason: outOfSyncNote({ pr: meta, parent }),
      };
  }
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
  const scopedComments = comments.filter(
    (c) =>
      (c.body ?? '').startsWith(scopeMarker + '\n') &&
      Date.parse(c.created_at) >= Date.parse(requirements.created_at),
  );
  const prior = findPriorResults({ comments: scopedComments, pr, sha });

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

  // A parent PR whose every commit came through a reviewed PR into its
  // integration branch is not reviewed again as one large diff.
  if (!cfg.force && isParentPr(meta)) {
    const coverage = await integratedReview({
      get: (path) => api(cfg.githubToken, path),
      repo: cfg.repo,
      pr: meta,
      parent: await issueDetails(issue.number),
    });
    if (coverage.covered) {
      const comment = await postComment(
        pr,
        scopeMarker +
          '\n' +
          formatPrComment({
            sha,
            result: 'pass',
            attempt: 1,
            pr,
            issue: issue.number,
            integratedFrom: { branch: meta.head.ref, prs: coverage.prs },
          }),
      );
      return { pr, sha, status: 'pass', url: comment.html_url };
    }
    console.log(
      `  -> #${pr}: ${coverage.missing.length} commit(s) did not come through a reviewed PR into ${meta.head.ref}; reviewing the whole PR`,
    );
  }
  const diff = await api(cfg.githubToken, `/repos/${cfg.repo}/pulls/${pr}`, {
    accept: 'application/vnd.github.diff',
  });
  // The requirements record is recreated for every commit, so an earlier pass
  // is only trusted back to the first record made under this same approval.
  const approvalRecords = comments
    .filter(
      (c) =>
        c.user?.login === 'github-actions[bot]' &&
        (c.body ?? '').startsWith(`<!-- requirements-ready pr=${pr} sha=`) &&
        (c.body ?? '')
          .split('\n')[0]
          .endsWith(
            ` issue=${issue.number} review=${requirements.reviewId} -->`,
          ),
    )
    .map((c) => c.created_at)
    .sort();
  const carryFloor = approvalRecords[0] ?? requirements.created_at;
  // Merging the parent branch into a stacked PR changes its head but not its
  // own change: carry an earlier pass over instead of reviewing it again.
  const slice = stack || integration ? sliceFingerprint(diff) : undefined;
  const carry =
    !cfg.force && slice
      ? findCarryOver({
          comments: comments.filter(
            (c) =>
              (c.body ?? '').startsWith(scopeMarker + '\n') &&
              Date.parse(c.created_at) >= Date.parse(carryFloor),
          ),
          pr,
          slice,
        })
      : null;
  if (carry && carry.sha !== sha) {
    let carried = false;
    try {
      const { status } = await api(
        cfg.githubToken,
        `/repos/${cfg.repo}/compare/${carry.sha}...${sha}`,
      );
      carried = inSync(status);
    } catch {
      // The earlier commit is gone (force push): review normally.
    }
    if (carried) {
      const comment = await postComment(
        pr,
        scopeMarker +
          '\n' +
          formatPrComment({
            sha,
            result: 'pass',
            attempt: 1,
            pr,
            issue: issue.number,
            slice,
            carriedFrom: carry.sha,
          }),
      );
      return { pr, sha, status: 'pass', url: comment.html_url };
    }
  }
  const context = {
    issue,
    pullRequest: { title: meta.title, body: meta.body },
    prNumber: pr,
    prCount,
    diff,
    rules,
  };
  let outcome;
  const attempt = prior.errorAttempts + 1;
  let plan;
  try {
    plan = planReview(context, meta);
    if (plan.prompts.length) {
      context.ciEvidence = await ciEvidence({
        repo: cfg.repo,
        pr,
        sha,
        get: (path) => api(cfg.githubToken, path),
      });
      if (context.ciEvidence.status !== 'completed')
        return {
          pr,
          sha,
          status: 'waiting',
          reason: 'Waiting for CI for this commit.',
        };
      plan = planReview(context, meta);
    }
  } catch (error) {
    plan = undefined;
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
        skipped: outcome.skipped,
        binaryOnly: outcome.binaryOnly,
        pr,
        issue: issue.number,
        slice,
      }),
  );
  return { pr, sha, url: comment.html_url, ...outcome };
}

// Blocks parent PRs whose integration work is not finished, keeping their issue
// In Progress with a note. Returns whether anything was blocked.
async function parentWaiting(board, item, snapshot) {
  const issue = item.content;
  const blocked = [];
  for (const { pr } of snapshot) {
    if (!isParentPr(pr)) continue;
    // The PR's own links decide which issue owns the branch, as in delivery.
    const numbers = new Set([
      issue.number,
      ...referencedIssueNumbers(pr.body, { stacked: true }),
    ]);
    blocked.push(
      ...parentReasons({
        pr,
        issues: await Promise.all([...numbers].map(issueDetails)),
        openInto: await pagedGet(
          `/repos/${cfg.repo}/pulls?state=open&base=${encodeURIComponent(pr.head.ref)}`,
        ),
      }),
    );
  }
  if (!blocked.length) return false;
  const status = await currentStatus(item.id);
  if ([STATUS_REVIEW, STATUS_TESTING].includes(status))
    await moveStatus(
      board,
      { ...item, status: { name: status } },
      'In Progress',
    );
  const reason = blocked.join(' ');
  const marker = issueMarker({
    issue: issue.number,
    state: `integration-waiting|${createHash('sha256').update(reason).digest('hex').slice(0, 12)}`,
  });
  console.log(`  -> In Progress: ${reason}`);
  if (!hasBotComment(await listComments(issue.number), marker))
    await postComment(
      issue.number,
      `${marker}\nThe parent PR is not reviewed or handed to QA yet: ${reason}`,
    );
  return true;
}

// PRs into an integration branch: agent review only, no requirements step,
// QA handoff or QA request. A sub-issue whose child PR is ready for review
// stays in Ready for Code Review until the merge closes it; integration work
// linked to the parent issue never moves the parent's card.
async function reviewIntegrationPrs(board, item, prs, { ownsBoard }) {
  const issue = item.content;
  const rules = await readRules();
  let target = null;
  for (const pr of prs) {
    const role = integrationRole({
      pr,
      issues: await Promise.all(
        referencedIssueNumbers(pr.body, { stacked: true }).map(issueDetails),
      ),
    });
    if (role.kind === 'invalid' || role.issue !== issue.number) {
      console.log(
        `  -> #${pr.number}: not reviewed: ${role.reason ?? `it belongs to #${role.issue}`}`,
      );
      continue;
    }
    if (role.kind === 'child')
      target =
        target === STATUS_REVIEW || !pr.draft ? STATUS_REVIEW : 'In Progress';
    if (pr.draft) {
      console.log(`  -> #${pr.number}: draft, not reviewed`);
      continue;
    }
    const result = await reviewPr({
      pr: pr.number,
      issue,
      prCount: prs.length,
      rules,
      // A verdict from before the PR's latest retarget reviewed another base.
      requirements: {
        sha: pr.head.sha,
        severity: severityFor(pr),
        created_at: new Date(
          retargetedAt(await listTimeline(pr.number)),
        ).toISOString(),
      },
      integration: true,
    });
    console.log(
      `  -> #${pr.number} (${role.kind} of #${role.parent}): ${result.status}${result.reason ? `: ${result.reason}` : ''}`,
    );
  }
  if (ownsBoard && target) await moveStatus(board, item, target);
}

async function processIssue(board, item) {
  const issue = item.content;
  console.log(`#${issue.number} ${issue.title}`);

  if (
    issue.closedByPullRequestsReferences.pageInfo.hasNextPage ||
    issue.timelineItems?.pageInfo?.hasNextPage
  )
    throw new Error(
      'More than 100 linked PR references; refusing partial review',
    );
  const linkedNumbers = pullRequestsLinkedToIssue(issue)
    .filter(
      (p) => p.state === 'OPEN' && p.repository.nameWithOwner === cfg.repo,
    )
    .map((p) => p.number);
  // PRs into an integration branch get agent review only; every other PR
  // goes through the flow below.
  const prNumbers = [];
  const integrationPrs = [];
  for (const number of linkedNumbers) {
    const pr = await api(cfg.githubToken, `/repos/${cfg.repo}/pulls/${number}`);
    if (pr.state === 'open' && isIntegrationBranch(pr.base.ref))
      integrationPrs.push(pr);
    else prNumbers.push(number);
  }
  if (integrationPrs.length) {
    // A sub-issue (as opposed to a parent issue, which owns the branch) is
    // delivered by its child PR, which also owns its card.
    const details = await issueDetails(issue.number);
    const subIssue = Boolean(details.parent) && !details.branches.length;
    await reviewIntegrationPrs(board, item, integrationPrs, {
      ownsBoard: subIssue,
    });
    if (!prNumbers.length) return;
    // Its work reaches main through the parent PR: a PR into main linked to
    // it must not take the sub-issue to QA on its own.
    if (subIssue) {
      const marker = issueMarker({
        issue: issue.number,
        state: `child-and-main|${prNumbers.join(',')}`,
      });
      console.log(
        `  -> sub-issue also has PRs into main: ${prNumbers.join(', ')}`,
      );
      if (!hasBotComment(await listComments(issue.number), marker))
        await postComment(
          issue.number,
          `${marker}\nThis sub-issue is delivered by its child PR into the integration branch. PRs ${prNumbers.map((n) => `#${n}`).join(', ')} into main are not reviewed or handed to QA here; link them to the parent issue instead.`,
        );
      return;
    }
  }

  async function snapshots() {
    const all = [];
    const stacked = [];
    const fetched = [];
    for (const number of prNumbers) {
      const pr = await api(
        cfg.githubToken,
        `/repos/${cfg.repo}/pulls/${number}`,
      );
      if (pr.state !== 'open')
        throw new Error(`PR #${number} is no longer open`);
      fetched.push(pr);
    }
    // A plain chain of linked PRs onto main is reviewed and tested as one stack.
    // Anything else that does not target main keeps waiting for its prerequisite.
    // The delivery check judges the whole chain of open PRs, so a stack this
    // issue cannot see completely would be handed to QA differently by the two
    // and never pass: such a stack waits, with a note saying why.
    const stackByPr = new Map();
    const blocked = new Map();
    const pagedList = async (path) => {
      const items = [];
      for (let page = 1; ; page++) {
        const batch = await api(
          cfg.githubToken,
          `${path}&per_page=100&page=${page}`,
        );
        items.push(...batch);
        if (batch.length < 100) return items;
      }
    };
    for (const stack of buildStacks(fetched).stacks) {
      // After the bottom PR of a stack was merged on its own, the rest still targets its
      // branch until the next one is retargeted: that stack carries on, even
      // when only one PR is left.
      const resuming = await resumableBase({
        list: pagedList,
        compare: async (parent, child) =>
          (
            await api(
              cfg.githubToken,
              `/repos/${cfg.repo}/compare/${parent}...${child}`,
            )
          ).status,
        repo: cfg.repo,
        bottom: stack.bottom,
      });
      if (stack.bottom.base.ref !== 'main' && !resuming) continue;
      const above = (
        await api(
          cfg.githubToken,
          `/repos/${cfg.repo}/pulls?state=open&base=${encodeURIComponent(stack.tip.head.ref)}&per_page=100`,
        )
      )
        // A child PR into the parent PR's integration branch is not stacked on it.
        .filter(
          (p) =>
            !prNumbers.includes(p.number) && !isIntegrationBranch(p.base?.ref),
        );
      const lows = stack.prs.filter((p) => severityFor(p) === 'low');
      const reason = above.length
        ? `${above.map((p) => `#${p.number}`).join(', ')} is stacked on #${stack.tip.number} but not linked to this issue; link every PR of a stack to the same issue.`
        : stack.prs.length > 1 &&
            severityFor(stack.tip) === 'low' &&
            lows.length < stack.prs.length
          ? `The stack tip #${stack.tip.number} is Low severity and gets no QA, so it cannot cover the PRs below it; put a Standard or High PR on top.`
          : null;
      for (const member of stack.prs) {
        if (reason) blocked.set(member.number, reason);
        else if (stack.prs.length > 1 || resuming)
          stackByPr.set(member.number, stack);
      }
    }
    for (const reason of new Set(blocked.values())) {
      const members = [...blocked]
        .filter(([, r]) => r === reason)
        .map(([n]) => n);
      const marker = issueMarker({
        issue: issue.number,
        state: `stack-blocked|${members.join(',')}|${createHash('sha256').update(reason).digest('hex').slice(0, 12)}`,
      });
      console.log(`  -> waiting: ${reason}`);
      if (!hasBotComment(await listComments(issue.number), marker))
        await postComment(
          issue.number,
          `${marker}\nStack of ${members.map((n) => `#${n}`).join(', ')} is not handed to QA: ${reason}`,
        );
    }
    for (const pr of fetched) {
      const number = pr.number;
      pr.stack = stackByPr.get(number);
      if (blocked.has(number) || (pr.base.ref !== 'main' && !pr.stack)) {
        stacked.push(pr);
        continue;
      }
      const reviews = [];
      for (let page = 1; ; page++) {
        const batch = await api(
          cfg.githubToken,
          `/repos/${cfg.repo}/pulls/${number}/reviews?per_page=100&page=${page}`,
        );
        reviews.push(...batch);
        if (batch.length < 100) break;
      }
      pr.technicalReviewRequired = technicalReviewRequired(
        pr,
        technicalReviewRequired(pr) ? [] : await listTimeline(number),
      );
      if (pr.state !== 'open' || (pr.base.ref !== 'main' && !pr.stack))
        throw new Error(`PR #${number} is not open against main`);
      if (severityFor(pr) !== 'low' && !isDependencyUpdate(pr, cfg.repo))
        all.push({ pr, reviews, comments: await listComments(number) });
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
        `${scopeMarker('issue-requirements', scope.grantRecord)}\nRequirements approved by @${scope.grantRecord.reviewer} for the current issue scope. Use /requirements-rereview for scope changes.`,
      );
    for (const entry of all) {
      entry.pr.requirements = scope.approval;
      entry.pr.requirementsVersion = scope.version;
    }
    return { eligible: all, stacked };
  }
  const initialSnapshot = await snapshots();
  const initial = initialSnapshot.eligible;
  for (const pr of initialSnapshot.stacked)
    console.log(
      `  -> waiting: PR #${pr.number} targets ${pr.base.ref}; retarget to main after its prerequisite merges`,
    );
  if (initialSnapshot.stacked.length && item.status?.name === STATUS_TESTING) {
    if (!(await moveStatus(board, item, STATUS_REVIEW))) return;
    item = { ...item, status: { name: STATUS_REVIEW } };
  }
  if (!initial.length) {
    console.log('  -> no linked Standard/High PRs need review or QA');
    return;
  }
  // A parent PR becomes eligible only once its integration work is finished;
  // until then the parent issue stays In Progress and is not reviewed.
  if (await parentWaiting(board, item, initial)) return;
  const reviewPrNumbers = initial.map(({ pr }) => pr.number);
  const transition = requirementsTransition(item.status?.name, initial);
  if (transition.review && item.status?.name === STATUS_TESTING) {
    for (const { pr, reviews } of initial) {
      const approval = reviewStartApproval(pr, reviews);
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
    const approval = reviewStartApproval(pr, reviews);
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
        `${marker}\n${severityFor(pr) === 'high' ? 'High severity: agent and human code review come first; requirements approval is requested afterwards' : 'Standard severity: requirements approval is not required'} for commit \`${pr.head.sha}\`. Issue #${issue.number}: ready for code review.`,
      );
    requirementRecords.set(pr.number, {
      ...record,
      created_at: record.created_at ?? new Date().toISOString(),
      sha: pr.head.sha,
      reviewId: approval.id,
      severity: severityFor(pr),
    });
  }
  const rules = await readRules();
  const results = [];
  for (const pr of reviewPrNumbers) {
    results.push(
      await reviewPr({
        pr,
        issue,
        prCount: reviewPrNumbers.length,
        rules,
        requirements: requirementRecords.get(pr),
        stack: initial.find((snapshot) => snapshot.pr.number === pr).pr.stack,
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
  const currentSnapshot = await snapshots();
  const current = currentSnapshot.eligible;
  const stacked = currentSnapshot.stacked;
  const rolesByPr = new Map(
    current.map(({ pr }) => [pr.number, reviewersFor(pr.user.login)]),
  );
  // Eligibility can change while the review ran: never hand a parent PR to QA
  // that is no longer eligible.
  if (await parentWaiting(board, item, current)) return;
  const stillApproved = requirementsTransition(item.status.name, current);
  if (
    !stillApproved.review ||
    current.length !== initial.length ||
    current.some(
      ({ pr }) =>
        !initial.some((s) => s.pr.number === pr.number) ||
        !sameSeverity(pr, initial.find((s) => s.pr.number === pr.number).pr) ||
        pr.head.sha !==
          initial.find((s) => s.pr.number === pr.number).pr.head.sha ||
        pr.technicalReviewRequired !==
          initial.find((s) => s.pr.number === pr.number).pr
            .technicalReviewRequired ||
        pr.state !== 'open' ||
        (pr.base.ref !== 'main' && !pr.stack) ||
        reviewStartApproval(
          pr,
          current.find((s) => s.pr.number === pr.number).reviews,
        )?.id !==
          reviewStartApproval(
            initial.find((s) => s.pr.number === pr.number).pr,
            initial.find((s) => s.pr.number === pr.number).reviews,
          )?.id,
    )
  ) {
    const next =
      stillApproved.review || (!current.length && stacked.length)
        ? STATUS_REVIEW
        : 'In Progress';
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
  // Human code review is requested only once CI and the agent review (or its
  // manual waiver) have passed on the current commit.
  for (const r of results) {
    if (!['pass', 'waived'].includes(r.status)) continue;
    const snapshot = current.find(({ pr }) => pr.number === r.pr);
    if (
      !snapshot?.pr.technicalReviewRequired ||
      snapshot.pr.base.ref !== 'main'
    )
      continue;
    const ci = await ciEvidence({
      repo: cfg.repo,
      pr: r.pr,
      sha: r.sha,
      get: (path) => api(cfg.githubToken, path),
    });
    if (ci.status !== 'completed' || ci.conclusion !== 'success') continue;
    await ensureTechnicalReviewRequest({
      api: (path, options) => api(cfg.githubToken, path, options),
      repo: cfg.repo,
      pr: snapshot.pr,
      requiredByHistory: true,
      dryRun: cfg.dryRun,
    });
  }
  const technicalPending = current.filter(
    ({ pr, reviews }) =>
      pr.technicalReviewRequired && !technicalReviewApproval(pr, reviews),
  );
  let moved = false;
  const previews = current.filter(({ pr }) => isStorybookPreview(pr));
  const previewOnly =
    stacked.length === 0 &&
    previews.length > 0 &&
    previews.length === current.length;
  const implementationResults = results.filter(
    (result) =>
      !isStorybookPreview(current.find(({ pr }) => pr.number === result.pr).pr),
  );
  const previewsApproved = previews.every(({ pr, reviews }) =>
    storybookPreviewApproval(pr, reviews),
  );
  // PM approval gates the preview PR itself; it must not hold an otherwise
  // review-ready implementation PR out of its normal QA handoff.
  const mixedIssueReadyForQa =
    implementationResults.length > 0 &&
    decideIssue(implementationResults).outcome === 'pass';
  // High scope approval is requested after code review: until it exists, the
  // issue waits in Ready for Code Review.
  const scopePending = current.filter(
    ({ pr, reviews }) =>
      !isStorybookPreview(pr) && !requirementsApproval(pr, reviews),
  );
  const handoffReady =
    (decision.outcome === 'pass' || mixedIssueReadyForQa) &&
    technicalPending.length === 0 &&
    scopePending.length === 0;
  if (handoffReady) {
    // Record the scope approval after agent and human code review.
    for (const { pr, reviews } of current) {
      const approval = requirementsApproval(pr, reviews);
      if (!approval || approval.exempt || isStorybookPreview(pr)) continue;
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
            (c.body ?? '').startsWith(marker + '\n') &&
            Date.parse(c.created_at) >= Date.parse(approval.submitted_at),
        )
        .at(-1);
      if (!record)
        record = await postComment(
          pr.number,
          `${marker}\nIssue requirements approved by @${approval.reviewer ?? reviewersFor(pr.user.login).requirements} after code review for commit \`${pr.head.sha}\`. Issue #${issue.number}: ready for QA.`,
        );
      requirementRecords.set(pr.number, {
        ...requirementRecords.get(pr.number),
        created_at: record.created_at ?? new Date().toISOString(),
      });
    }
  }
  if (
    decision.outcome === 'pass' &&
    previewOnly &&
    !previewsApproved &&
    technicalPending.length === 0
  ) {
    if (item.status.name === STATUS_TESTING)
      moved = await moveStatus(board, item, STATUS_REVIEW);
    const state = `storybook-preview-awaiting-pm|${resultsKey(results) || 'no-pr'}`;
    const marker = issueMarker({ issue: issue.number, state });
    if (!hasBotComment(await listComments(issue.number), marker)) {
      await postComment(
        issue.number,
        `${marker}\nStorybook preview passed independent review. Waiting for current-commit PM approval; no QA handoff will be sent until preview approval is recorded.`,
      );
    }
  } else if (
    decision.outcome === 'pass' &&
    previewOnly &&
    technicalPending.length === 0
  ) {
    moved = await moveStatus(board, item, 'Sprint Backlog');
    const state = `storybook-preview-approved|${resultsKey(results) || 'no-pr'}`;
    const marker = issueMarker({ issue: issue.number, state });
    if (!hasBotComment(await listComments(issue.number), marker)) {
      await postComment(
        issue.number,
        `${marker}\nStorybook preview passed independent review and current-commit PM approval. No separate QA handoff is required; the issue remains open in Sprint Backlog.`,
      );
    }
  } else if (handoffReady) {
    moved = await moveStatus(
      board,
      item,
      stacked.length ? STATUS_REVIEW : STATUS_TESTING,
    );
    if (moved) {
      for (const r of results) {
        const snapshot = current.find(({ pr }) => pr.number === r.pr);
        if (isStorybookPreview(snapshot.pr)) continue;
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
          // One QA pass per stack: the tip contains every lower PR, so only the
          // tip asks for it. Lower PRs get the record the delivery check needs.
          const stack = snapshot.pr.stack;
          const tip = stack?.tip;
          const covered = tip && tip.number !== r.pr;
          await postComment(
            r.pr,
            covered
              ? `${marker}\nReady for QA via stack tip #${tip.number} · issue #${issue.number} · \`${r.sha}\`. No separate QA pass: testing and approving the tip covers this PR.`
              : `${marker}\nReady for QA · issue #${issue.number} · \`${r.sha}\`.\n${r.status === 'waived' ? `Copilot waived ([reason](${r.waiver.url})). ` : ''}${stack ? `Stack: ${stack.prs.map((member) => `#${member.number}`).join(' ← ')}. ` : ''}@${rolesByPr.get(r.pr).qa}: test this commit${stack ? ' (it contains the whole stack)' : ''}, then approve.`,
          );
        }
        if (snapshot.pr.stack && snapshot.pr.stack.tip.number !== r.pr)
          continue;
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
          stacked: Boolean(snapshot.pr.stack),
        });
      }
    }
  } else if (
    decision.outcome === 'pass' &&
    technicalPending.length === 0 &&
    scopePending.length
  ) {
    if (item.status.name === STATUS_TESTING)
      moved = await moveStatus(board, item, STATUS_REVIEW);
    const waitingFor = scopePending.map(({ pr }) => `#${pr.number}`).join(', ');
    const state = `requirements-awaiting|${waitingFor}|${resultsKey(results) || 'no-pr'}`;
    const marker = issueMarker({ issue: issue.number, state });
    if (!hasBotComment(await listComments(issue.number), marker)) {
      await postComment(
        issue.number,
        `${marker}\nAgent and code review passed; requirements approval by ${reviewersFor(scopePending[0].pr.user.login).requirements} is requested for PRs ${waitingFor} (review or /requirements-approve). QA handoff is paused until it is recorded.`,
      );
    }
  } else if (technicalPending.length) {
    if (item.status.name === STATUS_TESTING)
      moved = await moveStatus(board, item, STATUS_REVIEW);
    const waitingFor = technicalPending
      .map(({ pr }) => `#${pr.number}`)
      .join(', ');
    const state = `technical-review-awaiting|${waitingFor}|${resultsKey(results) || 'no-pr'}`;
    const marker = issueMarker({ issue: issue.number, state });
    if (!hasBotComment(await listComments(issue.number), marker)) {
      await postComment(
        issue.number,
        `${marker}\nAgent review passed; waiting for current-commit technical approval from @rmnskb on PRs ${waitingFor}. QA handoff is paused until approval is recorded.`,
      );
    }
  } else if (item.status.name === STATUS_TESTING) {
    await moveStatus(board, item, STATUS_REVIEW);
  }

  if (stacked.length) {
    const waitingFor = stacked.map((pr) => `#${pr.number}`).join(', ');
    const state = `stacked-awaiting|${waitingFor}|${resultsKey(results) || 'no-pr'}`;
    const marker = issueMarker({ issue: issue.number, state });
    if (!hasBotComment(await listComments(issue.number), marker))
      await postComment(
        issue.number,
        `${marker}\nPRs targeting main were processed independently. Stacked PRs ${waitingFor} still await their prerequisites and retargeting to main. The issue remains in Ready for Code Review; eligible prerequisite PRs can receive their own QA handoff.`,
      );
    return;
  }

  const outcome = handoffReady ? 'pass' : decision.outcome;
  const state = `${outcome === 'pass' ? (moved ? 'moved' : 'skipped') : 'blocked'}|${resultsKey(results) || 'no-pr'}`;
  const marker = issueMarker({ issue: issue.number, state });
  if (!hasBotComment(await listComments(issue.number), marker)) {
    await postComment(
      issue.number,
      formatIssueNote({
        issue: issue.number,
        state,
        outcome,
        reasons: decision.reasons,
        results,
        moved,
      }),
    );
  }
  console.log(`  -> ${decision.outcome}${moved ? ' (moved)' : ''}`);
}

const runScope = await eventScope();
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
    (!cfg.onlyIssue || i.content.number === cfg.onlyIssue) &&
    includesIssue(runScope, i.content),
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
