import { readFile } from 'node:fs/promises';
import { pullRequestsLinkedToIssue } from './issue-links.mjs';

export { pullRequestsLinkedToIssue };

// Event payloads select work; all authorization still comes from live GitHub data.
export async function eventScope(env = process.env) {
  if (
    !env.GITHUB_EVENT_NAME ||
    ['schedule', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)
  )
    return { type: 'all' };
  const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8'));
  if (
    ['pull_request_target', 'pull_request_review'].includes(
      env.GITHUB_EVENT_NAME,
    )
  )
    return { type: 'pr', number: event.pull_request.number };
  if (env.GITHUB_EVENT_NAME === 'issue_comment')
    return {
      type: event.issue.pull_request ? 'pr' : 'issue',
      number: event.issue.number,
    };
  if (env.GITHUB_EVENT_NAME === 'workflow_run')
    return {
      type: 'prs',
      numbers:
        event.workflow_run.event === 'pull_request'
          ? (event.workflow_run.pull_requests ?? []).map((pr) => pr.number)
          : [],
    };
  if (env.GITHUB_EVENT_NAME === 'issues')
    return { type: 'issue', number: event.issue.number };
  throw new Error(`Unsupported delivery event: ${env.GITHUB_EVENT_NAME}`);
}

export function includesIssue(scope, issue) {
  const linkedPullRequests = pullRequestsLinkedToIssue(issue);
  return (
    scope.type === 'all' ||
    (scope.type === 'issue' && scope.number === issue.number) ||
    (scope.type === 'prs' &&
      linkedPullRequests.some((p) => scope.numbers.includes(p.number))) ||
    (scope.type === 'pr' &&
      linkedPullRequests.some((p) => p.number === scope.number))
  );
}
