# Local QA

Test the PR's current commit. Its full SHA is
`gh pr view <PR-number> --json headRefOid -q .headRefOid`. A new PR commit
dismisses earlier approvals and needs QA again; advancing `main` alone does not
require updating the PR branch.

## Prepare the checkout

Stop existing app servers before switching versions. Preserve unrelated work;
preparation refuses a dirty checkout and does not switch branches for you.

```sh
gh pr checkout <PR-number>
pnpm qa:prepare <full-PR-SHA>
pnpm dev:servers
```

Run from the repository root with Node 24, pnpm and Docker available.
Preparation verifies HEAD and checks app ports, installs locked dependencies,
creates missing env files, generates Prisma, builds the backend, type-checks the
frontend, starts the local database and applies migrations. It does not start
app servers, reset the database, modify existing env files or run the seed.
Use `--seed` to explicitly add demo data. Account details are in
[the seed source](../apps/backend/src/scripts/seed/seed/seed-database.ts).

Older PR branches may not contain `qa:prepare`. Use the helper from trusted main
without merging main into the branch:

```sh
git fetch origin main
qa_helper_dir="$(mktemp -d)"
git show origin/main:scripts/qa/prepare.mjs > "$qa_helper_dir/prepare.mjs"
node "$qa_helper_dir/prepare.mjs" <full-PR-SHA>
rm -r "$qa_helper_dir"
pnpm dev:servers
```

The helper operates on the current checkout. It checks the SHA before changing
anything and again before migrations. It requires a local development/test
`DATABASE_URL`; remote databases and production configuration are rejected.
Migrations can change existing local data; use a disposable local QA database
when switching between incompatible schema histories. A failed migration stops
setup. Do not reset a database to hide that failure.

## Prisma errors after switching branches

`paymentDueDays does not exist` can mean stale generated types **or** a mismatch
between source and schema. Regenerate first; backend compilation must then pass.
If it still fails, report the exact SHA and error. Do not edit generated files.
PR #135 at `92d8a9eeaee7f4dac2bd53e3c127c953ec795c89` used
`paymentDueDays` in registration code but `paymentReminderDays` in its schema;
that revision's error reproduces even with a freshly generated client.

## Approving

The QA notifier asks the tester for a review once CI passed on the current
commit; testing earlier is fine too. Setup instructions stay here. Approve the
PR only if its current head is still the commit you tested: an approval always
applies to the head at the time of the review. Checks do not substitute for
exercising the story's acceptance criteria.
