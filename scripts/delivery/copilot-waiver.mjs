import { createHash } from 'node:crypto';

// Deliberately independent of requirements/QA roles: only David may waive.
export const COPILOT_WAIVER_OWNER = 'darebakdavca';
const OBSERVED = '<!-- copilot-waiver-observed ';
const order = (a, b) =>
  Date.parse(a.at) - Date.parse(b.at) || a.commentId - b.commentId;

/** Comments must come from this PR's GitHub comments endpoint, not issue text. */
export function copilotWaiver({ pr, comments }) {
  // Keep a high-water mark for processed commands. Deleting the newest native
  // comment must not resurrect an older authorization for the same commit.
  const observed = comments
    .flatMap((comment) => {
      if (comment.user?.login !== 'github-actions[bot]') return [];
      const line = (comment.body ?? '').split('\n')[0];
      if (!line.startsWith(OBSERVED) || !line.endsWith(' -->')) return [];
      try {
        const record = JSON.parse(line.slice(OBSERVED.length, -4));
        return record.pr === pr.number &&
          record.sha === pr.head.sha &&
          Number.isSafeInteger(record.commentId) &&
          record.commentId > 0 &&
          Number.isFinite(Date.parse(record.at)) &&
          /^[a-f0-9]{64}$/.test(record.source)
          ? [record]
          : [];
      } catch {
        return [];
      }
    })
    .sort(order)
    .at(-1);

  const commands = comments
    .flatMap((comment) => {
      if (
        !pr.issue_url ||
        comment.issue_url !== pr.issue_url ||
        comment.user?.type !== 'User' ||
        comment.user.login.toLowerCase() !== COPILOT_WAIVER_OWNER ||
        !Number.isSafeInteger(comment.id) ||
        comment.id <= 0
      )
        return [];
      const body = (comment.body ?? '').trim();
      // An invalid edit of the observed command, or a newer attempted command,
      // blocks fallback too; unrelated owner comments do not grant or revoke.
      if (
        !/^\/copilot-waive\b/.test(body) &&
        comment.id !== observed?.commentId
      )
        return [];
      const at = comment.updated_at ?? comment.created_at;
      if (!Number.isFinite(Date.parse(at))) return [];
      return [{ comment, at, commentId: comment.id }];
    })
    .sort(order);
  const latest = commands.at(-1);
  if (!latest || (observed && order(latest, observed) < 0)) return null;
  const match = /^\/copilot-waive ([a-f0-9]{40}) ([^\r\n]+)$/.exec(
    (latest.comment.body ?? '').trim(),
  );
  if (!match || match[1] !== pr.head.sha || !match[2].trim()) return null;
  const source = createHash('sha256')
    .update(
      JSON.stringify([
        pr.number,
        latest.commentId,
        latest.at,
        latest.comment.body,
      ]),
    )
    .digest('hex');
  // Same native version must still have the body observed when it was used.
  if (observed && order(latest, observed) === 0 && source !== observed.source)
    return null;
  return {
    source,
    at: latest.at,
    reason: match[2].trim(),
    commentId: latest.commentId,
    url: latest.comment.html_url,
  };
}

export function waiverObservation(pr, waiver) {
  return `${OBSERVED}${JSON.stringify({ pr: pr.number, sha: pr.head.sha, commentId: waiver.commentId, at: waiver.at, source: waiver.source })} -->`;
}

export function waiverMarker(waiver) {
  return `<!-- copilot-waiver source=${waiver.source} -->`;
}
