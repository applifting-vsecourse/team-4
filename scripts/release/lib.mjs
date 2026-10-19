export const FIRST_VERSION = 'v0.1.0';

const SEMVER_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;

export function latestVersion(tags) {
  return (
    tags
      .map((tag) => ({
        tag,
        parts: tag.match(SEMVER_TAG)?.slice(1).map(Number),
      }))
      .filter((t) => t.parts)
      .sort((a, b) =>
        a.parts.reduce((diff, part, i) => diff || part - b.parts[i], 0),
      )
      .at(-1)?.tag ?? null
  );
}

// Every merge to main is a patch release; bump minor or major by publishing
// a higher tag by hand, the next merge continues from it.
export function nextVersion(tags) {
  const latest = latestVersion(tags);
  if (!latest) return FIRST_VERSION;
  const [major, minor, patch] = latest.slice(1).split('.').map(Number);
  return `v${major}.${minor}.${patch + 1}`;
}

export function releaseNotes({
  version,
  sha,
  pr,
  issues,
  message,
  deployUrl,
  stageUrl,
  generated,
}) {
  const contents = pr
    ? [
        ...(issues.length
          ? [
              'Implementuje:',
              ...issues.map((i) => `- #${i.number} ${i.title}`),
              '',
            ]
          : []),
        `Pull request: #${pr.number} ${pr.title}`,
      ]
    : [`Commit bez pull requestu: ${message.split('\n')[0]}`];
  return [
    '## Co obsahuje',
    '',
    ...contents,
    '',
    '## Nasazení na stage',
    '',
    `Merge do \`main\` tuto verzi nasadil na ${stageUrl} automaticky.`,
    '',
    `Nasadit ji znovu (třeba návrat ke starší verzi): [otevřít workflow Build & Deploy](${deployUrl}) → **Run workflow** → v **Use workflow from** přepnout na záložku **Tags** → vybrat \`${version}\` → **Run workflow**.`,
    '',
    `Commit: ${sha}`,
    ...(generated ? ['', generated] : []),
  ].join('\n');
}
