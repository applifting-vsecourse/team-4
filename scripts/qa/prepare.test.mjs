import assert from 'node:assert/strict';
import test from 'node:test';
import { assertLocalDatabase, prepareQa, portIsBusy } from './prepare.mjs';
import { createServer } from 'node:net';

const sha = 'a'.repeat(40);
function fixture(options = {}) {
  const calls = [];
  const env = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://local:local@localhost:5433/akcio',
  };
  return {
    calls,
    args: {
      sha,
      seed: options.seed,
      log() {},
      readEnv: () => env,
      busy: async () => options.busy ?? false,
      run(command, args, capture) {
        const call = [command, ...args].join(' ');
        calls.push(call);
        if (args[0] === 'rev-parse')
          return options.wrongSha ? 'b'.repeat(40) : sha;
        if (args[0] === 'status') return options.dirty ? ' M src/file.ts' : '';
        if (options.fail === call) throw new Error('Command failed');
        assert.equal(capture, undefined);
      },
    },
  };
}

test('QA preparation refreshes dependencies and Prisma before migrations, without starting or seeding', async () => {
  const f = fixture();
  await prepareQa(f.args);
  assert.deepEqual(
    f.calls.filter((c) => c.startsWith('pnpm')),
    [
      'pnpm install --frozen-lockfile',
      'pnpm env:check',
      'pnpm backend prisma:generate',
      'pnpm backend build',
      'pnpm frontend type-check',
      'pnpm backend docker:up:wait',
      'pnpm backend migrate',
    ],
  );
});

for (const options of [{ wrongSha: true }, { dirty: true }, { busy: true }]) {
  test(`rejects unsafe checkout/setup before commands: ${JSON.stringify(options)}`, async () => {
    const f = fixture(options);
    await assert.rejects(prepareQa(f.args));
    assert.ok(f.calls.every((c) => c.startsWith('git')));
  });
}

test('a failed dependency install or generation cannot continue to migration', async () => {
  for (const fail of [
    'pnpm install --frozen-lockfile',
    'pnpm backend prisma:generate',
    'pnpm backend build',
    'pnpm frontend type-check',
  ]) {
    const f = fixture({ fail });
    await assert.rejects(prepareQa(f.args), /Command failed/);
    assert.ok(!f.calls.includes('pnpm backend migrate'));
  }
});

test('seeding requires the explicit flag and follows successful migration', async () => {
  const f = fixture({ seed: true });
  await prepareQa(f.args);
  assert.ok(
    f.calls.indexOf('pnpm backend seed') >
      f.calls.indexOf('pnpm backend migrate'),
  );
});

test('production or remote database configuration is rejected', () => {
  for (const env of [
    { NODE_ENV: 'production', DATABASE_URL: 'postgresql://localhost/db' },
    { NODE_ENV: 'development', DATABASE_URL: 'postgresql://remote.example/db' },
  ])
    assert.throws(() => assertLocalDatabase(env), /local development/);
});

test('real TCP listener is detected without touching its process', async () => {
  const server = createServer((socket) => socket.end());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    assert.equal(await portIsBusy(port), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  assert.equal(await portIsBusy(port), false);
});
