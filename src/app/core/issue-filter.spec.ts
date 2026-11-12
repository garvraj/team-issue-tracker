import { EMPTY_FILTER, UNASSIGNED, filterIssues, isFilterActive, sortIssues } from './issue-filter';
import { Issue } from './models';

function issue(overrides: Partial<Issue>): Issue {
  return {
    id: 'i',
    projectId: 'p',
    number: 1,
    title: 'Untitled',
    description: '',
    status: 'todo',
    priority: 'medium',
    type: 'task',
    assigneeId: null,
    reporterId: 'u1',
    labelIds: [],
    order: 0,
    dueDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const issues = [
  issue({ id: 'a', number: 1, title: 'Login button broken', assigneeId: 'u1', labelIds: ['bug'], priority: 'urgent', type: 'bug' }),
  issue({ id: 'b', number: 2, title: 'Add dark mode', description: 'Theme toggle in settings', labelIds: ['ux'], priority: 'low' }),
  issue({ id: 'c', number: 12, title: 'Refactor login service', assigneeId: 'u2', priority: 'high', status: 'done' }),
];

describe('filterIssues', () => {
  it('returns everything for an empty filter', () => {
    expect(filterIssues(issues, EMPTY_FILTER)).toHaveLength(3);
  });

  it('matches every search term against title and description', () => {
    expect(filterIssues(issues, { ...EMPTY_FILTER, text: 'login' }).map((i) => i.id)).toEqual(['a', 'c']);
    expect(filterIssues(issues, { ...EMPTY_FILTER, text: 'login refactor' }).map((i) => i.id)).toEqual(['c']);
    expect(filterIssues(issues, { ...EMPTY_FILTER, text: 'SETTINGS' }).map((i) => i.id)).toEqual(['b']);
  });

  it('matches the issue key', () => {
    expect(filterIssues(issues, { ...EMPTY_FILTER, text: 'web-12' }, 'WEB').map((i) => i.id)).toEqual(['c']);
  });

  it('filters by assignee, including unassigned', () => {
    expect(filterIssues(issues, { ...EMPTY_FILTER, assigneeId: 'u2' }).map((i) => i.id)).toEqual(['c']);
    expect(filterIssues(issues, { ...EMPTY_FILTER, assigneeId: UNASSIGNED }).map((i) => i.id)).toEqual(['b']);
  });

  it('combines label, priority and type filters', () => {
    expect(filterIssues(issues, { ...EMPTY_FILTER, labelId: 'bug', type: 'bug', priority: 'urgent' }).map((i) => i.id)).toEqual(['a']);
    expect(filterIssues(issues, { ...EMPTY_FILTER, labelId: 'bug', priority: 'low' })).toEqual([]);
  });
});

describe('isFilterActive', () => {
  it('ignores whitespace-only search text', () => {
    expect(isFilterActive({ ...EMPTY_FILTER, text: '   ' })).toBe(false);
    expect(isFilterActive({ ...EMPTY_FILTER, priority: 'high' })).toBe(true);
  });
});

describe('sortIssues', () => {
  it('sorts by priority rank, not alphabetically', () => {
    expect(sortIssues(issues, { field: 'priority', direction: 'asc' }).map((i) => i.priority)).toEqual(['urgent', 'high', 'low']);
  });

  it('sorts by workflow order of status', () => {
    expect(sortIssues(issues, { field: 'status', direction: 'desc' }).map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('keeps issues without a due date last in both directions', () => {
    const dated = [
      issue({ id: 'none', number: 1 }),
      issue({ id: 'early', number: 2, dueDate: '2026-01-01' }),
      issue({ id: 'late', number: 3, dueDate: '2026-06-01' }),
    ];
    expect(sortIssues(dated, { field: 'dueDate', direction: 'asc' }).map((i) => i.id)).toEqual(['early', 'late', 'none']);
    expect(sortIssues(dated, { field: 'dueDate', direction: 'desc' }).map((i) => i.id)).toEqual(['late', 'early', 'none']);
  });

  it('does not mutate the input', () => {
    const copy = [...issues];
    sortIssues(issues, { field: 'title', direction: 'asc' });
    expect(issues).toEqual(copy);
  });
});
