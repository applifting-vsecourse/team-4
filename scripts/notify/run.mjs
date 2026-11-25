// QA notifier (#499). After CI on a PR's current commit it asks the tester
// and moves the linked issues on the board; after a merge it moves them to
// Done. It reads the PR through the API and never runs the PR's code.
//
//   EVENT=checks PR_NUMBER=… SHA=… CONCLUSION=success|failure|…
//   EVENT=ready  PR_NUMBER=…   (a draft became ready; reads verify itself)
//   EVENT=merged PR_NUMBER=…
import { readFileSync } from 'node:fs';
import { DONE, linkedIssues, mayMove, onChecks } from './qa.mjs';

const codeowners = readFileSync(
  new URL('../../.github/CODEOWNERS', import.meta.url),
  'utf8',
);

const cfg = {
  repo: process.env.GITHUB_REPOSITORY,
  token: process.env.GITHUB_TOKEN,
  projectToken: process.env.PROJECT_TOKEN,
  projectNumber: Number(process.env.PROJECT_NUMBER || 1),
  event: process.env.EVENT,
  pr: Number(process.env.PR_NUMBER),
  sha: process.env.SHA,
  conclusion: process.env.CONCLUSION,
};
for (const key of ['repo', 'token', 'event'])
  if (!cfg[key]) throw new Error(`Missing configuration: ${key}`);
if (!Number.isInteger(cfg.pr)) throw new Error('Missing configuration: pr');

async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok)
    throw new Error(
      `${method} ${path}: ${response.status} ${await response.text()}`,
    );
  return response.status === 204 ? null : response.json();
}

async function pages(path) {
  const all = [];
  for (let page = 1; ; page++) {
    const batch = await api(
      `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`,
    );
    all.push(...batch);
    if (batch.length < 100) return all;
  }
}

async function graphql(query, variables) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.projectToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await response.json();
  if (!response.ok || data.errors)
    throw new Error(`GraphQL: ${JSON.stringify(data.errors ?? data)}`);
  return data.data;
}

/** Moves an issue's item on the team board, unless a person moved it elsewhere. */
async function moveIssue(number, target) {
  if (!cfg.projectToken) {
    console.log(`No project token: #${number} stays where it is.`);
    return;
  }
  const [owner, name] = cfg.repo.split('/');
  const data = await graphql(
    `
      query ($owner: String!, $name: String!, $number: Int!) {
        repository(owner: $owner, name: $name) {
          issue(number: $number) {
            projectItems(first: 20) {
              nodes {
                id
                project {
                  id
                  number
                  field(name: "Status") {
                    ... on ProjectV2SingleSelectField {
                      id
                      options {
                        id
                        name
                      }
                    }
                  }
                }
                status: fieldValueByName(name: "Status") {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `,
    { owner, name, number },
  );
  const item = data.repository.issue?.projectItems.nodes.find(
    (node) => node.project.number === cfg.projectNumber,
  );
  if (!item) return;
  const current = item.status?.name ?? null;
  if (!mayMove(current, target)) {
    console.log(`#${number} stays in ${current ?? 'no status'}.`);
    return;
  }
  const option = item.project.field.options.find((o) => o.name === target);
  if (!option) throw new Error(`Board status "${target}" not found`);
  await graphql(
    `
      mutation ($project: ID!, $item: ID!, $field: ID!, $option: String!) {
        updateProjectV2ItemFieldValue(
          input: {
            projectId: $project
            itemId: $item
            fieldId: $field
            value: { singleSelectOptionId: $option }
          }
        ) {
          projectV2Item {
            id
          }
        }
      }
    `,
    {
      project: item.project.id,
      item: item.id,
      field: item.project.field.id,
      option: option.id,
    },
  );
  console.log(`#${number}: ${current} → ${target}`);
}

const pr = await api(`/repos/${cfg.repo}/pulls/${cfg.pr}`);
const links = linkedIssues(pr.body);

if (cfg.event === 'ready') {
  // CI does not run again when a draft becomes ready: use its latest verify.
  const runs = await api(
    `/repos/${cfg.repo}/commits/${pr.head.sha}/check-runs?check_name=verify&filter=latest`,
  );
  const verify = runs.check_runs.find((run) => run.app?.id === 15368);
  cfg.event = 'checks';
  cfg.sha = pr.head.sha;
  cfg.conclusion =
    verify?.status === 'completed' ? verify.conclusion : 'pending';
}

if (cfg.event === 'merged') {
  if (!pr.merged) {
    console.log(`#${cfg.pr} was closed without merging.`);
  } else {
    // Only issues the PR closes are done; a `Refs` issue stays open and put.
    for (const number of links.closes) await moveIssue(number, DONE);
  }
} else if (cfg.event === 'checks') {
  // A cancelled or skipped run (e.g. superseded by a newer push) says nothing.
  if (!['success', 'failure'].includes(cfg.conclusion)) {
    console.log(`#${cfg.pr}: CI ${cfg.conclusion}, nothing to do.`);
    process.exit(0);
  }
  const [files, reviews] = await Promise.all([
    pages(`/repos/${cfg.repo}/pulls/${cfg.pr}/files`),
    pages(`/repos/${cfg.repo}/pulls/${cfg.pr}/reviews`),
  ]);
  const decision = onChecks({
    pr,
    sha: cfg.sha,
    passed: cfg.conclusion === 'success',
    paths: files.map((file) => file.filename),
    reviews,
    codeowners,
  });
  console.log(`#${cfg.pr} at ${cfg.sha.slice(0, 7)}: ${decision.reason}`);
  if (decision.request)
    await api(`/repos/${cfg.repo}/pulls/${cfg.pr}/requested_reviewers`, {
      method: 'POST',
      body: { reviewers: [decision.request] },
    });
  if (decision.status)
    for (const number of [...links.closes, ...links.refs])
      await moveIssue(number, decision.status);
} else {
  throw new Error(`Unknown event: ${cfg.event}`);
}
