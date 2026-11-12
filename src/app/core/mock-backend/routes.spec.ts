import { Db, Issue } from '../models';
import { ApiError, RequestContext, dispatch } from './routes';

function issue(id: string, number: number, status: Issue['status'], order: number): Issue {
  return {
    id,
    number,
    order,
    status,
    title: id.toUpperCase(),
    projectId: 'p1',
    description: '',
    priority: 'medium',
    type: 'task',
    assigneeId: null,
    reporterId: 'u1',
    labelIds: [],
    dueDate: null,
    createdAt: '',
    updatedAt: '',
  };
}

function makeDb(): Db {
  return {
    users: [{ id: 'u1', name: 'Ada', email: 'ada@example.com', role: 'admin', avatarColor: '#000' }],
    projects: [{ id: 'p1', key: 'T', name: 'Test', description: '', memberIds: ['u1'], createdAt: '' }],
    labels: [{ id: 'l1', name: 'bug', color: '#f00' }],
    issues: [
      issue('a', 1, 'todo', 0),
      issue('b', 2, 'todo', 1),
      issue('c', 3, 'todo', 2),
      issue('d', 4, 'done', 0),
    ],
    comments: [],
    activity: [],
  };
}

let db: Db;
let ids = 0;
const call = (method: string, path: string, body?: unknown, userId: string | null = 'u1') =>
  dispatch(method, path, {
    db,
    body,
    userId,
    now: () => '2026-02-01T00:00:00.000Z',
    nextId: (prefix) => `${prefix}_${++ids}`,
  } satisfies Omit<RequestContext, 'params'>);

const column = (status: string) =>
  db.issues
    .filter((i) => i.status === status)
    .sort((x, y) => x.order - y.order)
    .map((i) => i.id);

beforeEach(() => {
  db = makeDb();
});

describe('mock API routes', () => {
  it('returns 404 for unknown routes and missing records', () => {
    expect(() => call('GET', '/api/nope')).toThrowError(ApiError);
    expect(() => call('GET', '/api/issues/zzz')).toThrowError('Issue not found');
  });

  it('requires a signed-in user for writes', () => {
    expect(() => call('POST', '/api/issues/a/comments', { body: 'hi' }, null)).toThrowError('Not signed in');
  });

  it('creates issues with the next number at the end of their column', () => {
    const issue = call('POST', '/api/projects/p1/issues', { title: '  New  ', status: 'todo' }) as Issue;
    expect(issue).toMatchObject({ number: 5, title: 'New', order: 3, reporterId: 'u1' });
    expect(db.activity.at(-1)).toMatchObject({ issueId: issue.id, kind: 'created' });
  });

  it('rejects blank titles and unknown labels', () => {
    expect(() => call('POST', '/api/projects/p1/issues', { title: '   ' })).toThrowError('Title is required');
    expect(() => call('PATCH', '/api/issues/a', { labelIds: ['missing'] })).toThrowError('Unknown label');
  });

  it('logs activity only for fields that actually changed', () => {
    call('PATCH', '/api/issues/a', { priority: 'medium', status: 'done' });
    expect(db.activity.map((a) => [a.kind, a.from, a.to])).toEqual([['status', 'todo', 'done']]);
  });

  it('reorders within a column', () => {
    call('POST', '/api/issues/c/move', { status: 'todo', index: 0 });
    expect(column('todo')).toEqual(['c', 'a', 'b']);
  });

  it('moves across columns and renumbers both', () => {
    call('POST', '/api/issues/a/move', { status: 'done', index: 0 });
    expect(column('todo')).toEqual(['b', 'c']);
    expect(column('done')).toEqual(['a', 'd']);
    expect(db.issues.filter((i) => i.status === 'todo').map((i) => i.order).sort()).toEqual([0, 1]);
    expect(db.activity.at(-1)).toMatchObject({ kind: 'status', from: 'todo', to: 'done' });
  });

  it('clamps out-of-range move indexes', () => {
    call('POST', '/api/issues/a/move', { status: 'todo', index: 99 });
    expect(column('todo')).toEqual(['b', 'c', 'a']);
  });

  it('deletes an issue with its comments and activity', () => {
    call('POST', '/api/issues/b/comments', { body: 'hello' });
    call('DELETE', '/api/issues/b');
    expect(db.issues.map((i) => i.id)).not.toContain('b');
    expect(db.comments).toEqual([]);
    expect(db.activity).toEqual([]);
    expect(column('todo')).toEqual(['a', 'c']);
  });
});
