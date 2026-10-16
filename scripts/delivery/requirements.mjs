import { createHash } from 'node:crypto';
import { PM } from './lib.mjs';

const BOT = 'github-actions[bot]';
export const scopeHash = (issue) =>
  createHash('sha256')
    .update(JSON.stringify([issue.title, issue.body ?? '']))
    .digest('hex');
export const scopeMarker = (kind, data) =>
  `<!-- ${kind} ${JSON.stringify(data)} -->`;
function readRecord(comment, kind) {
  if (comment.user?.login !== BOT) return null;
  const line = (comment.body ?? '').split('\n')[0];
  const prefix = `<!-- ${kind} `;
  if (!line.startsWith(prefix) || !line.endsWith(' -->')) return null;
  try {
    return JSON.parse(line.slice(prefix.length, -4));
  } catch {
    return null;
  }
}
const date = (comment) => comment.updated_at ?? comment.created_at;

// Scope approval is issue-level evidence. Human PR approvals seed it once;
// later native dismissal due to a code push cannot revoke a stored scope grant.
export function issueRequirements(issue, comments, snapshots) {
  const scope = scopeHash(issue);
  const grants = comments
    .map((c) => readRecord(c, 'issue-requirements'))
    .filter((r) => r?.issue === issue.number && r.reviewer === PM);
  const resets = comments
    .map((c) => readRecord(c, 'requirements-reset'))
    .filter((r) => r?.issue === issue.number);
  const requests = comments
    .filter(
      (c) =>
        /^(OWNER|MEMBER|COLLABORATOR)$/.test(c.author_association ?? '') &&
        /^\/requirements-rereview\s*$/.test((c.body ?? '').trim()),
    )
    .map((c) => ({
      issue: issue.number,
      source: `comment:${c.id}:${date(c)}`,
      at: date(c),
    }));
  const reset = [...resets, ...requests]
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .at(-1);
  const cycle = reset?.source ?? 'initial';
  const resetRecord =
    reset && !resets.some((r) => r.source === reset.source) ? reset : null;
  const stored = grants
    .filter((r) => r.scope === scope && r.cycle === cycle)
    .at(-1);
  const wrap = (r) => ({
    id: `scope:${r.scope}:${r.cycle}:${r.source}`,
    submitted_at: r.submitted_at,
    reviewer: r.reviewer,
  });
  if (stored)
    return {
      approval: wrap(stored),
      resetRecord,
      version: scope + ':' + cycle,
    };
  const consumed = new Set(grants.map((r) => r.source));
  const sources = [];
  for (const { pr, reviews } of snapshots) {
    // Author exemption never becomes a transferable approval of other PRs.
    if (pr.user.login.toLowerCase() === PM.toLowerCase()) continue;
    for (const r of reviews)
      if (
        r.user?.login.toLowerCase() === PM.toLowerCase() &&
        r.state === 'APPROVED'
      ) {
        sources.push({
          source: `review:${pr.number}:${r.id}`,
          submitted_at: r.submitted_at,
        });
      }
  }
  for (const c of comments)
    if (
      c.user?.login.toLowerCase() === PM.toLowerCase() &&
      /^\/requirements-approve\s*$/.test((c.body ?? '').trim())
    ) {
      sources.push({
        source: `comment:${c.id}:${date(c)}`,
        submitted_at: date(c),
      });
    }
  const fresh = sources
    .filter(
      (r) =>
        !consumed.has(r.source) &&
        (!reset || Date.parse(r.submitted_at) > Date.parse(reset.at)),
    )
    .sort((a, b) => Date.parse(a.submitted_at) - Date.parse(b.submitted_at))[0];
  if (!fresh)
    return { approval: null, resetRecord, version: scope + ':' + cycle };
  const grantRecord = {
    issue: issue.number,
    scope,
    cycle,
    reviewer: PM,
    ...fresh,
  };
  return {
    approval: wrap(grantRecord),
    grantRecord,
    resetRecord,
    version: scope + ':' + cycle,
  };
}
