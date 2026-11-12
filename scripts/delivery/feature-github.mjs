// GitHub reads shared by the delivery and agent-review runners for the
// feature integration flow. `graphql(query, variables)` returns the raw
// response ({ data, errors }); anything truncated fails closed.

// Labels, linked branches, parent and sub-issues of one issue, normalised for
// feature.mjs. Anything truncated fails closed instead of being guessed at.
export async function readIssueDetails({ graphql, repo, number }) {
  const page = 'pageInfo{hasNextPage}';
  const branches = `linkedBranches(first:50){nodes{ref{name repository{nameWithOwner}}} ${page}}`;
  const labels = `labels(first:50){nodes{name} ${page}}`;
  const response = await graphql(
    `query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){issue(number:$number){number state ${labels} ${branches} parent{number state repository{nameWithOwner} ${branches}} subIssues(first:50){nodes{number state stateReason ${labels}} ${page}}}}}`,
    { owner: repo.split('/')[0], repo: repo.split('/')[1], number },
  );
  const issue = response.data?.repository?.issue;
  if (response.errors || !issue)
    throw new Error(`Cannot read issue #${number} details`);
  const complete = (connection, what) => {
    if (connection.pageInfo.hasNextPage)
      throw new Error(`Issue #${number} has too many ${what}`);
    return connection.nodes;
  };
  // The Development section can link a same-named branch in another repository.
  const refs = (connection) =>
    complete(connection, 'linked branches')
      .filter((node) => node.ref?.repository?.nameWithOwner === repo)
      .map((node) => node.ref.name);
  const names = (connection) =>
    complete(connection, 'labels').map((label) => label.name);
  return {
    number: issue.number,
    state: issue.state,
    labels: names(issue.labels),
    branches: refs(issue.linkedBranches),
    // A parent in another repository cannot link one of our branches.
    parent: issue.parent && {
      number: issue.parent.number,
      state: issue.parent.state,
      branches:
        issue.parent.repository.nameWithOwner === repo
          ? refs(issue.parent.linkedBranches)
          : [],
    },
    subIssues: complete(issue.subIssues, 'sub-issues').map((sub) => ({
      number: sub.number,
      state: sub.state,
      stateReason: sub.stateReason,
      labels: names(sub.labels),
    })),
  };
}
