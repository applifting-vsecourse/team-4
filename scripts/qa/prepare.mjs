import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createConnection } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve the checkout from cwd so the trusted main helper can prepare older PRs.
const root = process.cwd();

export function assertLocalDatabase(env) {
  const url = new URL(env.DATABASE_URL);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !['development', 'test'].includes(env.NODE_ENV)
  )
    throw new Error(
      'QA preparation requires a local development/test database.',
    );
}

export function portIsBusy(port, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ port, host });
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', (error) => {
      socket.destroy();
      if (error.code === 'ECONNREFUSED') resolve(false);
      else reject(error);
    });
    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error(`Cannot check local port ${port}.`));
    });
  });
}

export async function prepareQa({
  sha,
  seed = false,
  run,
  readEnv,
  busy,
  log = console.log,
}) {
  if (!/^[a-f0-9]{40}$/.test(sha ?? ''))
    throw new Error('Usage: pnpm qa:prepare <full-handoff-SHA> [--seed]');
  const ensureCheckout = () => {
    if (run('git', ['rev-parse', 'HEAD'], true).trim() !== sha)
      throw new Error(
        'Checkout does not match the handoff SHA. Switch to the PR commit first.',
      );
    if (run('git', ['status', '--porcelain'], true).trim())
      throw new Error(
        'Working tree has changes. Preserve them before preparing QA.',
      );
  };
  ensureCheckout();
  let env = readEnv();
  const ports = [
    Number(env.PORT ?? 4050),
    3050, // Vite dev server port (vite.config.ts), independent of auth redirect URL.
  ];
  for (const port of new Set(ports)) {
    for (const host of ['127.0.0.1', '::1']) {
      if (await busy(port, host))
        throw new Error(
          `App port ${port} is in use. Stop the existing app before switching QA versions.`,
        );
    }
  }
  run('pnpm', ['install', '--frozen-lockfile']);
  run('pnpm', ['env:check']);
  env = readEnv();
  assertLocalDatabase(env);
  run('pnpm', ['backend', 'prisma:generate']);
  run('pnpm', ['backend', 'build']);
  run('pnpm', ['frontend', 'type-check']);
  run('pnpm', ['backend', 'docker:up:wait']);
  ensureCheckout();
  run('pnpm', ['backend', 'migrate']);
  if (seed) run('pnpm', ['backend', 'seed']);
  ensureCheckout();
  log(
    `QA prepared at ${sha}. Start the app with pnpm dev:servers. ${seed ? 'Demo seed applied.' : 'Existing data preserved; seed not run.'}`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [sha, ...flags] = process.argv.slice(2);
  try {
    if (flags.some((flag) => flag !== '--seed'))
      throw new Error('Unknown QA preparation option.');
    await prepareQa({
      sha,
      seed: flags.includes('--seed'),
      run: (command, args, capture = false) =>
        execFileSync(command, args, {
          cwd: root,
          encoding: 'utf8',
          stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
        }),
      readEnv: () => {
        const path = resolve(root, 'apps/backend/.env');
        const file = existsSync(path)
          ? path
          : resolve(root, 'apps/backend/.env.example');
        return { ...parseEnv(readFileSync(file, 'utf8')), ...process.env };
      },
      busy: portIsBusy,
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
