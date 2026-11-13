import { severityFor } from './severity.mjs';

export const DEPENDABOT = 'dependabot[bot]';
export const DEPENDENCIES_LABEL = 'dependencies';

/**
 * A standard Dependabot version or security update. Only these PRs may be
 * delivered without a linked issue. The author is the Dependabot app, the PR
 * comes from a branch of this repository and targets main with `dependencies`
 * and Standard severity. High PRs always need the scope approval of an issue.
 */
export function isDependencyUpdate(pr, repo) {
  if (pr.user?.login !== DEPENDABOT || pr.user?.type !== 'Bot') return false;
  if (pr.base?.ref !== 'main') return false;
  if (repo && pr.head?.repo?.full_name !== repo) return false;
  if (!(pr.labels ?? []).some((l) => l.name === DEPENDENCIES_LABEL))
    return false;
  try {
    return severityFor(pr) === 'standard';
  } catch {
    return false;
  }
}

/**
 * Such a PR is its own delivery scope: a pull request is an issue number too,
 * so the evidence records that normally name an issue name the PR itself.
 */
export const dependencyScope = (pr, repo) => ({
  number: pr.number,
  repository: { nameWithOwner: repo },
});
