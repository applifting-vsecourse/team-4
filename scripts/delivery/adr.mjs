import { PM, TECHNICAL_REVIEWER } from './lib.mjs';

// The tech lead or the PM accepts architecture decisions (docs/adr/README.md).
export const ADR_ACCEPTORS = [TECHNICAL_REVIEWER, PM];
const acceptors = ADR_ACCEPTORS.map((login) => `@${login}`).join(' or ');
export const ADR_DIR = 'docs/adr';
const ADR_FILE = /^docs\/adr\/(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const NOT_RECORDS = ['docs/adr/README.md', 'docs/adr/template.md'];
const COMMAND = /^\/adr-accept((?:\s+\d{4})+)$/;
const MERGEABLE = ['Accepted', 'Superseded', 'Deprecated'];

export const adrNumber = (path) => ADR_FILE.exec(path)?.[1] ?? null;

/** The first word of the template's `- **Status:** …` line, or null. */
export function adrStatus(text) {
  return /^- \*\*Status:\*\* *([A-Za-z]+)/m.exec(text ?? '')?.[1] ?? null;
}

/**
 * Paths a PR adds or changes under docs/adr/ (in any letter case), other than
 * the README and the template. Removing a file gates nothing; a rename gates
 * its new path.
 */
export function changedAdrs(files) {
  return files
    .filter(
      (file) =>
        file.status !== 'removed' &&
        file.filename.toLowerCase().startsWith(`${ADR_DIR}/`) &&
        !NOT_RECORDS.includes(file.filename),
    )
    .map((file) => file.filename);
}

/**
 * ADR numbers accepted by an acceptor's Comment reviews. A review, unlike an
 * issue comment, records the commit it was made on, so the accepted text is
 * known exactly.
 */
function acceptances(reviews) {
  return reviews.flatMap((review) => {
    if (
      review.state !== 'COMMENTED' ||
      !ADR_ACCEPTORS.some(
        (login) => login.toLowerCase() === review.user?.login?.toLowerCase(),
      ) ||
      !/^[a-f0-9]{40}$/.test(review.commit_id ?? '')
    )
      return [];
    const match = COMMAND.exec((review.body ?? '').trim());
    if (!match) return [];
    return match[1]
      .trim()
      .split(/\s+/)
      .map((number) => ({ number, commit: review.commit_id }));
  });
}

/**
 * Why the PR's changed ADRs block it. Every changed file under docs/adr/ must
 * be a regular, correctly named record with a number no other record uses,
 * reach the base with a final status, and have text an acceptor accepted: its
 * blob at an accepting review's commit must equal its blob at the PR head.
 * `list(ref)` resolves to the entries of docs/adr/ at a commit or branch as
 * `[{ path, sha, type }]` (empty when absent); `text(blob)` to a blob's text.
 */
export async function adrReasons({ pr, files, reviews, list, text }) {
  const changed = changedAdrs(files);
  if (!changed.length) return [];
  const listings = new Map();
  const entries = (ref) => {
    if (!listings.has(ref)) listings.set(ref, list(ref));
    return listings.get(ref);
  };
  const removed = new Set(
    files.flatMap((file) =>
      file.status === 'removed'
        ? [file.filename]
        : file.status === 'renamed'
          ? [file.previous_filename]
          : [],
    ),
  );
  const head = await entries(pr.head.sha);
  // Records the merge would contain: the PR head and anything added to the
  // base since, unless this PR removes it.
  const records = [...head, ...(await entries(pr.base.ref))].filter(
    (entry) => adrNumber(entry.path) && !removed.has(entry.path),
  );
  const accepted = acceptances(reviews);
  const reasons = [];
  for (const path of changed) {
    const number = adrNumber(path);
    if (!number) {
      reasons.push(
        `${path} is not a valid ADR path; name records docs/adr/NNNN-short-title.md.`,
      );
      continue;
    }
    const entry = head.find((e) => e.path === path);
    if (!entry) throw new Error(`Cannot find ${path} at the PR head`);
    if (entry.type !== 'file') {
      reasons.push(
        `ADR-${number} must be a regular file, not a ${entry.type}.`,
      );
      continue;
    }
    if (records.some((e) => adrNumber(e.path) === number && e.path !== path)) {
      reasons.push(
        `ADR number ${number} is already used by another record; renumber ${path}.`,
      );
      continue;
    }
    const status = adrStatus(await text(entry.sha));
    if (status === 'Proposed') {
      reasons.push(
        `ADR-${number} is still Proposed; set its final status before ${acceptors} accepts it.`,
      );
      continue;
    }
    if (!MERGEABLE.includes(status)) {
      reasons.push(
        `ADR-${number} needs a status line with ${MERGEABLE.join(', ')} or Proposed.`,
      );
      continue;
    }
    let ok = false;
    for (const { commit } of accepted.filter((a) => a.number === number)) {
      const then = (await entries(commit)).find((e) => e.path === path);
      if (then?.type === 'file' && then.sha === entry.sha) {
        ok = true;
        break;
      }
    }
    if (!ok)
      reasons.push(
        `ADR-${number} needs a Comment review "/adr-accept ${number}" by ${acceptors} on its current text.`,
      );
  }
  return reasons;
}
