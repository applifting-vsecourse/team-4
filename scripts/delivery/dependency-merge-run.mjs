import { eventScope } from '../automation/events.mjs';
import { reconcileAutoMerge } from './dependency-merge.mjs';
import { DEPENDABOT } from './dependency-update.mjs';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repo || !token)
  throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required');

async function request(path, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}
const graphql = async (query, variables) => {
  const result = await request('/graphql', { query, variables });
  if (result.errors) throw new Error(result.errors[0].message);
  return result.data;
};

async function openPulls() {
  const all = [];
  for (let page = 1; ; page++) {
    const batch = await request(
      `/repos/${repo}/pulls?state=open&per_page=100&page=${page}`,
    );
    all.push(...batch);
    if (batch.length < 100) return all;
  }
}

const scope = await eventScope();
const numbers =
  scope.type === 'pr'
    ? [scope.number]
    : scope.type === 'all'
      ? (await openPulls())
          .filter((pr) => pr.user?.login === DEPENDABOT)
          .map((pr) => pr.number)
      : [];
for (const number of numbers) {
  try {
    await reconcileAutoMerge({
      api: request,
      graphql,
      merge: (sha) =>
        request(
          `/repos/${repo}/pulls/${number}/merge`,
          { sha, merge_method: 'merge' },
          'PUT',
        ),
      repo,
      number,
      log: console.log,
    });
  } catch (error) {
    // Auto-merge may be refused (for example while the repository setting is
    // off); report it and keep going so one PR cannot starve the others.
    console.error(`#${number}: ${error.message}`);
    process.exitCode = 1;
  }
}
