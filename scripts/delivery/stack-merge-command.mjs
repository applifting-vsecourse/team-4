// The `/merge-stack` comment command: merges a whole stack of PRs onto main.
//
//   /merge-stack          merge every PR of the stack this PR belongs to
//   /merge-stack check    only report whether, and in what order, it would merge
//
// Like /copilot-waive, the command is read back from the API (never taken from
// the event payload) and only named people may use it. Reads and replies use
// the workflow token; the merges and retargets use PROJECT_AUTOMATION_TOKEN, because
// pushes made with the workflow token trigger no workflows, so deploy, release
// and the re-evaluation after a retarget would never run.
import { readFile } from 'node:fs/promises';
import { PM, QA, TECHNICAL_REVIEWER } from './lib.mjs';
import { NotReady, mergeStack } from './stack-merge.mjs';

export const STACK_MERGERS = [PM, TECHNICAL_REVIEWER, QA];

export function parseCommand(body) {
  const match = /^\/merge-stack(?: (check))?$/.exec((body ?? '').trim());
  return match ? { check: match[1] === 'check' } : null;
}

export const resultMarker = (pr, result) =>
  `<!-- stack-merge pr=${pr} result=${result} -->`;

/**
 * @returns {Promise<{ outcome: string }>} `ignored`, `denied`, `refused`,
 *   `checked`, `merged` or `failed`; exactly one reply is posted for anything
 *   but `ignored`.
 */
export async function handleCommand({
  api,
  write,
  repo,
  event,
  post,
  wait,
  log = console.log,
}) {
  if (!event.issue?.pull_request || !event.comment?.id)
    return { outcome: 'ignored' };
  const number = event.issue.number;
  const comment = await api(
    `/repos/${repo}/issues/comments/${event.comment.id}`,
  );
  const command = parseCommand(comment.body);
  if (!command || !comment.issue_url?.endsWith(`/issues/${number}`))
    return { outcome: 'ignored' };
  const reply = (result, text) =>
    post(`${resultMarker(number, result)}\n${text}`);

  const login = comment.user?.login ?? '';
  if (
    comment.user?.type !== 'User' ||
    !STACK_MERGERS.some((name) => name.toLowerCase() === login.toLowerCase())
  ) {
    await reply(
      'denied',
      `Only ${STACK_MERGERS.map((n) => `@${n}`).join(', ')} can use \`/merge-stack\`.`,
    );
    return { outcome: 'denied' };
  }
  if (!command.check && !write) {
    await reply(
      'failed',
      '`PROJECT_AUTOMATION_TOKEN` is not configured, so the stack cannot be merged. `/merge-stack check` still works.',
    );
    return { outcome: 'failed' };
  }

  const lines = [];
  try {
    const result = await mergeStack({
      api,
      write,
      repo,
      number,
      dryRun: command.check,
      requireStack: true,
      wait,
      log: (line) => {
        lines.push(line);
        log(line);
      },
    });
    if (command.check) {
      await reply(
        'checked',
        `Ready to merge. ${lines.at(0)}\nRun \`/merge-stack\` to merge it with merge commits, bottom to top.`,
      );
      return { outcome: 'checked' };
    }
    await reply(
      'merged',
      `Merged ${result.merged.map((n) => `#${n}`).join(' → ')} into \`main\` with merge commits.`,
    );
    return { outcome: 'merged', merged: result.merged };
  } catch (error) {
    const refused = error instanceof NotReady;
    await reply(
      refused ? 'refused' : 'failed',
      `${refused ? 'Nothing was merged.' : 'The merge stopped part way.'}\n\n${error.message}`,
    );
    return { outcome: refused ? 'refused' : 'failed' };
  }
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token || !process.env.GITHUB_EVENT_PATH)
    throw new Error(
      'GITHUB_REPOSITORY, GITHUB_TOKEN and GITHUB_EVENT_PATH are required',
    );
  const client =
    (bearer) =>
    async (path, { method = 'GET', body } = {}) => {
      const response = await fetch(`https://api.github.com${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${bearer}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await response.text();
      if (!response.ok)
        throw new Error(
          `${method} ${path}: ${response.status} ${JSON.parse(text || '{}').message ?? ''}`.trim(),
        );
      return text ? JSON.parse(text) : null;
    };
  const api = client(token);
  const event = JSON.parse(
    await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'),
  );
  const { outcome } = await handleCommand({
    api,
    write: process.env.PROJECT_AUTOMATION_TOKEN
      ? client(process.env.PROJECT_AUTOMATION_TOKEN)
      : undefined,
    repo,
    event,
    post: (body) =>
      api(`/repos/${repo}/issues/${event.issue.number}/comments`, {
        method: 'POST',
        body: { body },
      }),
  });
  console.log(`stack-merge: ${outcome}`);
  // A merge which stopped part way must be visible as a failed run.
  if (outcome === 'failed') process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
