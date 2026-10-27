// Preserve the ruleset while moving approval counts into Delivery stages.
export function severityRuleset(current) {
  if (
    current.enforcement !== 'active' ||
    current.target !== 'branch' ||
    !current.conditions?.ref_name?.include?.includes('refs/heads/main')
  )
    throw new Error('Expected an active main branch ruleset');
  const payload = structuredClone(
    Object.fromEntries(
      [
        'name',
        'target',
        'enforcement',
        'conditions',
        'rules',
        'bypass_actors',
      ].map((key) => [key, current[key]]),
    ),
  );
  const checks = payload.rules.find(
    (rule) => rule.type === 'required_status_checks',
  )?.parameters.required_status_checks;
  if (
    !['verify', 'Delivery stages'].every((name) =>
      checks?.some(
        (check) => check.context === name && check.integration_id === 15368,
      ),
    )
  )
    throw new Error(
      'Both required GitHub Actions checks must already be configured',
    );
  const pr = payload.rules.find((rule) => rule.type === 'pull_request');
  if (!pr) throw new Error('PR rule is missing');
  pr.parameters.required_approving_review_count = 0;
  pr.parameters.require_last_push_approval = false;
  pr.parameters.require_extra_approval_for_unattributed_changes = false;
  return payload;
}
