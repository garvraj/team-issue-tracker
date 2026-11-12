import {
  Activity,
  ActivityKind,
  Comment,
  Db,
  Issue,
  IssuePatch,
  IssueStatus,
  NewIssue,
  ProjectSummary,
} from '../models';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface RequestContext {
  db: Db;
  params: Record<string, string>;
  body: any;
  userId: string | null;
  now: () => string;
  nextId: (prefix: string) => string;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type Handler = (ctx: RequestContext) => unknown;

interface Route {
  method: Method;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

const routes: Route[] = [];

function route(method: Method, path: string, handler: Handler): void {
  const keys: string[] = [];
  const source = path.replace(/:(\w+)/g, (_, key: string) => {
    keys.push(key);
    return '([^/]+)';
  });
  routes.push({ method, pattern: new RegExp(`^${source}$`), keys, handler });
}

export function dispatch(method: string, path: string, ctx: Omit<RequestContext, 'params'>): unknown {
  for (const r of routes) {
    if (r.method !== method) continue;
    const match = r.pattern.exec(path);
    if (!match) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(match[i + 1])]));
    return r.handler({ ...ctx, params });
  }
  throw new ApiError(404, `No mock route for ${method} ${path}`);
}

// ---------------------------------------------------------------- helpers

function requireUser(ctx: RequestContext): string {
  if (!ctx.userId || !ctx.db.users.some((u) => u.id === ctx.userId)) {
    throw new ApiError(401, 'Not signed in');
  }
  return ctx.userId;
}

function findProject(ctx: RequestContext, id: string) {
  const project = ctx.db.projects.find((p) => p.id === id);
  if (!project) throw new ApiError(404, 'Project not found');
  return project;
}

function findIssue(ctx: RequestContext, id: string): Issue {
  const issue = ctx.db.issues.find((i) => i.id === id);
  if (!issue) throw new ApiError(404, 'Issue not found');
  return issue;
}

function logActivity(
  ctx: RequestContext,
  issueId: string,
  kind: ActivityKind,
  from: string | null = null,
  to: string | null = null,
): void {
  const entry: Activity = {
    id: ctx.nextId('act'),
    issueId,
    actorId: requireUser(ctx),
    kind,
    from,
    to,
    at: ctx.now(),
  };
  ctx.db.activity.push(entry);
}

function validateIssueFields(ctx: RequestContext, fields: IssuePatch): void {
  if (fields.title !== undefined && !fields.title.trim()) {
    throw new ApiError(400, 'Title is required');
  }
  if (fields.assigneeId && !ctx.db.users.some((u) => u.id === fields.assigneeId)) {
    throw new ApiError(400, 'Unknown assignee');
  }
  if (fields.labelIds?.some((id) => !ctx.db.labels.some((l) => l.id === id))) {
    throw new ApiError(400, 'Unknown label');
  }
}

function columnOf(db: Db, projectId: string, status: IssueStatus, exceptId?: string): Issue[] {
  return db.issues
    .filter((i) => i.projectId === projectId && i.status === status && i.id !== exceptId)
    .sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------- users

route('GET', '/api/users', ({ db }) => db.users);

// ---------------------------------------------------------------- projects

route('GET', '/api/projects', ({ db }): ProjectSummary[] =>
  db.projects.map((p) => {
    const issues = db.issues.filter((i) => i.projectId === p.id);
    return {
      ...p,
      totalIssueCount: issues.length,
      openIssueCount: issues.filter((i) => i.status !== 'done').length,
    };
  }),
);

route('GET', '/api/projects/:projectId', (ctx) => findProject(ctx, ctx.params['projectId']));

route('GET', '/api/labels', ({ db }) => db.labels);

// ---------------------------------------------------------------- issues

route('GET', '/api/projects/:projectId/issues', (ctx) => {
  findProject(ctx, ctx.params['projectId']);
  return ctx.db.issues.filter((i) => i.projectId === ctx.params['projectId']);
});

route('POST', '/api/projects/:projectId/issues', (ctx) => {
  const reporterId = requireUser(ctx);
  const project = findProject(ctx, ctx.params['projectId']);
  const input = ctx.body as NewIssue;
  validateIssueFields(ctx, { ...input, title: input.title ?? '' });

  const projectIssues = ctx.db.issues.filter((i) => i.projectId === project.id);
  const now = ctx.now();
  const issue: Issue = {
    id: ctx.nextId('iss'),
    projectId: project.id,
    number: projectIssues.reduce((max, i) => Math.max(max, i.number), 0) + 1,
    title: input.title.trim(),
    description: input.description ?? '',
    status: input.status ?? 'backlog',
    priority: input.priority ?? 'medium',
    type: input.type ?? 'task',
    assigneeId: input.assigneeId ?? null,
    reporterId,
    labelIds: input.labelIds ?? [],
    order: columnOf(ctx.db, project.id, input.status ?? 'backlog').length,
    dueDate: input.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
  };
  ctx.db.issues.push(issue);
  logActivity(ctx, issue.id, 'created');
  return issue;
});

route('GET', '/api/issues/:issueId', (ctx) => findIssue(ctx, ctx.params['issueId']));

route('PATCH', '/api/issues/:issueId', (ctx) => {
  requireUser(ctx);
  const issue = findIssue(ctx, ctx.params['issueId']);
  const patch = ctx.body as IssuePatch;
  validateIssueFields(ctx, patch);

  const tracked = ['status', 'assigneeId', 'priority', 'title'] as const;
  const kinds: Record<(typeof tracked)[number], ActivityKind> = {
    status: 'status',
    assigneeId: 'assignee',
    priority: 'priority',
    title: 'title',
  };
  for (const field of tracked) {
    if (patch[field] !== undefined && patch[field] !== issue[field]) {
      logActivity(ctx, issue.id, kinds[field], issue[field], patch[field] ?? null);
    }
  }

  if (patch.status && patch.status !== issue.status) {
    issue.order = columnOf(ctx.db, issue.projectId, patch.status).length;
  }
  Object.assign(issue, patch, patch.title !== undefined ? { title: patch.title.trim() } : {});
  issue.updatedAt = ctx.now();
  return issue;
});

/** Move an issue to `status` at position `index`, re-numbering the affected columns. */
route('POST', '/api/issues/:issueId/move', (ctx) => {
  requireUser(ctx);
  const issue = findIssue(ctx, ctx.params['issueId']);
  const { status, index } = ctx.body as { status: IssueStatus; index: number };
  const previousStatus = issue.status;

  const target = columnOf(ctx.db, issue.projectId, status, issue.id);
  const clamped = Math.max(0, Math.min(index, target.length));
  target.splice(clamped, 0, issue);
  target.forEach((i, position) => (i.order = position));

  if (previousStatus !== status) {
    columnOf(ctx.db, issue.projectId, previousStatus, issue.id).forEach((i, position) => (i.order = position));
    logActivity(ctx, issue.id, 'status', previousStatus, status);
    issue.status = status;
  }
  issue.updatedAt = ctx.now();
  return ctx.db.issues.filter((i) => i.projectId === issue.projectId);
});

route('DELETE', '/api/issues/:issueId', (ctx) => {
  requireUser(ctx);
  const issue = findIssue(ctx, ctx.params['issueId']);
  ctx.db.issues = ctx.db.issues.filter((i) => i.id !== issue.id);
  ctx.db.comments = ctx.db.comments.filter((c) => c.issueId !== issue.id);
  ctx.db.activity = ctx.db.activity.filter((a) => a.issueId !== issue.id);
  columnOf(ctx.db, issue.projectId, issue.status).forEach((i, position) => (i.order = position));
  return null;
});

// ---------------------------------------------------------------- comments & activity

route('GET', '/api/issues/:issueId/comments', (ctx) => {
  findIssue(ctx, ctx.params['issueId']);
  return ctx.db.comments
    .filter((c) => c.issueId === ctx.params['issueId'])
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
});

route('POST', '/api/issues/:issueId/comments', (ctx) => {
  const authorId = requireUser(ctx);
  const issue = findIssue(ctx, ctx.params['issueId']);
  const body = String(ctx.body?.body ?? '').trim();
  if (!body) throw new ApiError(400, 'Comment cannot be empty');

  const comment: Comment = { id: ctx.nextId('cmt'), issueId: issue.id, authorId, body, createdAt: ctx.now() };
  ctx.db.comments.push(comment);
  logActivity(ctx, issue.id, 'comment');
  return comment;
});

route('GET', '/api/issues/:issueId/activity', (ctx) => {
  findIssue(ctx, ctx.params['issueId']);
  return ctx.db.activity
    .filter((a) => a.issueId === ctx.params['issueId'])
    .sort((a, b) => a.at.localeCompare(b.at));
});
