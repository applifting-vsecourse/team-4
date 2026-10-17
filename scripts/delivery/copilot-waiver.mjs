import { createHash } from 'node:crypto';

// Deliberately independent of requirements/QA roles: only David may waive.
export const COPILOT_WAIVER_OWNER = 'darebakdavca';

/** Comments must come from this PR's GitHub comments endpoint, not issue text. */
export function copilotWaiver({ pr, comments }) {
  const valid = comments.flatMap((comment) => {
    if (
      !pr.issue_url ||
      comment.issue_url !== pr.issue_url ||
      comment.user?.type !== 'User' ||
      comment.user.login.toLowerCase() !== COPILOT_WAIVER_OWNER ||
      !Number.isSafeInteger(comment.id) ||
      comment.id <= 0
    )
      return [];
    // Only a standalone, single-line command with a full SHA and a reason.
    const match = /^\/copilot-waive ([a-f0-9]{40}) ([^\r\n]+)$/.exec(
      (comment.body ?? '').trim(),
    );
    const at = comment.updated_at ?? comment.created_at;
    if (
      !match ||
      match[1] !== pr.head.sha ||
      !match[2].trim() ||
      !Number.isFinite(Date.parse(at))
    )
      return [];
    return [
      {
        source: createHash('sha256')
          .update(JSON.stringify([pr.number, comment.id, at, comment.body]))
          .digest('hex'),
        at,
        reason: match[2].trim(),
        commentId: comment.id,
        url: comment.html_url,
      },
    ];
  });
  return (
    valid
      .sort(
        (a, b) =>
          Date.parse(a.at) - Date.parse(b.at) || a.commentId - b.commentId,
      )
      .at(-1) ?? null
  );
}

export function waiverMarker(waiver) {
  return `<!-- copilot-waiver source=${waiver.source} -->`;
}
