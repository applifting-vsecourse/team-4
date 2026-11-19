import { DEPENDABOT, isDependencyUpdate } from './dependency-update.mjs';

/** Every commit on the PR comes from Dependabot (nobody reviews these PRs). */
export const onlyDependabotCommits = (commits) =>
  commits.length > 0 && commits.every((c) => c.author?.login === DEPENDABOT);

const ENABLE = `mutation($id:ID!,$sha:GitObjectID!){enablePullRequestAutoMerge(input:{pullRequestId:$id,mergeMethod:MERGE,expectedHeadOid:$sha}){clientMutationId}}`;
const DISABLE = `mutation($id:ID!){disablePullRequestAutoMerge(input:{pullRequestId:$id}){clientMutationId}}`;

/**
 * Whether a PR may merge itself once CI passes. Besides the Dependabot
 * classification every commit must come from Dependabot: nobody reviews these
 * PRs, so a person pushing to the branch must not ride along on the merge.
 */
export function mergesAutomatically(pr, commits, repo) {
  return (
    pr.state === 'open' &&
    !pr.draft &&
    isDependencyUpdate(pr, repo) &&
    onlyDependabotCommits(commits)
  );
}

/**
 * Turn GitHub auto-merge on for an eligible Dependabot PR and off for one that
 * stopped being eligible. Auto-merge waits for the required checks (`verify`
 * and `Delivery stages`) on the current head, so a new commit has to pass
 * them again. Returns the action taken.
 */
export async function reconcileAutoMerge({
  api,
  graphql,
  merge,
  repo,
  number,
  log,
}) {
  const pr = await api(`/repos/${repo}/pulls/${number}`);
  // Auto-merge a person enabled on their own PR is theirs to manage.
  if (pr.user?.login !== DEPENDABOT) return 'skipped';
  const commits = await pullCommits(api, repo, number);
  const eligible = mergesAutomatically(pr, commits, repo);
  const enabled = Boolean(pr.auto_merge);
  if (eligible && !enabled) {
    try {
      await graphql(ENABLE, { id: pr.node_id, sha: pr.head.sha });
    } catch (error) {
      // Checks have already passed, so there is nothing to wait for: merge now.
      if (!merge || !/clean status/i.test(error.message)) throw error;
      await merge(pr.head.sha);
      log?.(`#${number}: merged (checks had already passed)`);
      return 'merged';
    }
    log?.(`#${number}: auto-merge enabled`);
    return 'enabled';
  }
  if (!eligible && enabled) {
    await graphql(DISABLE, { id: pr.node_id });
    log?.(`#${number}: auto-merge disabled`);
    return 'disabled';
  }
  return eligible ? 'unchanged' : 'skipped';
}

/** All commits of a PR, across pages. */
export async function pullCommits(api, repo, number) {
  const commits = [];
  for (let page = 1; ; page++) {
    const batch = await api(
      `/repos/${repo}/pulls/${number}/commits?per_page=100&page=${page}`,
    );
    commits.push(...batch);
    if (batch.length < 100) return commits;
  }
}
