import { ISSUE_PRIORITIES, ISSUE_STATUSES, Issue, IssuePriority, IssueType } from './models';

export const UNASSIGNED = 'unassigned';

export interface IssueFilter {
  text: string;
  /** A user id, {@link UNASSIGNED}, or null for any assignee. */
  assigneeId: string | null;
  labelId: string | null;
  priority: IssuePriority | null;
  type: IssueType | null;
}

export const EMPTY_FILTER: IssueFilter = { text: '', assigneeId: null, labelId: null, priority: null, type: null };

export type IssueSortField = 'number' | 'title' | 'status' | 'priority' | 'updatedAt' | 'dueDate';
export interface IssueSort {
  field: IssueSortField;
  direction: 'asc' | 'desc';
}

export function isFilterActive(filter: IssueFilter): boolean {
  return (
    filter.text.trim() !== '' ||
    filter.assigneeId !== null ||
    filter.labelId !== null ||
    filter.priority !== null ||
    filter.type !== null
  );
}

/**
 * Text search matches the title, description, or the issue key
 * (e.g. "WEB-12" or just "12").
 */
export function filterIssues(issues: readonly Issue[], filter: IssueFilter, projectKey = ''): Issue[] {
  const terms = filter.text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return issues.filter((issue) => {
    if (filter.assigneeId === UNASSIGNED ? issue.assigneeId !== null : filter.assigneeId && issue.assigneeId !== filter.assigneeId) {
      return false;
    }
    if (filter.labelId && !issue.labelIds.includes(filter.labelId)) return false;
    if (filter.priority && issue.priority !== filter.priority) return false;
    if (filter.type && issue.type !== filter.type) return false;
    if (terms.length) {
      const haystack = `${projectKey}-${issue.number} ${issue.title} ${issue.description}`.toLowerCase();
      return terms.every((t) => haystack.includes(t));
    }
    return true;
  });
}

const statusRank = new Map(ISSUE_STATUSES.map((s, i) => [s.value, i]));
const priorityRank = new Map(ISSUE_PRIORITIES.map((p) => [p.value, p.rank]));

export function sortIssues(issues: readonly Issue[], sort: IssueSort): Issue[] {
  const dir = sort.direction === 'asc' ? 1 : -1;
  const compare = (a: Issue, b: Issue): number => {
    switch (sort.field) {
      case 'number':
        return a.number - b.number;
      case 'title':
        return a.title.localeCompare(b.title);
      case 'status':
        return statusRank.get(a.status)! - statusRank.get(b.status)!;
      case 'priority':
        return priorityRank.get(a.priority)! - priorityRank.get(b.priority)!;
      case 'updatedAt':
        return a.updatedAt.localeCompare(b.updatedAt);
      case 'dueDate':
        // Issues without a due date always sort last.
        if (a.dueDate === b.dueDate) return 0;
        if (!a.dueDate) return dir;
        if (!b.dueDate) return -dir;
        return a.dueDate.localeCompare(b.dueDate);
    }
  };
  return [...issues].sort((a, b) => compare(a, b) * dir || a.number - b.number);
}
