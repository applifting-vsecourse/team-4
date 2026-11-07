// In-memory GitHub repository holding a stack, shared by the stack-merge tests.

export const sha = (n) => String(n).padStart(40, '0');

// An in-memory repo: PRs 1..n stacked on each other, every head containing the
// ones below it. `retarget` makes the next evaluation appear like the workflow.
export function repo({
  count = 3,
  status = {},
  failMerge,
  moveHead,
  mergedBase,
  lag = 0,
  afterRetarget = 'success',
  ci = {},
  autoRetarget = false,
  pendingReads = {},
} = {}) {
  let pending = null;
  let nextStatusId = 100;
  const prs = Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    state: 'open',
    draft: false,
    head: { ref: `b${i + 1}`, sha: sha(i + 1) },
    base: { ref: i ? `b${i}` : 'main' },
  }));
  const statuses = new Map(
    prs.map((pr) => [
      pr.head.sha,
      {
        id: nextStatusId++,
        context: 'Delivery stages',
        state: status[pr.number] ?? 'success',
        description: 'x',
      },
    ]),
  );
  const closed = mergedBase ?? [];
  const calls = [];
  const api = async (path, { method = 'GET', body } = {}) => {
    const [pathname, query = ''] = path.split('?');
    const params = new URLSearchParams(query);
    let m;
    if (pathname.endsWith('/pulls') && params.get('state') === 'open')
      return structuredClone(prs.filter((p) => p.state === 'open'));
    if (pathname.endsWith('/pulls') && params.get('state') === 'closed')
      return closed
        .filter((p) => p.ref === params.get('head').split(':')[1])
        .map((p) => ({
          head: { ref: p.ref, sha: p.sha },
          merged_at: p.merged_at,
        }));
    if ((m = /\/commits\/(\w+)\/status$/.exec(pathname))) {
      // The workflow answers a retarget a few polls later, or never.
      if (pending && pending.sha === m[1] && afterRetarget !== 'never') {
        if (pending.reads-- <= 0) {
          statuses.set(m[1], {
            ...statuses.get(m[1]),
            id: nextStatusId++,
            state: afterRetarget,
          });
          pending = null;
        }
      }
      // The delivery check marks a PR pending for a few reads, then settles.
      const owner = prs.find((p) => p.head.sha === m[1]);
      if (owner && pendingReads[owner.number] > 0) {
        pendingReads[owner.number]--;
        return {
          statuses: [
            {
              ...statuses.get(m[1]),
              state: 'pending',
              description: 'Checking requirements, agent review and QA',
            },
          ],
        };
      }
      return { statuses: [statuses.get(m[1])].filter(Boolean) };
    }
    if ((m = /\/commits\/(\w+)\/check-runs$/.exec(pathname))) {
      const owner = prs.find((p) => p.head.sha === m[1]);
      const conclusion = ci[owner?.number] ?? 'success';
      return {
        check_runs:
          conclusion === 'missing'
            ? []
            : [{ name: 'verify', status: 'completed', conclusion }],
      };
    }
    if ((m = /\/compare\/(\w+)\.\.\.(\w+)$/.exec(pathname))) {
      const [a, b] = [m[1], m[2]].map((s) => Number(s));
      return { status: b >= a ? 'ahead' : 'diverged' };
    }
    if ((m = /\/pulls\/(\d+)\/merge$/.exec(pathname))) {
      const pr = prs.find((p) => p.number === Number(m[1]));
      calls.push(['merge', pr.number, body]);
      if (failMerge === pr.number) throw new Error('405 required check');
      if (body.sha !== pr.head.sha) throw new Error('409 head changed');
      pr.state = 'closed';
      if (autoRetarget)
        // GitHub retargets the next PR when the merged branch is deleted, and
        // the delivery check judges it again.
        for (const child of prs.filter((p) => p.base.ref === pr.head.ref)) {
          child.base.ref = 'main';
          pending = { sha: child.head.sha, reads: lag };
        }
      return { merged: true };
    }
    if ((m = /\/pulls\/(\d+)$/.exec(pathname))) {
      const pr = prs.find((p) => p.number === Number(m[1]));
      if (method === 'PATCH') {
        calls.push(['retarget', pr.number, body.base]);
        pr.base.ref = body.base;
        pending = { sha: pr.head.sha, reads: lag };
        return pr;
      }
      const current = structuredClone(pr);
      if (moveHead === pr.number) current.head.sha = sha(900);
      return current;
    }
    throw new Error('Unexpected API ' + method + ' ' + path);
  };
  return { api, calls, prs, statuses };
}
