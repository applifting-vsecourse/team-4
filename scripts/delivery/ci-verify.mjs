import { pathToFileURL } from 'node:url';

export function ciVerifyFailures({ baseRef, checks, database, stories, e2e }) {
  const integration =
    typeof baseRef === 'string' &&
    baseRef.startsWith('integration/') &&
    baseRef.length > 'integration/'.length;
  const results = { checks, database, stories, e2e };
  return Object.entries(results)
    .filter(
      ([lane, result]) =>
        result !== 'success' &&
        !(integration && lane === 'e2e' && result === 'skipped'),
    )
    .map(([lane, result]) => `${lane} lane finished with: ${result}`);
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  const failures = ciVerifyFailures({
    baseRef: process.env.BASE_REF ?? '',
    checks: process.env.CHECKS,
    database: process.env.DATABASE,
    stories: process.env.STORIES,
    e2e: process.env.E2E,
  });

  if (failures.length) {
    for (const failure of failures) console.error(failure);
    process.exitCode = 1;
  } else {
    console.log('All required CI lanes passed.');
  }
}
