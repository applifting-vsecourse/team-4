import { severityFor, sameSeverity, validateSeverity } from './severity.mjs';
import { eventScope } from '../automation/events.mjs';
import { evaluate, isStorybookPreview } from './lib.mjs';
import { issueRequirements, scopeHash } from './requirements.mjs';
import { copilotWaiver } from './copilot-waiver.mjs';
import { referencedIssueNumbers } from '../automation/issue-links.mjs';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const runUrl = process.env.GITHUB_RUN_ID
  ? `https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : undefined;
if (!repo || !token)
  throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required');
async function api(path, method = 'GET', body) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status}`);
  return response.json();
}
async function list(path) {
  const result = [];
  for (let page = 1; ; page++) {
    const batch = await api(
      `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`,
    );
    result.push(...batch);
    if (batch.length < 100) return result;
  }
}
async function issuesFor(pr) {
  const response = await api('/graphql', 'POST', {
    query: `query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$number){closingIssuesReferences(first:100){nodes{number repository{nameWithOwner}} pageInfo{hasNextPage}}}}}`,
    variables: {
      owner: repo.split('/')[0],
      repo: repo.split('/')[1],
      number: pr.number,
    },
  });
  if (response.errors) throw new Error('Cannot read closing issues');
  const linked = response.data.repository.pullRequest.closingIssuesReferences;
  if (linked.pageInfo.hasNextPage) throw new Error('Too many linked issues');
  const references = await Promise.all(
    referencedIssueNumbers(pr.body).map(async (number) => {
      const issue = await api(`/repos/${repo}/issues/${number}`);
      if (issue.pull_request)
        throw new Error(`#${number} refers to a pull request, not an issue`);
      return {
        number: issue.number,
        repository: { nameWithOwner: repo },
      };
    }),
  );
  const issues = [
    ...new Map(
      [...linked.nodes, ...references].map((issue) => [
        `${issue.repository.nameWithOwner}#${issue.number}`,
        issue,
      ]),
    ).values(),
  ];
  if (issues.some((i) => i.repository.nameWithOwner !== repo))
    throw new Error('Cross-repository issue links are not supported');
  return issues;
}

// GitHub requires both a status and a check run when they share a name.
// Reconcile only checks created by our previous publisher, never Actions jobs.
async function reconcileChecks(pr, conclusion, summary) {
  for (let page = 1; ; page++) {
    const { check_runs: checks } = await api(
      `/repos/${repo}/commits/${pr.head.sha}/check-runs?check_name=Delivery%20stages&filter=latest&per_page=100&page=${page}`,
    );
    for (const check of checks) {
      if (
        check.name !== 'Delivery stages' ||
        check.head_sha !== pr.head.sha ||
        check.app?.id !== 15368 ||
        check.external_id
      )
        continue;
      await api(`/repos/${repo}/check-runs/${check.id}`, 'PATCH', {
        status: 'completed',
        conclusion,
        details_url: runUrl,
        output: { title: 'Delivery stages', summary },
      });
    }
    if (checks.length < 100) return;
  }
}

const scope = await eventScope();
const onlyIssue = process.env.ONLY_ISSUE
  ? Number(process.env.ONLY_ISSUE)
  : null;
const candidates =
  scope.type === 'prs'
    ? await Promise.all(
        scope.numbers.map((number) => api(`/repos/${repo}/pulls/${number}`)),
      )
    : scope.type === 'pr'
      ? [await api(`/repos/${repo}/pulls/${scope.number}`)]
      : await list(`/repos/${repo}/pulls?state=open`);
for (let pr of candidates) {
  if (pr.state !== 'open') continue;
  // Commit statuses do not become synthetic jobs in an unrelated Actions suite.
  // Start blocked so an API error cannot leave a previous passing verdict current.
  const publish = (state, description) =>
    api(`/repos/${repo}/statuses/${pr.head.sha}`, 'POST', {
      context: 'Delivery stages',
      state,
      description: description.slice(0, 140),
      target_url: runUrl,
    });
  try {
    // The list-pulls endpoint returns summaries without changed_files.
    // Load the full PR before comparing the paginated file list with its count.
    if (!Number.isInteger(pr.changed_files))
      pr = await api(`/repos/${repo}/pulls/${pr.number}`);
    if (pr.state !== 'open') continue;
    let linkedIssues;
    if (scope.type === 'issue' || onlyIssue) {
      linkedIssues = await issuesFor(pr);
      if (!linkedIssues.some((i) => i.number === (onlyIssue ?? scope.number)))
        continue;
    }
    await publish('pending', 'Checking requirements, agent review and QA');
    if (pr.base.ref !== 'main') {
      await publish(
        'failure',
        `Waiting for prerequisite: targets ${pr.base.ref}; retarget to main.`,
      );
      console.log(`#${pr.number}: waiting for prerequisite (${pr.base.ref})`);
      continue;
    }
    const files = await list(`/repos/${repo}/pulls/${pr.number}/files`);
    if (files.length !== pr.changed_files)
      throw new Error('Incomplete changed-file coverage');
    validateSeverity(pr, files);
    const issues =
      severityFor(pr) === 'low' ? [] : (linkedIssues ?? (await issuesFor(pr)));
    const reviews =
      severityFor(pr) === 'low'
        ? []
        : await list(`/repos/${repo}/pulls/${pr.number}/reviews`);
    const comments =
      severityFor(pr) === 'low'
        ? []
        : await list(`/repos/${repo}/issues/${pr.number}/comments`);
    const scopes = new Map();
    for (const issue of issues) {
      const content = await api(`/repos/${repo}/issues/${issue.number}`);
      scopes.set(issue.number, scopeHash(content));
      const scope = issueRequirements(
        content,
        await list(`/repos/${repo}/issues/${issue.number}/comments`),
        [{ pr, reviews, comments }],
      );
      issue.requirements = scope.approval;
      issue.requirementsVersion = scope.version;
    }
    const result = evaluate({ pr, issues, reviews, comments });
    // Never report a pass on a head which moved while reading evidence.
    const current = await api(`/repos/${repo}/pulls/${pr.number}`);
    if (
      current.head.sha !== pr.head.sha ||
      current.state !== 'open' ||
      current.base.ref !== pr.base.ref ||
      current.draft !== pr.draft ||
      current.body !== pr.body ||
      !sameSeverity(current, pr)
    )
      throw new Error('PR changed during evaluation');
    const summary = result.pass
      ? severityFor(pr) === 'low'
        ? 'Low severity: issue linkage, requirements, code review and QA are not required; CI remains required.'
        : isStorybookPreview(pr)
          ? 'Storybook design preview: CI, independent review and current PM approval passed; separate QA is skipped.'
          : copilotWaiver({ pr, comments })
            ? 'Requirements satisfied; Copilot review manually waived by darebakdavca; QA approved this commit after handoff.'
            : `${severityFor(pr) === 'standard' ? 'Standard: requirements approval skipped' : 'High: requirements approved'}; agent review passed before QA approved this commit.`
      : result.reasons.join(' ');
    for (const issue of issues) {
      if (
        scopeHash(await api(`/repos/${repo}/issues/${issue.number}`)) !==
        scopes.get(issue.number)
      )
        throw new Error('Issue scope changed during evaluation');
    }
    await reconcileChecks(pr, result.pass ? 'success' : 'failure', summary);
    await publish(result.pass ? 'success' : 'failure', summary);
    console.log(
      `#${pr.number}: ${result.pass ? 'pass' : result.reasons.join(' ')}`,
    );
  } catch (error) {
    process.exitCode = 1;
    const summary = `Could not verify stages: ${error.message}`;
    console.error(`#${pr.number}: ${summary}`);
    // Attempt both blocking reports even if one API is unavailable.
    for (const report of [
      () => publish('error', summary),
      () => reconcileChecks(pr, 'failure', summary),
    ]) {
      try {
        await report();
      } catch (reportError) {
        console.error(
          `#${pr.number}: Could not report failure: ${reportError.message}`,
        );
      }
    }
  }
}
