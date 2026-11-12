// GitHub reads shared by the delivery and agent-review runners for the
// feature integration flow. `graphql(query, variables)` returns the raw
// response ({ data, errors }); anything truncated fails closed.

import { isParentPr, retargetedAt } from './feature.mjs';

// Labels, linked branches, parent and sub-issues of one issue, normalised for
// feature.mjs. Anything truncated fails closed instead of being guessed at.
export async function readIssueDetails({ graphql, repo, number }) {
  const page = 'pageInfo{hasNextPage}';
  const branches = `linkedBranches(first:50){nodes{ref{name repository{nameWithOwner}}} ${page}}`;
  const labels = `labels(first:50){nodes{name} ${page}}`;
  const response = await graphql(
    `query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){issue(number:$number){number state ${labels} ${branches} parent{number state repository{nameWithOwner} ${branches}} subIssues(first:50){nodes{number state stateReason ${labels}} ${page}}}}}`,
    { owner: repo.split('/')[0], repo: repo.split('/')[1], number },
  );
  const issue = response.data?.repository?.issue;
  if (response.errors || !issue)
    throw new Error(`Cannot read issue #${number} details`);
  const complete = (connection, what) => {
    if (connection.pageInfo.hasNextPage)
      throw new Error(`Issue #${number} has too many ${what}`);
    return connection.nodes;
  };
  // The Development section can link a same-named branch in another repository.
  const refs = (connection) =>
    complete(connection, 'linked branches')
      .filter((node) => node.ref?.repository?.nameWithOwner === repo)
      .map((node) => node.ref.name);
  const names = (connection) =>
    complete(connection, 'labels').map((label) => label.name);
  return {
    number: issue.number,
    state: issue.state,
    labels: names(issue.labels),
    branches: refs(issue.linkedBranches),
    // A parent in another repository cannot link one of our branches.
    parent: issue.parent && {
      number: issue.parent.number,
      state: issue.parent.state,
      branches:
        issue.parent.repository.nameWithOwner === repo
          ? refs(issue.parent.linkedBranches)
          : [],
    },
    subIssues: complete(issue.subIssues, 'sub-issues').map((sub) => ({
      number: sub.number,
      state: sub.state,
      stateReason: sub.stateReason,
      labels: names(sub.labels),
    })),
  };
}

/** Every page of a list endpoint; `get(path)` returns the parsed JSON. */
async function listAll(get, path) {
  const items = [];
  for (let page = 1; ; page++) {
    const batch = await get(
      `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`,
    );
    items.push(...batch);
    if (batch.length < 100) return items;
  }
}

// A parent branch with more merges than this is reviewed as a whole.
const MAX_MERGES = 250;

/**
 * Whether a parent PR's change was already reviewed piece by piece. Walking the
 * integration branch's first-parent history from the PR head down to `main`,
 * every commit must be GitHub's merge commit of a PR merged into the branch
 * (a merge whose second parent is the PR's final head, or a squash), and that
 * final head must have a passing bot verdict scoped to the parent issue or one
 * of its sub-issues. Then the branch holds only reviewed PR merges and the
 * parent PR's review carries over from them.
 *
 * A commit pushed directly, a rewritten branch pointing at an intermediate
 * commit, a rebase merge, a manual Copilot waiver or a fork head is never
 * covered: the whole parent PR is reviewed instead. `parent` is the parent
 * issue's details from `readIssueDetails`.
 *
 * Returns `{ covered, prs, missing }`: the merged PRs it relied on and the first
 * commit that is not such a merge.
 */
export async function integratedReview({ get, repo, pr, parent }) {
  if (!isParentPr(pr))
    return { covered: false, prs: [], missing: [pr.head.sha] };
  // Without the ruleset a direct push, force push or recreated branch could
  // slip unreviewed content under a reviewed merge.
  if (!(await protectedBranch(get, repo, pr.head.ref)))
    return {
      covered: false,
      prs: [],
      missing: [`${pr.head.ref} is not protected by the integration ruleset`],
    };
  const scopes = new Set([
    parent.number,
    ...parent.subIssues.map((sub) => sub.number),
  ]);
  const byMerge = new Map(
    (
      await listAll(
        get,
        `/repos/${repo}/pulls?state=closed&base=${encodeURIComponent(pr.head.ref)}`,
      )
    )
      .filter((other) => other.merged_at && other.base.ref === pr.head.ref)
      .map((other) => [other.merge_commit_sha, other]),
  );
  const prs = [];
  let sha = pr.head.sha;
  for (let step = 0; step < MAX_MERGES; step++) {
    // Reached the history the branch shares with main: everything above it
    // came through reviewed merges.
    const { status } = await get(
      `/repos/${repo}/compare/${sha}...${encodeURIComponent(pr.base.ref)}`,
    );
    if (status === 'identical' || status === 'ahead')
      return { covered: prs.length > 0, prs, missing: [] };
    const merged = byMerge.get(sha);
    const parents = merged
      ? (await get(`/repos/${repo}/commits/${sha}`)).parents.map((p) => p.sha)
      : [];
    const isMerge =
      Boolean(merged) &&
      ((parents.length === 2 && parents[1] === merged.head.sha) ||
        parents.length === 1);
    if (
      !merged ||
      !isMerge ||
      !agentPassForHead(
        await listAll(get, `/repos/${repo}/issues/${merged.number}/comments`),
        merged,
        scopes,
        retargetedAt(
          await listAll(get, `/repos/${repo}/issues/${merged.number}/timeline`),
        ),
      )
    )
      return { covered: false, prs, missing: [sha] };
    prs.push(merged.number);
    sha = parents[0];
  }
  return { covered: false, prs, missing: [sha] };
}

// Rules every integration branch needs before review can carry over. The
// endpoint lists the rules active for the branch from every ruleset.
export const INTEGRATION_RULES = [
  'deletion',
  'non_fast_forward',
  'pull_request',
  'required_status_checks',
];
export const INTEGRATION_CHECKS = ['child-verify', 'Delivery stages'];
/** Whether the integration ruleset's rules are in force on `branch`. */
export async function protectedBranch(get, repo, branch) {
  const rules = await listAll(
    get,
    `/repos/${repo}/rules/branches/${encodeURIComponent(branch)}`,
  );
  const contexts = rules
    .filter((rule) => rule.type === 'required_status_checks')
    .flatMap((rule) => rule.parameters?.required_status_checks ?? [])
    .filter((check) => check.integration_id === 15368)
    .map((check) => check.context);
  return (
    INTEGRATION_RULES.every((type) =>
      rules.some((rule) => rule.type === type),
    ) && INTEGRATION_CHECKS.every((context) => contexts.includes(context))
  );
}

// The latest bot verdict for a PR's head, under one of `scopes` and made after
// its last retarget (`since`), is a pass.
function agentPassForHead(comments, pr, scopes, since = 0) {
  const prefix = `<!-- agent-review pr=${pr.number} sha=${pr.head.sha} result=`;
  const verdict = comments
    .filter((c) => {
      if (c.user?.login !== 'github-actions[bot]') return false;
      if (!(Date.parse(c.created_at) > since)) return false;
      const [scope, marker] = (c.body ?? '').split('\n');
      const issue = /^<!-- agent-review-scope issue=(\d+) -->$/.exec(
        scope,
      )?.[1];
      return issue && scopes.has(Number(issue)) && marker?.startsWith(prefix);
    })
    .at(-1);
  return Boolean(verdict?.body.split('\n')[1].startsWith(prefix + 'pass '));
}

/** Whether the latest bot verdict for this PR's head under `issue`, made
 * after its last retarget at `since`, passed. */
export function headPassed(comments, pr, issue, since = 0) {
  return agentPassForHead(comments, pr, new Set([issue]), since);
}
