#!/usr/bin/env node
// Runs from main when a PR into an integration branch is closed. GitHub closes
// issues only for merges into the default branch, so a merged child PR closes
// the sub-issue it completes here. Everything is read live from GitHub; the
// event only names the PR.
import { readFile } from 'node:fs/promises';
import {
  closingIssueNumbers,
  referencedIssueNumbers,
} from '../automation/issue-links.mjs';
import {
  integrationRole,
  isIntegrationBranch,
  retargetedAt,
} from './feature.mjs';
import { headPassed, readIssueDetails } from './feature-github.mjs';

async function list(path) {
  const all = [];
  for (let page = 1; ; page++) {
    const batch = await api(`${path}?per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) return all;
  }
}
const comments = (number) => list(`/repos/${repo}/issues/${number}/comments`);

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repo || !token)
  throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required');
async function api(path, method = 'GET', body) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status}`);
  return response.json();
}

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
const pr = await api(`/repos/${repo}/pulls/${event.pull_request.number}`);
if (!pr.merged_at || !isIntegrationBranch(pr.base.ref)) {
  console.log(`#${pr.number}: not merged into an integration branch`);
} else {
  const issues = await Promise.all(
    referencedIssueNumbers(pr.body, { stacked: true }).map((number) =>
      readIssueDetails({
        repo,
        number,
        graphql: (query, variables) =>
          api('/graphql', 'POST', { query, variables }),
      }),
    ),
  );
  const role = integrationRole({ pr, issues });
  // The body can be edited after the merge: close only the sub-issue the
  // merged head was reviewed for, and only when the PR says it completes it.
  const reason =
    role.kind === 'invalid'
      ? role.reason
      : role.kind !== 'child'
        ? 'integration work closes no sub-issue'
        : !closingIssueNumbers(pr.body).includes(role.issue)
          ? `it refers to #${role.issue} without closing it (partial work)`
          : !headPassed(
                await comments(pr.number),
                pr,
                role.issue,
                retargetedAt(
                  await list(`/repos/${repo}/issues/${pr.number}/timeline`),
                ),
              )
            ? `its merged head has no passing agent review for #${role.issue}`
            : null;
  if (reason) {
    console.log(`#${pr.number}: no sub-issue closed: ${reason}`);
  } else {
    await api(`/repos/${repo}/issues/${role.issue}`, 'PATCH', {
      state: 'closed',
      state_reason: 'completed',
    });
    await api(`/repos/${repo}/issues/${role.issue}/comments`, 'POST', {
      body: `Completed by #${pr.number}, merged into \`${pr.base.ref.replaceAll('`', "'")}\`. The parent issue #${role.parent} continues with integration.`,
    });
    console.log(`#${pr.number}: closed sub-issue #${role.issue}`);
  }
}
