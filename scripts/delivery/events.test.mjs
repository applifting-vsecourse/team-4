import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { eventScope, includesIssue } from '../automation/events.mjs';
import {
  pullRequestsLinkedToIssue,
  referencedIssueNumbers,
} from '../automation/issue-links.mjs';

async function scope(name, payload) {
  const dir = await mkdtemp(join(tmpdir(), 'delivery-event-'));
  try {
    const path = join(dir, 'event.json');
    await writeFile(path, JSON.stringify(payload));
    return await eventScope({
      GITHUB_EVENT_NAME: name,
      GITHUB_EVENT_PATH: path,
    });
  } finally {
    await rm(dir, { recursive: true });
  }
}

test('PR events and PR comments select only their PR', async () => {
  for (const name of ['pull_request_target', 'pull_request_review'])
    assert.deepEqual(await scope(name, { pull_request: { number: 135 } }), {
      type: 'pr',
      number: 135,
    });
  assert.deepEqual(
    await scope('issue_comment', { issue: { number: 136, pull_request: {} } }),
    { type: 'pr', number: 136 },
  );
});

test('issue comments and edits select the issue, not the whole board', async () => {
  for (const name of ['issues', 'issue_comment'])
    assert.deepEqual(await scope(name, { issue: { number: 86 } }), {
      type: 'issue',
      number: 86,
    });
});

test('scheduled and manual reconciliation scan all work; unknown events fail closed', async () => {
  for (const name of ['schedule', 'workflow_dispatch'])
    assert.deepEqual(await eventScope({ GITHUB_EVENT_NAME: name }), {
      type: 'all',
    });
  await assert.rejects(scope('push', {}), /Unsupported delivery event/);
});

test('PR selection includes its issue but excludes an unrelated stacked PR issue', () => {
  const issue = {
    number: 86,
    repository: { nameWithOwner: 'owner/repo' },
    closedByPullRequestsReferences: {
      nodes: [
        {
          number: 135,
          state: 'OPEN',
          repository: { nameWithOwner: 'owner/repo' },
        },
      ],
    },
  };
  assert.equal(includesIssue({ type: 'pr', number: 135 }, issue), true);
  assert.equal(includesIssue({ type: 'pr', number: 144 }, issue), false);
  assert.equal(includesIssue({ type: 'issue', number: 86 }, issue), true);
  assert.equal(includesIssue({ type: 'issue', number: 89 }, issue), false);
});

test('CI completion selects its associated PRs without falling back to the full board', async () => {
  assert.deepEqual(
    await scope('workflow_run', {
      workflow_run: { event: 'pull_request', pull_requests: [{ number: 135 }] },
    }),
    { type: 'prs', numbers: [135] },
  );
  for (const payload of [
    { event: 'push', pull_requests: [] },
    { event: 'pull_request', pull_requests: [] },
  ])
    assert.deepEqual(await scope('workflow_run', { workflow_run: payload }), {
      type: 'prs',
      numbers: [],
    });
  const issue = {
    number: 86,
    repository: { nameWithOwner: 'owner/repo' },
    closedByPullRequestsReferences: {
      nodes: [
        {
          number: 135,
          state: 'OPEN',
          repository: { nameWithOwner: 'owner/repo' },
        },
      ],
    },
  };
  assert.equal(includesIssue({ type: 'prs', numbers: [135] }, issue), true);
  assert.equal(includesIssue({ type: 'prs', numbers: [] }, issue), false);
});

test('PR and issue links include non-closing cross-references', () => {
  const issue = {
    number: 86,
    repository: { nameWithOwner: 'owner/repo' },
    closedByPullRequestsReferences: { nodes: [] },
    timelineItems: {
      pageInfo: { hasNextPage: false },
      nodes: [
        {
          __typename: 'CrossReferencedEvent',
          source: {
            __typename: 'PullRequest',
            number: 144,
            state: 'OPEN',
            repository: { nameWithOwner: 'owner/repo' },
          },
          target: {
            __typename: 'Issue',
            number: 86,
            repository: { nameWithOwner: 'owner/repo' },
          },
        },
        {
          __typename: 'CrossReferencedEvent',
          source: {
            __typename: 'PullRequest',
            number: 145,
            state: 'OPEN',
            repository: { nameWithOwner: 'owner/repo' },
          },
          target: {
            __typename: 'Issue',
            number: 89,
            repository: { nameWithOwner: 'owner/repo' },
          },
        },
      ],
    },
  };
  assert.deepEqual(pullRequestsLinkedToIssue(issue), [
    { number: 144, state: 'OPEN', repository: { nameWithOwner: 'owner/repo' } },
  ]);
  assert.equal(includesIssue({ type: 'pr', number: 144 }, issue), true);
  assert.equal(includesIssue({ type: 'pr', number: 145 }, issue), false);

  assert.deepEqual(
    referencedIssueNumbers(
      [
        '## Why',
        'Refs #86, #88 and #90.',
        'References #91.',
        '> Refs #91',
        '```md',
        'Refs #92',
        '```',
        '<!-- Refs #93 -->',
        '`Refs #94`',
      ].join('\n'),
    ),
    [86, 88, 90, 91],
  );
});
