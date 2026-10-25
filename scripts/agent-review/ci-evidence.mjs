// Read summaries only: never execute PR code or include arbitrary CI log text.
export async function ciEvidence({ repo, pr, sha, get }) {
  const runs = [];
  for (let page = 1; ; page++) {
    const batch = await get(
      `/repos/${repo}/actions/runs?head_sha=${sha}&event=pull_request&per_page=100&page=${page}`,
    );
    runs.push(...batch.workflow_runs);
    if (batch.workflow_runs.length < 100) break;
  }
  const run = runs
    .filter(
      (r) =>
        r.head_sha === sha &&
        r.event === 'pull_request' &&
        r.path === '.github/workflows/ci.yml' &&
        r.repository?.full_name === repo &&
        r.pull_requests?.some((p) => p.number === pr),
    )
    .sort((a, b) => b.id - a.id)[0];
  if (!run) return { sha, status: 'unavailable', steps: [] };
  const steps = [];
  for (let page = 1; ; page++) {
    const batch = await get(
      `/repos/${repo}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100&page=${page}`,
    );
    for (const job of batch.jobs) {
      if (job.name !== 'verify' || job.head_sha !== sha) continue;
      for (const step of job.steps ?? [])
        if (
          [
            'Apply migrations to clean database',
            'Test database constraints',
            'Type-check frontend',
            'Test backend',
            'Test frontend',
            'Build backend',
            'Build frontend',
            'End-to-end tests',
            'Upload Playwright report',
          ].includes(step.name)
        )
          steps.push({
            name: step.name,
            status: step.status,
            conclusion: step.conclusion,
          });
    }
    if (batch.jobs.length < 100) break;
  }
  return {
    sha,
    run: run.html_url,
    attempt: run.run_attempt,
    status: run.status,
    conclusion: run.conclusion,
    steps,
  };
}
