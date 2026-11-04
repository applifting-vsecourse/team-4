function addByNumber(map, item) {
  if (!Number.isInteger(item?.number)) return;
  const repository = item.repository?.nameWithOwner;
  if (!repository) return;
  map.set(`${repository}#${item.number}`, {
    number: item.number,
    state: item.state,
    repository: { nameWithOwner: repository },
  });
}

/** Explicit non-closing issue links in a PR body, excluding quoted examples. */
export function referencedIssueNumbers(body = '') {
  const prose = (body ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/`[^`]*`/g, '')
    .split('\n')
    .filter((line) => !/^\s*>/.test(line))
    .join('\n');
  const numbers = new Set();
  for (const match of prose.matchAll(
    /\b(?:refs?|references?)\s+#(\d+)((?:\s*(?:,|and|&)\s*#\d+)*)/gi,
  )) {
    numbers.add(Number(match[1]));
    for (const reference of match[2].matchAll(/#(\d+)/g))
      numbers.add(Number(reference[1]));
  }
  return [...numbers];
}

/** Pull requests with a native closing link or an explicit reference in their body. */
export function pullRequestsLinkedToIssue(issue) {
  const prs = new Map();
  for (const pr of issue.closedByPullRequestsReferences?.nodes ?? [])
    addByNumber(prs, pr);

  for (const event of issue.timelineItems?.nodes ?? []) {
    const source = event?.source;
    const target = event?.target;
    if (
      event?.__typename !== 'CrossReferencedEvent' ||
      source?.__typename !== 'PullRequest' ||
      target?.__typename !== 'Issue' ||
      target.number !== issue.number ||
      (issue.repository?.nameWithOwner &&
        target.repository?.nameWithOwner !== issue.repository.nameWithOwner) ||
      !referencedIssueNumbers(source.body).includes(issue.number)
    )
      continue;
    addByNumber(prs, source);
  }

  const repository = issue.repository?.nameWithOwner;
  return [...prs.values()].filter(
    (pr) => !repository || pr.repository.nameWithOwner === repository,
  );
}
