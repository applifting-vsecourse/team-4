// Labels are read from the live PR, never from the event payload or PR code.
export const SEVERITY_LABELS = [
  'severity:low',
  'severity:standard',
  'severity:high',
];
export function severityFor(pr) {
  const labels = (pr.labels ?? []).map((label) =>
    typeof label === 'string' ? label : label.name,
  );
  const selected = labels.filter((label) => label?.startsWith('severity:'));
  if (
    selected.length > 1 ||
    selected.some((label) => !SEVERITY_LABELS.includes(label))
  )
    throw new Error(
      'Select exactly one valid severity label (low, standard or high).',
    );
  return selected[0]?.slice('severity:'.length) ?? 'standard';
}
export const sameSeverity = (a, b) => severityFor(a) === severityFor(b);

// Low severity is deliberately limited to files with no application execution.
// Copy/formatting inside application code uses Standard, because a path alone
// cannot prove that a code edit has no behavioral effect.
export function validateSeverity(pr, files) {
  const severity = severityFor(pr);
  const paths = files.flatMap((file) =>
    [file.filename, file.previous_filename].filter(Boolean),
  );
  if (
    paths.some((path) =>
      /^(?:\.github\/|scripts\/(?:delivery|agent-review|automation)\/|CLAUDE\.md$|AGENTS\.md$|docs\/delivery-workflow\.md$)/.test(
        path,
      ),
    ) &&
    severity !== 'high'
  )
    throw new Error(
      'Review and merge enforcement changes require severity:high.',
    );
  if (
    severity === 'low' &&
    (!files.length ||
      paths.some(
        (path) =>
          !(
            /\.(?:md|txt)$/.test(path) ||
            /(?:\.test|\.spec)\.[cm]?[jt]sx?$/.test(path)
          ) ||
          /(?:^|\/)(?:package\.json|pnpm-lock\.yaml|migrations|\.github)(?:\/|$)/.test(
            path,
          ),
      ))
  )
    throw new Error(
      'Low severity allows only documentation/text and isolated test files; use Standard or High for executable/configuration changes.',
    );
  return severity;
}
