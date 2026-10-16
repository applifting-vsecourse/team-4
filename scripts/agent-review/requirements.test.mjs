import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

function run(
  status,
  approved,
  revokeBeforeReview = false,
  author = 'developer',
) {
  // Exercise the real runner with an in-memory GitHub API. A deliberately
  // oversized diff prevents any external Copilot call in the approved case.
  const program = `
    import assert from 'node:assert/strict';
    let status = ${JSON.stringify(status)};
    const approved = ${approved};
    let reviewReads = 0;
    const revokeBeforeReview = ${revokeBeforeReview};
    const calls = [];
    const comments = [];
    let resetSent=false;
    const sha = 'a'.repeat(40);
    const pr = {number: 12, user:{login:${JSON.stringify(author)}}, head:{sha}, state:'open', base:{ref:'main'}, draft:false};
    globalThis.fetch = async (url, options = {}) => {
      const path = new URL(url).pathname;
      const body = options.body ? JSON.parse(options.body) : {};
      let data;
      if (path === '/graphql') {
        if (body.query.includes('organization(login:')) {
          data = {data:{organization:{projectV2:{id:'project',field:{id:'field',options:['In Progress','Ready for Code Review','Ready for Testing'].map(name=>({id:name,name}))},items:{pageInfo:{hasNextPage:false},nodes:[{id:'item',status:{name:status},content:{number:78,title:'Task',body:'Task',state:'OPEN',repository:{nameWithOwner:'owner/repo'},closedByPullRequestsReferences:{pageInfo:{hasNextPage:false},nodes:[{number:12,state:'OPEN',repository:{nameWithOwner:'owner/repo'}}]}}}]}}}}};
        } else if (body.query.includes('updateProjectV2ItemFieldValue')) {
          status = body.variables.option; calls.push('status:'+status);
          data={data:{updateProjectV2ItemFieldValue:{projectV2Item:{id:'item'}}}};
        } else data={data:{node:{status:{name:status}}}};
      } else if (path.endsWith('/pulls/12/reviews')) {
        data=approved && !(revokeBeforeReview && ++reviewReads > 1) ? [{id:1,user:{login:'darebakdavca'},state:'APPROVED',commit_id:sha,submitted_at:'2000-01-01T00:00:00Z'}] : [];
      } else if (path.endsWith('/pulls/12')) {
        if (options.headers.Accept === 'application/vnd.github.diff') {
          calls.push('diff'); return {ok:true,text:async()=> 'x'.repeat(110000)};
        }
        data=pr;
      } else if (path.endsWith('/issues/78')) {
        data={number:78,title:'Task',body:'Task'};
      } else if (path.endsWith('/comments')) {
        if(path.endsWith('/issues/78/comments') && revokeBeforeReview && reviewReads>1 && !resetSent) {
          resetSent=true;
          comments.push({id:99,user:{login:'developer'},author_association:'COLLABORATOR',body:'/requirements-rereview',created_at:new Date(Date.now()+1000).toISOString()});
        }
        if (options.method === 'POST') {
          calls.push(body.body.startsWith('<!-- requirements-ready') ? 'requirements-record' : body.body.startsWith('<!-- issue-requirements') ? 'scope-grant' : body.body.startsWith('<!-- requirements-reset') ? 'scope-reset' : 'comment');
          const c={user:{login:'github-actions[bot]'},body:body.body,created_at:new Date().toISOString(),html_url:'https://example.test/comment'};
          comments.push(c); data=c;
        } else data=comments;
      } else throw new Error('Unexpected request '+path);
      return {ok:true,json:async()=>data};
    };
    await import('./scripts/agent-review/run.mjs');
    console.log(JSON.stringify({status,calls}));
  `;
  const output = execFileSync(
    process.execPath,
    ['--input-type=module', '-e', program],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_REPOSITORY: 'owner/repo',
        GITHUB_TOKEN: 'mock',
        PROJECT_TOKEN: 'mock',
        PROJECT_OWNER: 'owner',
        PROJECT_NUMBER: '1',
        DRY_RUN: 'false',
        FORCE: 'false',
        ONLY_ISSUE: '',
      },
    },
  );
  return JSON.parse(output.trim().split('\n').at(-1));
}

test('real runner keeps a new unapproved PR In Progress without reading a diff or calling Copilot', () => {
  assert.deepEqual(run('In Progress', false), {
    status: 'In Progress',
    calls: [],
  });
});
test('real runner corrects a manual code-review move before agent review', () => {
  assert.deepEqual(run('Ready for Code Review', false), {
    status: 'In Progress',
    calls: ['status:In Progress'],
  });
});
test('real runner moves to code review and records requirements before fetching a diff', () => {
  const result = run('In Progress', true);
  assert.equal(result.status, 'Ready for Code Review');
  assert.deepEqual(result.calls.slice(0, 3), [
    'scope-grant',
    'status:Ready for Code Review',
    'requirements-record',
  ]);
});

test('real runner stops when scope re-review is explicitly requested before agent review', () => {
  const result = run('In Progress', true, true);
  assert.equal(result.status, 'In Progress');
  assert.equal(result.calls.includes('diff'), false);
  assert.deepEqual(result.calls, [
    'scope-grant',
    'status:Ready for Code Review',
    'requirements-record',
    'scope-reset',
    'status:In Progress',
  ]);
});

test('real runner records the explicit author exemption and starts review on David PRs without approval', () => {
  const result = run('In Progress', false, false, 'darebakdavca');
  assert.equal(result.status, 'Ready for Code Review');
  assert.deepEqual(result.calls.slice(0, 3), [
    'status:Ready for Code Review',
    'requirements-record',
    'diff',
  ]);
});
