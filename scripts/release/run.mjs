import { latestVersion, nextVersion, releaseNotes } from './lib.mjs';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const sha = process.env.GITHUB_SHA;
const domain = process.env.COURSE_DOMAIN;
if (!repo || !token || !sha || !domain)
  throw new Error(
    'GITHUB_REPOSITORY, GITHUB_TOKEN, GITHUB_SHA and COURSE_DOMAIN are required',
  );
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
    query: `query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$number){closingIssuesReferences(first:100){nodes{number title}}}}}`,
    variables: {
      owner: repo.split('/')[0],
      repo: repo.split('/')[1],
      number: pr.number,
    },
  });
  if (response.errors) throw new Error('Cannot read closing issues');
  return response.data.repository.pullRequest.closingIssuesReferences.nodes;
}

const tags = await list(`/repos/${repo}/tags`);
// A re-run of the same push must not publish a second version.
const existing = tags.find((t) => t.commit.sha === sha);
if (existing) {
  console.log(`${sha} is already released as ${existing.name}`);
  process.exit(0);
}
const names = tags.map((t) => t.name);
const version = nextVersion(names);
const previous = latestVersion(names);
const pr = (await api(`/repos/${repo}/commits/${sha}/pulls`)).find(
  (p) => p.merged_at && p.base.ref === 'main',
);
const commit = await api(`/repos/${repo}/commits/${sha}`);
const generated = await api(`/repos/${repo}/releases/generate-notes`, 'POST', {
  tag_name: version,
  target_commitish: sha,
  ...(previous ? { previous_tag_name: previous } : {}),
});
const release = await api(`/repos/${repo}/releases`, 'POST', {
  tag_name: version,
  target_commitish: sha,
  name: pr ? `${version} · ${pr.title}` : version,
  body: releaseNotes({
    version,
    sha,
    pr,
    issues: pr ? await issuesFor(pr) : [],
    message: commit.commit.message,
    deployUrl: `https://github.com/${repo}/actions/workflows/deploy.yml`,
    stageUrl: `https://${repo.split('/')[1].toLowerCase()}.${domain}`,
    generated: generated.body,
  }),
  make_latest: 'true',
});
console.log(`Published ${release.html_url}`);
