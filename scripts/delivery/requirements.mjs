import { severityFor } from './severity.mjs';
import { createHash } from 'node:crypto';
import { isRequirementsApprover } from './lib.mjs';

const BOT = 'github-actions[bot]';
// Only explicit delivery evidence is excluded. Requirement text, links and
// section titles remain scope, including text on completed checklist items.
export function scopeBody(body = '') {
  const result = [];
  let evidence = false;
  let fence = null;
  for (const line of (body ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    const inFence = fence !== null;
    if (marker) {
      if (!fence) fence = marker[1];
      else if (
        marker[1][0] === fence[0] &&
        marker[1].length >= fence.length &&
        marker[2].trim() === ''
      )
        fence = null;
    }
    const heading =
      !inFence && !marker && /^(#{1,2})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) evidence = heading[2] === 'Evidence dokončení';
    if (!evidence) {
      result.push(
        inFence || marker
          ? line
          : line.replace(/^(\s*[-*+]\s+)\[[ xX]\](?=\s)/, '$1[ ]').trimEnd(),
      );
    }
  }
  return result.join('\n').trim();
}
export const scopeHash = (issue) =>
  createHash('sha256')
    .update(JSON.stringify([issue.title, scopeBody(issue.body)]))
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
    .filter(
      (r) => r?.issue === issue.number && isRequirementsApprover(r.reviewer),
    );
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
  const lastGrant = grants.at(-1);
  if (lastGrant && lastGrant.scope !== scope) {
    const source = `scope:${scope}:after:${lastGrant.source}`;
    // Persist an observation barrier so a historical, unused QA approval
    // cannot silently approve an edited issue. Subsequent runs reuse it.
    requests.push(
      resets.find((r) => r.source === source) ?? {
        issue: issue.number,
        source,
        at: issue.updated_at ?? new Date().toISOString(),
      },
    );
  }
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
    // Standard QA reviews must never become implicit High scope approval.
    if (severityFor(pr) !== 'high') continue;
    // Self-authored PR reviews cannot grant independent scope approval.
    // Explicit issue commands remain available to both product owners.
    for (const r of reviews)
      if (
        isRequirementsApprover(r.user?.login) &&
        r.user.login.toLowerCase() !== pr.user.login.toLowerCase() &&
        r.state === 'APPROVED'
      ) {
        sources.push({
          source: `review:${pr.number}:${r.id}`,
          reviewer: r.user.login,
          submitted_at: r.submitted_at,
        });
      }
  }
  for (const c of comments)
    if (
      isRequirementsApprover(c.user?.login) &&
      /^\/requirements-approve\s*$/.test((c.body ?? '').trim())
    ) {
      sources.push({
        source: `comment:${c.id}:${date(c)}`,
        reviewer: c.user.login,
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
    ...fresh,
  };
  return {
    approval: wrap(grantRecord),
    grantRecord,
    resetRecord,
    version: scope + ':' + cycle,
  };
}
