import { evaluate } from './lib.mjs';
import { issueRequirements } from './requirements.mjs';
import { copilotWaiver } from './copilot-waiver.mjs';

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
  const issues = response.data.repository.pullRequest.closingIssuesReferences;
  if (issues.pageInfo.hasNextPage) throw new Error('Too many closing issues');
  if (issues.nodes.some((i) => i.repository.nameWithOwner !== repo))
    throw new Error('Cross-repository closing issues are not supported');
  return issues.nodes;
}

for (const pr of await list(`/repos/${repo}/pulls?state=open&base=main`)) {
  // Commit statuses do not become synthetic jobs in an unrelated Actions suite.
  // Start blocked so an API error cannot leave a previous passing verdict current.
  const publish = (state, description) =>
    api(`/repos/${repo}/statuses/${pr.head.sha}`, 'POST', {
      context: 'Delivery stages',
      state,
      description: description.slice(0, 140),
      target_url: runUrl,
    });
  await publish('pending', 'Checking requirements, agent review and QA');
  try {
    const issues = await issuesFor(pr);
    const reviews = await list(`/repos/${repo}/pulls/${pr.number}/reviews`);
    const comments = await list(`/repos/${repo}/issues/${pr.number}/comments`);
    for (const issue of issues) {
      const content = await api(`/repos/${repo}/issues/${issue.number}`);
      const scope = issueRequirements(
        content,
        await list(`/repos/${repo}/issues/${issue.number}/comments`),
        [{ pr, reviews }],
      );
      issue.requirements = scope.approval;
      issue.requirementsVersion = scope.version;
    }
    const result = evaluate({ pr, issues, reviews, comments });
    // Never report a pass on a head which moved while reading evidence.
    const current = await api(`/repos/${repo}/pulls/${pr.number}`);
    if (current.head.sha !== pr.head.sha || current.state !== 'open')
      throw new Error('PR changed during evaluation');
    const summary = result.pass
      ? copilotWaiver({ pr, comments })
        ? 'Requirements satisfied; Copilot review manually waived by darebakdavca; QA approved this commit after handoff.'
        : 'Requirements and agent review passed before QA approved this commit.'
      : result.reasons.join(' ');
    await publish(result.pass ? 'success' : 'failure', summary);
    console.log(
      `#${pr.number}: ${result.pass ? 'pass' : result.reasons.join(' ')}`,
    );
  } catch (error) {
    await publish('error', `Could not verify stages: ${error.message}`);
    console.error(`#${pr.number}: ${error.message}`);
    process.exitCode = 1;
  }
}
