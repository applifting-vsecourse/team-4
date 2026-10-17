import test from 'node:test';
import assert from 'node:assert/strict';
import {
  copilotWaiver,
  waiverMarker,
  waiverObservation,
} from './copilot-waiver.mjs';
import { evaluate, readyMarker, requirementsMarker } from './lib.mjs';

const sha = 'a'.repeat(40);
const at = (s) => `2026-10-17T09:00:${String(s).padStart(2, '0')}Z`;
function fixture() {
  const pr = {
    number: 12,
    head: { sha },
    user: { login: 'developer' },
    draft: false,
    issue_url: 'https://api.github.com/repos/owner/repo/issues/12',
  };
  const command = {
    id: 10,
    user: { login: 'darebakdavca', type: 'User' },
    body: `/copilot-waive ${sha} Accept the documented findings for this commit.`,
    created_at: at(3),
    updated_at: at(3),
    issue_url: pr.issue_url,
    html_url: 'https://github.com/owner/repo/pull/12#issuecomment-10',
  };
  const waiver = copilotWaiver({ pr, comments: [command] });
  const bot = (body, time) => ({
    user: { login: 'github-actions[bot]' },
    body,
    created_at: at(time),
  });
  return {
    pr,
    issues: [
      { number: 78, requirements: { id: 'grant', submitted_at: at(1) } },
    ],
    reviews: [
      {
        id: 1,
        user: { login: 'MatejKrones' },
        state: 'APPROVED',
        commit_id: sha,
        submitted_at: at(5),
      },
    ],
    comments: [
      command,
      bot(
        requirementsMarker(12, sha, 78, 'grant') + '\nRequirements approved',
        1,
      ),
      bot(
        `<!-- agent-review-scope issue=78 -->\n<!-- agent-review pr=12 sha=${sha} result=findings attempt=1 -->\nFindings remain visible`,
        2,
      ),
      bot(
        readyMarker(12, sha, 78) +
          '\n' +
          waiverMarker(waiver) +
          '\nManually waived by David',
        4,
      ),
    ],
  };
}

test('the owner can waive any PR, with full head SHA and a reason', () => {
  const f = fixture();
  const waiver = copilotWaiver(f);
  assert.equal(
    waiver.reason,
    'Accept the documented findings for this commit.',
  );
  assert.equal(waiver.commentId, 10);
  assert.equal(waiver.url, f.comments[0].html_url);
  assert.equal(evaluate(f).pass, true);
  assert.match(f.comments[2].body, /result=findings/);
});

for (const user of [
  { login: 'MatejKrones', type: 'User' },
  { login: 'collaborator', type: 'User' },
  { login: 'github-actions[bot]', type: 'Bot' },
  { login: 'darebakdavca', type: 'Bot' },
  { login: 'darebakdavca' },
]) {
  test(`does not accept another actor or a bot: ${JSON.stringify(user)}`, () => {
    const f = fixture();
    f.comments[0].user = user;
    assert.equal(copilotWaiver(f), null);
    assert.equal(evaluate(f).pass, false);
  });
}

for (const body of [
  `/copilot-waive ${sha}`,
  `/copilot-waive ${sha}   `,
  `/copilot-waive ${sha.slice(0, 7)} reason`,
  `/copilot-waive ${'b'.repeat(40)} reason`,
  `> /copilot-waive ${sha} reason`,
  `\`\`\`\n/copilot-waive ${sha} reason\n\`\`\``,
  `Please run /copilot-waive ${sha} reason`,
  `/copilot-waive ${sha} reason\nmore text`,
]) {
  test(`rejects malformed, stale or quoted commands: ${JSON.stringify(body)}`, () => {
    const f = fixture();
    f.comments[0].body = body;
    assert.equal(copilotWaiver(f), null);
    assert.equal(evaluate(f).pass, false);
  });
}

test('requires native PR-comment identity, timestamp and matching PR container', () => {
  for (const patch of [
    { id: 0 },
    { id: undefined },
    { updated_at: 'invalid' },
    { issue_url: 'https://api.github.com/repos/owner/repo/issues/99' },
  ]) {
    const f = fixture();
    Object.assign(f.comments[0], patch);
    assert.equal(copilotWaiver(f), null);
  }
});

test('a command on another PR or in issue text cannot grant a waiver', () => {
  const f = fixture();
  f.pr.issue_url = f.pr.issue_url.replace('/12', '/13');
  f.pr.number = 13;
  assert.equal(copilotWaiver(f), null);
  const g = fixture();
  g.pr.body = g.comments[0].body;
  g.comments.shift();
  assert.equal(copilotWaiver(g), null);
});

test('a new commit, deleted command or changed reason invalidates old waiver evidence', () => {
  for (const change of [
    (f) => {
      f.pr.head.sha = 'b'.repeat(40);
    },
    (f) => {
      f.comments.shift();
    },
    (f) => {
      f.comments[0].body += ' Updated reason.';
      f.comments[0].updated_at = at(6);
    },
  ]) {
    const f = fixture();
    change(f);
    assert.equal(evaluate(f).pass, false);
  }
});

test('new/edited commands need a fresh matching handoff and later QA', () => {
  const f = fixture();
  f.comments[0].body += ' Changed.';
  f.comments[0].updated_at = at(6);
  const waiver = copilotWaiver(f);
  f.comments[3].body =
    readyMarker(12, sha, 78) + '\n' + waiverMarker(waiver) + '\nNew handoff';
  f.comments[3].created_at = at(7);
  assert.equal(evaluate(f).pass, false);
  f.reviews[0].submitted_at = at(8);
  assert.equal(evaluate(f).pass, true);
});

test('latest valid owner command determines the handoff identity', () => {
  const f = fixture();
  f.comments.push({ ...f.comments[0], id: 11, updated_at: at(6) });
  assert.equal(copilotWaiver(f).commentId, 11);
  assert.equal(evaluate(f).pass, false);
});

test('waivers never replace requirements, QA, current-commit QA, handoff or draft policy', () => {
  for (const change of [
    (f) => {
      f.issues[0].requirements = null;
    },
    (f) => {
      f.comments.splice(1, 1);
    },
    (f) => {
      f.reviews = [];
    },
    (f) => {
      f.reviews[0].user.login = 'other';
    },
    (f) => {
      f.reviews[0].commit_id = 'b'.repeat(40);
    },
    (f) => {
      f.reviews[0].submitted_at = at(3);
    },
    (f) => {
      f.comments.pop();
    },
    (f) => {
      f.pr.draft = true;
    },
    (f) => {
      f.issues.push({ number: 79, requirements: f.issues[0].requirements });
    },
  ]) {
    const f = fixture();
    change(f);
    assert.equal(evaluate(f).pass, false);
  }
});

test('a forged or quoted manual handoff cannot replace the Actions bot handoff', () => {
  const f = fixture();
  f.comments[3].user.login = 'developer';
  assert.equal(evaluate(f).pass, false);
  const g = fixture();
  g.comments[3].body = '> ' + g.comments[3].body;
  assert.equal(evaluate(g).pass, false);
});

// Exercise the actual check publisher too: a manual waiver must be visible in
// the check summary and may never turn missing QA into a green delivery check.
async function checkScenario(mode) {
  const { copilotWaiver, waiverMarker } =
    await import('./scripts/delivery/copilot-waiver.mjs');
  const { requirementsMarker, readyMarker } =
    await import('./scripts/delivery/lib.mjs');
  const { issueRequirements } =
    await import('./scripts/delivery/requirements.mjs');
  const sha = 'a'.repeat(40);
  const pr = {
    number: 12,
    user: { login: 'darebakdavca' },
    head: { sha },
    state: 'open',
    base: { ref: 'main' },
    draft: false,
    issue_url: 'https://api.github.com/repos/owner/repo/issues/12',
  };
  const issue = { number: 78, title: 'Task', body: 'Scope' };
  const scope = issueRequirements(issue, [], [{ pr, reviews: [] }]);
  const command = {
    id: 10,
    user: { login: 'darebakdavca', type: 'User' },
    body: `/copilot-waive ${sha} Accepted findings`,
    issue_url: pr.issue_url,
    created_at: '2002-01-01',
    html_url: 'https://github.com/owner/repo/pull/12#issuecomment-10',
  };
  const waiver = copilotWaiver({ pr, comments: [command] });
  const bot = (body, created_at) => ({
    user: { login: 'github-actions[bot]' },
    body,
    created_at,
  });
  const comments = [
    command,
    bot(
      requirementsMarker(12, sha, 78, `author-exempt:${scope.version}`) + '\n',
      '2000-01-01',
    ),
    bot(
      `<!-- agent-review-scope issue=78 -->\n<!-- agent-review pr=12 sha=${sha} result=findings attempt=1 -->\n`,
      '2001-01-01',
    ),
    bot(
      readyMarker(12, sha, 78) + '\n' + waiverMarker(waiver) + '\n',
      '2003-01-01',
    ),
  ];
  if (mode === 'forged') command.user.login = 'collaborator';
  if (mode === 'deleted') comments.shift();
  const reviews =
    mode === 'no-qa'
      ? []
      : [
          {
            id: 1,
            user: { login: 'MatejKrones' },
            state: 'APPROVED',
            commit_id: sha,
            submitted_at: '2004-01-01',
          },
        ];
  let check;
  globalThis.fetch = async (url, options = {}) => {
    const path = new URL(url).pathname;
    const body = options.body ? JSON.parse(options.body) : {};
    let data;
    if (path === '/graphql')
      data = {
        data: {
          repository: {
            pullRequest: {
              closingIssuesReferences: {
                nodes: [
                  { number: 78, repository: { nameWithOwner: 'owner/repo' } },
                ],
                pageInfo: { hasNextPage: false },
              },
            },
          },
        },
      };
    else if (path === '/repos/owner/repo/check-runs') data = { id: 1 };
    else if (path === '/repos/owner/repo/check-runs/1') {
      check = body;
      data = {};
    } else if (path === '/repos/owner/repo/pulls') data = [pr];
    else if (path.endsWith('/pulls/12/reviews')) data = reviews;
    else if (path.endsWith('/issues/12/comments')) data = comments;
    else if (path.endsWith('/issues/78/comments')) data = [];
    else if (path.endsWith('/issues/78')) data = issue;
    else if (path.endsWith('/pulls/12')) data = pr;
    else throw new Error('Unexpected API ' + path);
    return { ok: true, json: async () => structuredClone(data) };
  };
  await import('./scripts/delivery/run.mjs');
  console.log(JSON.stringify(check));
}

for (const mode of ['valid', 'no-qa', 'forged', 'deleted']) {
  test(`real delivery check publisher handles ${mode} waiver evidence`, async () => {
    const { execFileSync } = await import('node:child_process');
    const out = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `await (${checkScenario.toString()})(${JSON.stringify(mode)})`,
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          GITHUB_REPOSITORY: 'owner/repo',
          GITHUB_TOKEN: 'mock',
        },
      },
    );
    const check = JSON.parse(out.trim().split('\n').at(-1));
    assert.equal(check.conclusion, mode === 'valid' ? 'success' : 'failure');
    if (mode === 'valid')
      assert.match(check.output.summary, /manually waived by darebakdavca/);
    if (mode === 'no-qa')
      assert.match(
        check.output.summary,
        /QA approval by MatejKrones is missing/,
      );
  });
}

test('deleting the latest processed waiver cannot revive an older valid command', () => {
  const f = fixture();
  const newest = {
    ...f.comments[0],
    id: 11,
    created_at: at(6),
    updated_at: at(6),
  };
  f.comments.push(newest);
  const waiver = copilotWaiver(f);
  f.comments.push({
    user: { login: 'github-actions[bot]' },
    body: waiverObservation(f.pr, waiver) + '\nObserved',
    created_at: at(7),
  });
  f.comments = f.comments.filter((c) => c !== newest);
  assert.equal(copilotWaiver(f), null);
  assert.equal(evaluate(f).pass, false);
});

test('invalidating the newest command blocks fallback before and after deleting it', () => {
  const f = fixture();
  const newest = {
    ...f.comments[0],
    id: 11,
    created_at: at(6),
    updated_at: at(6),
  };
  f.comments.push(newest);
  const waiver = copilotWaiver(f);
  f.comments.push({
    user: { login: 'github-actions[bot]' },
    body: waiverObservation(f.pr, waiver) + '\nObserved',
  });
  newest.body = 'Withdrawn';
  newest.updated_at = at(8);
  assert.equal(copilotWaiver(f), null);
  f.comments = f.comments.filter((c) => c !== newest);
  assert.equal(copilotWaiver(f), null);
  f.comments.push({
    ...newest,
    id: 12,
    body: `/copilot-waive ${sha} New explicit authorization`,
    updated_at: at(9),
  });
  assert.equal(copilotWaiver(f).commentId, 12);
});

test('a newer invalid command cannot silently select an older still-valid one', () => {
  const f = fixture();
  f.comments.push({
    ...f.comments[0],
    id: 11,
    body: `/copilot-waive ${sha}`,
    updated_at: at(6),
  });
  assert.equal(copilotWaiver(f), null);
});

test('forged, quoted and malformed observations cannot change authorization', () => {
  for (const kind of [
    'forged',
    'quoted',
    'malformed',
    'other-pr',
    'other-sha',
  ]) {
    const f = fixture();
    const newer = { ...copilotWaiver(f), commentId: 99, at: at(9) };
    const recordPr =
      kind === 'other-pr'
        ? { ...f.pr, number: 99 }
        : kind === 'other-sha'
          ? { ...f.pr, head: { sha: 'b'.repeat(40) } }
          : f.pr;
    let body = waiverObservation(recordPr, newer) + '\nObserved';
    if (kind === 'quoted') body = '> ' + body;
    if (kind === 'malformed')
      body = '<!-- copilot-waiver-observed invalid -->\n';
    f.comments.push({
      user: { login: kind === 'forged' ? 'developer' : 'github-actions[bot]' },
      body,
    });
    assert.equal(copilotWaiver(f).commentId, 10);
  }
});

test('waiver plus QA and handoffs still requires an actual scope approval', () => {
  const f = fixture();
  assert.ok(copilotWaiver(f));
  assert.equal(evaluate(f).pass, true);
  f.issues[0].requirements = null;
  const result = evaluate(f);
  assert.equal(result.pass, false);
  assert.ok(
    result.reasons.includes(
      'Issue #78 needs requirements approval by darebakdavca.',
    ),
  );
});

test('waiver cannot replace a missing or stale requirements handoff record', () => {
  for (const stale of [false, true]) {
    const f = fixture();
    if (stale)
      f.comments[1].body =
        requirementsMarker(12, sha, 78, 'obsolete-grant') + '\n';
    else f.comments.splice(1, 1);
    const result = evaluate(f);
    assert.equal(result.pass, false);
    assert.ok(
      result.reasons.includes(
        'Issue #78 has not entered code review after current requirements approval.',
      ),
    );
  }
});
