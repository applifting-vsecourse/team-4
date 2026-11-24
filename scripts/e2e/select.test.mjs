import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { test } from 'node:test';
import { SPEC_AREAS, selectSpecs } from './select.mjs';

const SPECS = readdirSync('apps/frontend/e2e').filter((file) =>
  file.endsWith('.spec.ts'),
);
const EVENT =
  'apps/frontend/src/routes/_ProtectedPages/organizations/$organizationId/events/$eventId';
const select = (...paths) => selectSpecs(paths, SPECS);

test('every spec file names its areas, and no listed spec is gone', () => {
  assert.deepEqual(
    SPECS.filter((file) => !(file in SPEC_AREAS)),
    [],
    'add new specs to SPEC_AREAS in scripts/e2e/select.mjs',
  );
  assert.deepEqual(
    Object.keys(SPEC_AREAS).filter((file) => !SPECS.includes(file)),
    [],
  );
});

test('a spec without areas runs the whole suite', () => {
  const result = selectSpecs(
    ['apps/backend/src/modules/payments/x.ts'],
    [...SPECS, 'brand-new.spec.ts'],
  );
  assert.equal(result.mode, 'all');
  assert.match(result.reasons[0], /brand-new\.spec\.ts/);
});

test('a backend change runs the specs of its area, with the reason', () => {
  const result = select('apps/backend/src/modules/payments/services/x.ts');
  assert.equal(result.mode, 'some');
  assert.ok(result.specs.includes('payments.spec.ts'));
  assert.ok(result.specs.includes('statement-import.spec.ts'));
  assert.ok(!result.specs.includes('room-assignment.spec.ts'));
  assert.deepEqual(result.reasons, [
    'apps/backend/src/modules/payments/services/x.ts: area payments',
  ]);
});

test('a frontend feature or route runs the specs of its area', () => {
  const feature = select('apps/frontend/src/features/rooms/components/X.tsx');
  assert.ok(feature.specs.includes('room-assignment.spec.ts'));
  assert.ok(!feature.specs.includes('payments.spec.ts'));
  const route = select(`${EVENT}/rooms.tsx`);
  assert.deepEqual(route.specs, feature.specs);
  assert.ok(
    select(
      'apps/frontend/src/routes/my-registrations/$registrationId.tsx',
    ).specs.includes('registration-changes.spec.ts'),
  );
});

test('a changed spec runs itself', () => {
  assert.deepEqual(select('apps/frontend/e2e/payments.spec.ts'), {
    mode: 'some',
    specs: ['payments.spec.ts'],
    reasons: ['apps/frontend/e2e/payments.spec.ts: changed spec'],
  });
});

test('shared parts, auth, migrations and test infrastructure run everything', () => {
  for (const path of [
    'apps/frontend/src/components/ui/button.tsx',
    'apps/frontend/src/lib/api-client.ts',
    'apps/frontend/src/features/auth/hooks/useSession.ts',
    'apps/backend/src/core/prisma/prisma.service.ts',
    'apps/backend/prisma/migrations/20270101000000_x/migration.sql',
    'apps/backend/prisma/schema.prisma',
    'apps/frontend/e2e/support/api.ts',
    'apps/frontend/playwright.config.ts',
    'scripts/e2e/select.mjs',
    '.github/workflows/ci.yml',
    'pnpm-lock.yaml',
    'apps/frontend/package.json',
    'apps/backend/src/modules/organizations/x.ts',
    'apps/frontend/src/routes/__root.tsx',
  ]) {
    const result = select('docs/x.md', path);
    assert.equal(result.mode, 'all', path);
    assert.equal(result.specs.length, SPECS.length);
    assert.match(
      result.reasons[0],
      new RegExp(`^${path.replace(/[.$]/g, '\\$&')}: `),
    );
  }
});

test('a path with unknown impact runs everything', () => {
  const result = select('apps/frontend/src/brand-new-folder/thing.ts');
  assert.equal(result.mode, 'all');
  assert.match(result.reasons[0], /impact unknown/);
});

test('documentation, stories and unit tests need no E2E', () => {
  const result = select(
    'docs/delivery-workflow.md',
    'apps/frontend/src/screens/event/Settings.stories.tsx',
    'apps/frontend/src/features/payments/components/X.test.tsx',
    'apps/backend/src/modules/payments/payments.db-spec.ts',
    'apps/frontend/src/features/payments/fixtures/payments.ts',
    '.github/workflows/review.yml',
  );
  assert.equal(result.mode, 'none');
  assert.deepEqual(result.specs, []);
});

test('documentation in a shared folder still needs no E2E', () => {
  assert.equal(select('apps/backend/prisma/README.md').mode, 'none');
  assert.equal(select('apps/backend/prisma/demo/demo-create.sql').mode, 'none');
});

test('areas combine across changed paths', () => {
  const result = select(
    'apps/backend/src/modules/programme/x.ts',
    'apps/frontend/src/features/payments/x.ts',
  );
  assert.ok(result.specs.includes('programme.spec.ts'));
  assert.ok(result.specs.includes('statement-import.spec.ts'));
  assert.equal(result.reasons.length, 2);
});
