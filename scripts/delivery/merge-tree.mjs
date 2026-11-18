import { execFileSync } from 'node:child_process';

export function fetchMergeHistory({ baseRef, token, exec = execFileSync }) {
  const shallow =
    exec('git', ['rev-parse', '--is-shallow-repository'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() === 'true';
  const fetchArgs = ['fetch', '--no-tags'];
  if (shallow) fetchArgs.push('--unshallow');
  fetchArgs.push('origin', 'refs/heads/main', `refs/heads/${baseRef}`);
  exec('git', fetchArgs, {
    stdio: 'ignore',
    env: {
      ...process.env,
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'http.extraheader',
      GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`,
    },
  });
}

export function automaticMergeTreeSha({
  baseSha,
  mainSha,
  exec = execFileSync,
}) {
  try {
    return exec('git', ['merge-tree', '--write-tree', baseSha, mainSha], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .trim()
      .split(/\s/, 1)[0];
  } catch {
    // Conflicts require a human resolution, so they are never verified
    // as a merge-only sync.
    return undefined;
  }
}
