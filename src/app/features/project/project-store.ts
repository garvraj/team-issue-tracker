import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, forkJoin, tap } from 'rxjs';
import { Api, errorMessage } from '../../core/api';
import { Users } from '../../core/auth';
import { EMPTY_FILTER, IssueFilter, filterIssues } from '../../core/issue-filter';
import { ISSUE_STATUSES, Issue, IssuePatch, IssueStatus, Label, NewIssue, Project, User } from '../../core/models';

/**
 * State for one open project, shared by the board, list and issue views.
 * Provided by `ProjectPage`, so each visit to a project gets a fresh store.
 */
@Injectable()
export class ProjectStore {
  private readonly api = inject(Api);
  private readonly users = inject(Users);

  readonly project = signal<Project | null>(null);
  readonly issues = signal<Issue[]>([]);
  readonly labels = signal<Label[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal<IssueFilter>(EMPTY_FILTER);

  readonly members = computed<User[]>(() => {
    const ids = this.project()?.memberIds ?? [];
    return this.users.all().filter((u) => ids.includes(u.id));
  });

  readonly filteredIssues = computed(() => filterIssues(this.issues(), this.filter(), this.project()?.key));

  readonly columns = computed(() => {
    const issues = this.filteredIssues();
    return ISSUE_STATUSES.map((status) => ({
      ...status,
      issues: issues.filter((i) => i.status === status.value).sort((a, b) => a.order - b.order),
    }));
  });

  load(projectId: string): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      project: this.api.project(projectId),
      issues: this.api.issues(projectId),
      labels: this.api.labels(),
    }).subscribe({
      next: ({ project, issues, labels }) => {
        this.project.set(project);
        this.issues.set(issues);
        this.labels.set(labels);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  issueKey(issue: Pick<Issue, 'number'>): string {
    return `${this.project()?.key ?? ''}-${issue.number}`;
  }

  issueById(id: string): Issue | undefined {
    return this.issues().find((i) => i.id === id);
  }

  labelById(id: string): Label | undefined {
    return this.labels().find((l) => l.id === id);
  }

  setFilter(patch: Partial<IssueFilter>): void {
    this.filter.update((f) => ({ ...f, ...patch }));
  }

  clearFilter(): void {
    this.filter.set(EMPTY_FILTER);
  }

  createIssue(input: NewIssue): Observable<Issue> {
    return this.api
      .createIssue(this.project()!.id, input)
      .pipe(tap((issue) => this.issues.update((list) => [...list, issue])));
  }

  updateIssue(id: string, patch: IssuePatch): Observable<Issue> {
    return this.api.updateIssue(id, patch).pipe(tap((issue) => this.replace(issue)));
  }

  deleteIssue(id: string): Observable<null> {
    return this.api.deleteIssue(id).pipe(tap(() => this.issues.update((list) => list.filter((i) => i.id !== id))));
  }

  /**
   * Optimistically moves an issue on the board, then reconciles with the
   * server's ordering (or rolls back if the request fails).
   *
   * `index` is relative to the full column, not the filtered view.
   */
  moveIssue(id: string, status: IssueStatus, index: number): void {
    const snapshot = this.issues();
    const moving = snapshot.find((i) => i.id === id);
    if (!moving) return;

    const target = snapshot
      .filter((i) => i.status === status && i.id !== id)
      .sort((a, b) => a.order - b.order);
    target.splice(index, 0, { ...moving, status });
    const reordered = new Map(target.map((issue, order) => [issue.id, { ...issue, order }]));
    this.issues.set(snapshot.map((i) => reordered.get(i.id) ?? i));

    this.api.moveIssue(id, status, index).subscribe({
      next: (issues) => this.issues.set(issues),
      error: (e) => {
        this.issues.set(snapshot);
        this.error.set(`Could not move issue: ${errorMessage(e)}`);
      },
    });
  }

  private replace(issue: Issue): void {
    this.issues.update((list) => list.map((i) => (i.id === issue.id ? issue : i)));
  }
}
