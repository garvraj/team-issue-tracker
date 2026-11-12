export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
export type IssuePriority = 'urgent' | 'high' | 'medium' | 'low';
export type IssueType = 'bug' | 'feature' | 'task';
export type UserRole = 'admin' | 'member';

export const ISSUE_STATUSES: readonly { value: IssueStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'in_review', label: 'In review' },
  { value: 'done', label: 'Done' },
];

export const ISSUE_PRIORITIES: readonly { value: IssuePriority; label: string; rank: number }[] = [
  { value: 'urgent', label: 'Urgent', rank: 0 },
  { value: 'high', label: 'High', rank: 1 },
  { value: 'medium', label: 'Medium', rank: 2 },
  { value: 'low', label: 'Low', rank: 3 },
];

export const ISSUE_TYPES: readonly { value: IssueType; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'task', label: 'Task' },
];

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarColor: string;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  description: string;
  memberIds: string[];
  createdAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Issue {
  id: string;
  projectId: string;
  number: number;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  assigneeId: string | null;
  reporterId: string;
  labelIds: string[];
  /** Position within its status column on the board. */
  order: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  issueId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export type ActivityKind = 'created' | 'status' | 'assignee' | 'priority' | 'title' | 'comment';

export interface Activity {
  id: string;
  issueId: string;
  actorId: string;
  kind: ActivityKind;
  from: string | null;
  to: string | null;
  at: string;
}

export interface Db {
  users: User[];
  projects: Project[];
  labels: Label[];
  issues: Issue[];
  comments: Comment[];
  activity: Activity[];
}

export type NewIssue = Pick<Issue, 'title' | 'description' | 'status' | 'priority' | 'type' | 'assigneeId' | 'labelIds' | 'dueDate'>;
export type IssuePatch = Partial<NewIssue>;

export interface ProjectSummary extends Project {
  openIssueCount: number;
  totalIssueCount: number;
}
