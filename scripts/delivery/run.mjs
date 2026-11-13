import { severityFor, sameSeverity, validateSeverity } from './severity.mjs';
import { eventScope } from '../automation/events.mjs';
import {
  evaluate,
  isStorybookPreview,
  latestReview,
  reviewersFor,
  technicalReviewRequired,
} from './lib.mjs';
import {
  buildStacks,
  outOfSync,
  outOfSyncNote,
  resumableBase,
} from './stack.mjs';
import { issueRequirements, scopeHash } from './requirements.mjs';
import { isDependencyUpdate } from './dependency-update.mjs';
import { onlyDependabotCommits, pullCommits } from './dependency-merge.mjs';
import { copilotWaiver } from './copilot-waiver.mjs';
import { referencedIssueNumbers } from '../automation/issue-links.mjs';
import {
  childVerify,
  integrationRole,
  integrationStages,
  fromIntegrationBranch,
  isIntegrationBranch,
  isParentPr,
  parentReasons,
  retargetedAt,
} from './feature.mjs';
import { protectedBranch, readIssueDetails } from './feature-github.mjs';

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
    referencedIssueNumbers(pr.body, { stacked: pr.base.ref !== 'main' }).map(
      async (number) => {
        const issue = await api(`/repos/${repo}/issues/${number}`);
        if (issue.pull_request)
          throw new Error(`#${number} refers to a pull request, not an issue`);
        return {
          number: issue.number,
          repository: { nameWithOwner: repo },
        };
      },
    ),
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

const issueDetails = (number) =>
  readIssueDetails({
    repo,
    number,
    graphql: (query, variables) =>
      api('/graphql', 'POST', { query, variables }),
  });

// Job results of the latest CI run made for this PR into its current base;
// null before CI started. A run for another PR from the same branch, or from
// before a retarget, tested a different merge and does not count. A run's
// pull_requests show the PR's current base, so the retarget time decides.
async function ciJobs(pr, retargeted) {
  const runs = [];
  for (let page = 1; ; page++) {
    const batch = await api(
      `/repos/${repo}/actions/runs?head_sha=${pr.head.sha}&event=pull_request&per_page=100&page=${page}`,
    );
    runs.push(...batch.workflow_runs);
    if (batch.workflow_runs.length < 100) break;
  }
  const run = runs
    .filter(
      (r) =>
        r.head_sha === pr.head.sha &&
        r.path === '.github/workflows/ci.yml' &&
        r.repository?.full_name === repo &&
        r.head_repository?.full_name === pr.head.repo?.full_name &&
        r.head_branch === pr.head.ref &&
        r.pull_requests?.some(
          (p) => p.number === pr.number && p.base?.ref === pr.base.ref,
        ) &&
        Date.parse(r.created_at) > retargeted,
    )
    .sort((a, b) => b.id - a.id)[0];
  if (!run) return null;
  // The latest attempt of every job, so re-running only failed jobs keeps the
  // lanes which passed before.
  const jobs = [];
  for (let page = 1; ; page++) {
    const batch = await api(
      `/repos/${repo}/actions/runs/${run.id}/jobs?filter=latest&per_page=100&page=${page}`,
    );
    jobs.push(...batch.jobs);
    if (batch.jobs.length < 100) break;
  }
  return jobs
    .filter((job) => job.head_sha === pr.head.sha)
    .map(({ name, status, conclusion }) => ({ name, status, conclusion }));
}

// Other open PRs whose head is this PR's head commit or branch. Statuses
// belong to the commit, so a lenient integration-branch pass would also count
// for them, for instance for a PR into main.
async function sharedHead(pr) {
  const owner = repo.split('/')[0];
  const others = [
    ...(await list(`/repos/${repo}/commits/${pr.head.sha}/pulls`)),
    ...(await list(
      `/repos/${repo}/pulls?state=open&head=${encodeURIComponent(`${owner}:${pr.head.ref}`)}`,
    )),
  ].filter(
    (other) =>
      other.number !== pr.number &&
      other.state === 'open' &&
      (other.head.sha === pr.head.sha || other.head.ref === pr.head.ref),
  );
  return [...new Map(others.map((other) => [other.number, other])).values()];
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

// Find the stack around a PR with targeted lookups (the PR below it, the PRs
// on top of it), so a PR event never scans every open PR.
async function stackNeighborhood(pr) {
  const owner = repo.split('/')[0];
  const nodes = new Map([[pr.number, pr]]);
  const open = (query) => list(`/repos/${repo}/pulls?state=open&${query}`);
  const others = (found, from) =>
    found.filter((p) => p.number !== from.number && !nodes.has(p.number));
  let below = pr;
  while (below.base.ref !== 'main') {
    const [parent] = others(
      await open(`head=${encodeURIComponent(`${owner}:${below.base.ref}`)}`),
      below,
    );
    if (!parent) break;
    nodes.set(parent.number, parent);
    below = parent;
  }
  const queue = [...nodes.values()];
  while (queue.length) {
    const from = queue.shift();
    for (const child of others(
      await open(`base=${encodeURIComponent(from.head.ref)}`),
      from,
    )) {
      nodes.set(child.number, child);
      queue.push(child);
    }
  }
  return [...nodes.values()];
}
const compareStatus = async (base, head) =>
  (await api(`/repos/${repo}/compare/${base}...${head}`)).status;
const baseMerged = (bottom) =>
  resumableBase({ list, compare: compareStatus, repo, bottom });

const scope = await eventScope();
const onlyIssue = process.env.ONLY_ISSUE
  ? Number(process.env.ONLY_ISSUE)
  : null;
const eventPrs =
  scope.type === 'prs'
    ? scope.numbers
    : scope.type === 'pr'
      ? [scope.number]
      : null;
const neighborhoods = eventPrs
  ? await Promise.all(
      eventPrs.map(async (number) =>
        stackNeighborhood(await api(`/repos/${repo}/pulls/${number}`)),
      ),
    )
  : [await list(`/repos/${repo}/pulls?state=open`)];
const candidates = [
  ...new Map(neighborhoods.flat().map((pr) => [pr.number, pr])).values(),
];
const stackByPr = new Map();
for (const stack of buildStacks(candidates).stacks)
  for (const pr of stack.prs) stackByPr.set(pr.number, stack);
for (let pr of candidates) {
  if (pr.state !== 'open') continue;
  // Commit statuses do not become synthetic jobs in an unrelated Actions suite.
  // Start blocked so an API error cannot leave a previous passing verdict current.
  const status = (context) => (state, description) =>
    api(`/repos/${repo}/statuses/${pr.head.sha}`, 'POST', {
      context,
      state,
      description: description.slice(0, 140),
      target_url: runUrl,
    });
  const publish = status('Delivery stages');
  // child-verify is published only on PRs into an integration branch, where
  // the integration branch ruleset requires it: a missing status blocks.
  const publishChild = status('child-verify');
  const intoIntegration = isIntegrationBranch(pr.base.ref);
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
    if (intoIntegration) {
      await publishChild('pending', 'Checking the required CI lanes');
      const linked = linkedIssues ?? (await issuesFor(pr));
      const details = () =>
        Promise.all(linked.map((issue) => issueDetails(issue.number)));
      const issues = await details();
      const role = integrationRole({ pr, issues });
      const files = await list(`/repos/${repo}/pulls/${pr.number}/files`);
      if (files.length !== pr.changed_files)
        throw new Error('Incomplete changed-file coverage');
      // The label still classifies the change; its gates apply to the parent PR.
      validateSeverity(pr, files);
      const comments = await list(
        `/repos/${repo}/issues/${pr.number}/comments`,
      );
      const since = retargetedAt(
        await list(`/repos/${repo}/issues/${pr.number}/timeline`),
      );
      const verify = childVerify({ role, jobs: await ciJobs(pr, since) });
      const reasons = integrationStages({
        pr,
        role,
        files,
        comments,
        waiver: copilotWaiver({ pr, comments }),
        sharedHead: await sharedHead(pr),
        since,
        protectedBase: await protectedBranch(
          (path) => api(path),
          repo,
          pr.base.ref,
        ),
      });
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
      const numbers = (found) => found.map((issue) => issue.number).join();
      if (
        numbers(await issuesFor(current)) !== numbers(linked) ||
        JSON.stringify(await details()) !== JSON.stringify(issues)
      )
        throw new Error('Linked issue changed during evaluation');
      const summary = reasons.length
        ? reasons.join(' ')
        : `${role.kind === 'child' ? `Child of #${role.parent}` : `Integration work for #${role.parent}`}: agent review passed; requirements, QA and human review happen on the parent PR.`;
      await publishChild(verify.state, verify.description);
      await reconcileChecks(
        pr,
        reasons.length ? 'failure' : 'success',
        summary,
      );
      await publish(reasons.length ? 'failure' : 'success', summary);
      // A PR opened on the same head while this ran would inherit the pass.
      const late = reasons.length ? [] : await sharedHead(pr);
      if (late.length) {
        const note = integrationStages({
          pr,
          role,
          files,
          comments,
          waiver: true,
          sharedHead: late,
        }).join(' ');
        await reconcileChecks(pr, 'failure', note);
        await publish('failure', note);
        console.log(`#${pr.number}: ${note}`);
        continue;
      }
      console.log(
        `#${pr.number}: child-verify ${verify.state}; ${reasons.length ? reasons.join(' ') : 'pass'}`,
      );
      continue;
    }
    // An integration branch reaches main only through its parent PR, which
    // waits for the integration work; a detour through another branch would not.
    if (fromIntegrationBranch(pr) && pr.base.ref !== 'main') {
      const note = `A PR from ${pr.head.ref} must target main as the parent PR.`;
      await publish('failure', note);
      console.log(`#${pr.number}: ${note}`);
      continue;
    }
    // A stack is judged as one unit: QA of the tip commit covers every PR the
    // tip contains. Anything that is not a plain chain onto main keeps waiting.
    const stack = stackByPr.get(pr.number);
    const stacked = stack && stack.prs.length > 1;
    // After the PR below has merged, the rest of a stack still targets its
    // branch until it is retargeted to main: that is a stack waiting its turn,
    // not a PR with a missing prerequisite.
    const bottomBase = stack?.bottom.base.ref;
    const resuming =
      stack && bottomBase !== 'main' && (await baseMerged(stack.bottom));
    if (
      pr.base.ref !== 'main' &&
      (!stack || (bottomBase !== 'main' && !resuming))
    ) {
      await publish(
        'failure',
        `Waiting for prerequisite: targets ${pr.base.ref}; retarget to main.`,
      );
      console.log(`#${pr.number}: waiting for prerequisite (${pr.base.ref})`);
      continue;
    }
    let qaFrom;
    if (stacked) {
      const index = stack.prs.findIndex((p) => p.number === pr.number);
      // This PR must contain its parent, and the tip must contain this PR.
      const behind = (await outOfSync(stack, compareStatus)).filter(
        (link) => stack.prs.indexOf(link.pr) >= index,
      );
      if (behind.length) {
        const note = outOfSyncNote(behind[0]);
        await publish('failure', note);
        console.log(`#${pr.number}: ${note}`);
        continue;
      }
      const tip = stack.tip;
      // A Low tip gets no QA, so it could never cover the PRs below it.
      if (severityFor(tip) === 'low' && severityFor(pr) !== 'low') {
        const note = `Stack tip #${tip.number} is Low severity and gets no QA, so it cannot cover #${pr.number}; put a Standard or High PR on top of the stack.`;
        await publish('failure', note);
        console.log(`#${pr.number}: ${note}`);
        continue;
      }
      if (tip.number !== pr.number) {
        const tipReviews = await list(
          `/repos/${repo}/pulls/${tip.number}/reviews`,
        );
        // The QA owner is whoever the bot asked on the tip, not on this PR.
        const owner = reviewersFor(tip.user.login).qa;
        qaFrom = {
          review: latestReview(tipReviews, owner),
          sha: tip.head.sha,
          number: tip.number,
          owner,
        };
      }
    }
    const files = await list(`/repos/${repo}/pulls/${pr.number}/files`);
    if (files.length !== pr.changed_files)
      throw new Error('Incomplete changed-file coverage');
    validateSeverity(pr, files);
    // A standard Dependabot update needs no issue, agent review, human review
    // or QA: CI (`verify`) is the gate and auto-merge does the rest.
    // A person's commit on the branch takes the PR back to the normal gates.
    if (
      isDependencyUpdate(pr, repo) &&
      onlyDependabotCommits(await pullCommits(api, repo, pr.number))
    ) {
      const current = await api(`/repos/${repo}/pulls/${pr.number}`);
      if (
        current.head.sha !== pr.head.sha ||
        current.state !== 'open' ||
        current.draft !== pr.draft ||
        !isDependencyUpdate(current, repo)
      )
        throw new Error('PR changed during evaluation');
      const summary = pr.draft
        ? 'PR is still a draft.'
        : 'Dependency update: CI is the only gate; no review, approval or QA is required.';
      await reconcileChecks(pr, pr.draft ? 'failure' : 'success', summary);
      await publish(pr.draft ? 'failure' : 'success', summary);
      console.log(`#${pr.number}: ${summary}`);
      continue;
    }
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
    pr.technicalReviewRequired = technicalReviewRequired(
      pr,
      technicalReviewRequired(pr)
        ? []
        : await list(`/repos/${repo}/issues/${pr.number}/timeline`),
    );
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
    const result = evaluate({ pr, issues, reviews, comments, qaFrom });
    // A parent PR is eligible only once its integration work is finished.
    const parentState = async () =>
      JSON.stringify({
        issues: await Promise.all(
          issues.map((issue) => issueDetails(issue.number)),
        ),
        openInto: (
          await list(
            `/repos/${repo}/pulls?state=open&base=${encodeURIComponent(pr.head.ref)}`,
          )
        ).map((other) => other.number),
      });
    const parent = isParentPr(pr) ? await parentState() : null;
    if (parent) {
      const { issues: details, openInto } = JSON.parse(parent);
      const blocked = parentReasons({
        pr,
        issues: details,
        openInto: openInto.map((number) => ({ number })),
      });
      if (blocked.length) {
        result.pass = false;
        // First, so the 140-character status shows what blocks the feature.
        result.reasons.unshift(...blocked);
      }
    }
    // Never report a pass on a head which moved while reading evidence.
    const current = await api(`/repos/${repo}/pulls/${pr.number}`);
    current.technicalReviewRequired = technicalReviewRequired(
      current,
      technicalReviewRequired(current)
        ? []
        : await list(`/repos/${repo}/issues/${pr.number}/timeline`),
    );
    if (
      current.head.sha !== pr.head.sha ||
      current.state !== 'open' ||
      current.base.ref !== pr.base.ref ||
      current.draft !== pr.draft ||
      current.body !== pr.body ||
      !sameSeverity(current, pr) ||
      current.technicalReviewRequired !== pr.technicalReviewRequired
    )
      throw new Error('PR changed during evaluation');
    if (parent && (await parentState()) !== parent)
      throw new Error(
        'Parent issue or its integration PRs changed during evaluation',
      );
    if (
      qaFrom &&
      (await api(`/repos/${repo}/pulls/${qaFrom.number}`)).head.sha !==
        qaFrom.sha
    )
      throw new Error('Stack tip changed during evaluation');
    const summary = result.pass
      ? severityFor(pr) === 'low'
        ? 'Low severity: issue linkage, requirements, code review and QA are not required; CI remains required.'
        : isStorybookPreview(pr)
          ? 'Storybook design preview: CI, independent review and current PM approval passed; separate QA is skipped.'
          : qaFrom
            ? `Requirements and agent review passed; QA approved stack tip #${qaFrom.number}, which contains this PR.`
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
      ...(intoIntegration ? [() => publishChild('error', summary)] : []),
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
