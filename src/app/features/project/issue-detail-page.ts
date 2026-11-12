import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Api, errorMessage } from '../../core/api';
import { Users } from '../../core/auth';
import {
  Activity,
  Comment,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  IssuePatch,
} from '../../core/models';
import { Avatar, LabelChip, RelativeTimePipe, TypeIcon } from '../../shared/ui';
import { ProjectStore } from './project-store';

type TimelineEntry = { kind: 'comment'; at: string; comment: Comment } | { kind: 'activity'; at: string; activity: Activity };

@Component({
  selector: 'app-issue-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, DatePipe, Avatar, LabelChip, TypeIcon, RelativeTimePipe],
  template: `
    @if (issue(); as issue) {
      <div class="layout">
        <article>
          <a routerLink="../../board" class="muted back">← Back to board</a>
          <div class="key"><app-type-icon [value]="issue.type" /> {{ store.issueKey(issue) }}</div>

          @if (editing()) {
            <form class="edit" (ngSubmit)="saveEdits()">
              <input name="title" [ngModel]="draftTitle()" (ngModelChange)="draftTitle.set($event)" aria-label="Title" required />
              <textarea
                name="description"
                [ngModel]="draftDescription()"
                (ngModelChange)="draftDescription.set($event)"
                rows="8"
                aria-label="Description"
              ></textarea>
              <div class="actions">
                <button type="button" (click)="editing.set(false)">Cancel</button>
                <button type="submit" class="primary" [disabled]="!draftTitle().trim()">Save</button>
              </div>
            </form>
          } @else {
            <h1>{{ issue.title }}</h1>
            <p class="description" [class.muted]="!issue.description">{{ issue.description || 'No description.' }}</p>
            <button type="button" (click)="startEditing()">Edit</button>
          }

          <h2>Activity</h2>
          <ol class="timeline">
            @for (entry of timeline(); track $index) {
              @if (entry.kind === 'comment') {
                <li class="comment">
                  <app-avatar [user]="users.byId(entry.comment.authorId)" [size]="28" />
                  <div>
                    <div class="who">
                      <strong>{{ users.byId(entry.comment.authorId)?.name }}</strong>
                      <span class="muted" [title]="entry.at | date: 'medium'">{{ entry.at | relativeTime }}</span>
                    </div>
                    <p>{{ entry.comment.body }}</p>
                  </div>
                </li>
              } @else {
                <li class="event muted">
                  <strong>{{ users.byId(entry.activity.actorId)?.name }}</strong>
                  {{ describe(entry.activity) }}
                  <span [title]="entry.at | date: 'medium'">· {{ entry.at | relativeTime }}</span>
                </li>
              }
            } @empty {
              <li class="muted">{{ timelineLoading() ? 'Loading activity…' : 'No activity yet.' }}</li>
            }
          </ol>

          <form class="new-comment" (ngSubmit)="addComment()">
            <textarea
              name="comment"
              [ngModel]="draftComment()"
              (ngModelChange)="draftComment.set($event)"
              rows="3"
              placeholder="Leave a comment…"
              aria-label="New comment"
            ></textarea>
            <button type="submit" class="primary" [disabled]="!draftComment().trim() || posting()">Comment</button>
          </form>
        </article>

        <aside>
          <label>
            Status
            <select [ngModel]="issue.status" (ngModelChange)="update({ status: $event })">
              @for (s of statuses; track s.value) {
                <option [value]="s.value">{{ s.label }}</option>
              }
            </select>
          </label>
          <label>
            Priority
            <select [ngModel]="issue.priority" (ngModelChange)="update({ priority: $event })">
              @for (p of priorities; track p.value) {
                <option [value]="p.value">{{ p.label }}</option>
              }
            </select>
          </label>
          <label>
            Type
            <select [ngModel]="issue.type" (ngModelChange)="update({ type: $event })">
              @for (t of types; track t.value) {
                <option [value]="t.value">{{ t.label }}</option>
              }
            </select>
          </label>
          <label>
            Assignee
            <select [ngModel]="issue.assigneeId ?? ''" (ngModelChange)="update({ assigneeId: $event || null })">
              <option value="">Unassigned</option>
              @for (user of store.members(); track user.id) {
                <option [value]="user.id">{{ user.name }}</option>
              }
            </select>
          </label>
          <label>
            Due date
            <input type="date" [ngModel]="issue.dueDate ?? ''" (ngModelChange)="update({ dueDate: $event || null })" />
          </label>
          <div class="field">
            <span>Labels</span>
            <div class="labels">
              @for (label of store.labels(); track label.id) {
                <button
                  type="button"
                  class="label-toggle"
                  [class.on]="issue.labelIds.includes(label.id)"
                  [attr.aria-pressed]="issue.labelIds.includes(label.id)"
                  (click)="toggleLabel(label.id)"
                >
                  <app-label-chip [label]="label" />
                </button>
              }
            </div>
          </div>
          <dl>
            <dt>Reporter</dt>
            <dd>{{ users.byId(issue.reporterId)?.name }}</dd>
            <dt>Created</dt>
            <dd>{{ issue.createdAt | date: 'medium' }}</dd>
            <dt>Updated</dt>
            <dd>{{ issue.updatedAt | date: 'medium' }}</dd>
          </dl>
          <button type="button" class="danger" (click)="deleteIssue()">Delete issue</button>
        </aside>
      </div>
    } @else {
      <p class="muted">Issue not found. <a routerLink="../../board">Back to board</a></p>
    }
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 260px;
      gap: 32px;
    }
    @media (max-width: 800px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
    .back {
      font-size: 13px;
      text-decoration: none;
    }
    .key {
      margin-top: 12px;
      font-family: var(--mono);
      font-size: 13px;
      color: var(--text-muted);
    }
    h1 {
      margin: 4px 0 12px;
    }
    .description {
      white-space: pre-wrap;
      line-height: 1.5;
    }
    .edit,
    .new-comment {
      display: grid;
      gap: 8px;
    }
    .actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    h2 {
      margin-top: 32px;
      font-size: 16px;
    }
    .timeline {
      list-style: none;
      padding: 0;
      display: grid;
      gap: 12px;
    }
    .comment {
      display: flex;
      gap: 10px;
    }
    .comment > div {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
    }
    .comment p {
      margin: 4px 0 0;
      white-space: pre-wrap;
    }
    .who {
      display: flex;
      gap: 8px;
      font-size: 13px;
    }
    .event {
      font-size: 13px;
      padding-left: 38px;
    }
    .new-comment button {
      justify-self: end;
    }
    aside {
      display: grid;
      align-content: start;
      gap: 12px;
    }
    label,
    .field {
      display: grid;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .labels {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .label-toggle {
      all: unset;
      cursor: pointer;
      opacity: 0.4;
    }
    .label-toggle.on {
      opacity: 1;
    }
    .label-toggle:focus-visible {
      outline: 2px solid var(--accent);
      border-radius: 999px;
    }
    dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 12px;
      font-size: 13px;
      margin: 8px 0;
    }
    dt {
      color: var(--text-muted);
    }
    dd {
      margin: 0;
    }
  `,
})
export class IssueDetailPage {
  readonly issueId = input.required<string>();

  protected readonly store = inject(ProjectStore);
  protected readonly users = inject(Users);
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  protected readonly statuses = ISSUE_STATUSES;
  protected readonly priorities = ISSUE_PRIORITIES;
  protected readonly types = ISSUE_TYPES;

  protected readonly issue = computed(() => this.store.issueById(this.issueId()));
  private readonly comments = signal<Comment[]>([]);
  private readonly activity = signal<Activity[]>([]);
  protected readonly timeline = computed<TimelineEntry[]>(() =>
    [
      ...this.comments().map((comment) => ({ kind: 'comment' as const, at: comment.createdAt, comment })),
      // Comments already appear in full, so skip their "commented" events.
      ...this.activity()
        .filter((activity) => activity.kind !== 'comment')
        .map((activity) => ({ kind: 'activity' as const, at: activity.at, activity })),
    ].sort((a, b) => a.at.localeCompare(b.at)),
  );

  protected readonly timelineLoading = signal(true);
  protected readonly editing = signal(false);
  protected readonly posting = signal(false);
  protected readonly draftTitle = signal('');
  protected readonly draftDescription = signal('');
  protected readonly draftComment = signal('');

  constructor() {
    effect(() => {
      const id = this.issueId();
      untracked(() => this.loadTimeline(id));
    });
  }

  protected startEditing(): void {
    const issue = this.issue()!;
    this.draftTitle.set(issue.title);
    this.draftDescription.set(issue.description);
    this.editing.set(true);
  }

  protected saveEdits(): void {
    if (!this.draftTitle().trim()) return;
    this.update({ title: this.draftTitle().trim(), description: this.draftDescription() });
    this.editing.set(false);
  }

  protected update(patch: IssuePatch): void {
    this.store.updateIssue(this.issueId(), patch).subscribe({
      next: () => this.refreshActivity(),
      error: (e) => this.store.error.set(errorMessage(e)),
    });
  }

  protected toggleLabel(labelId: string): void {
    const current = this.issue()!.labelIds;
    this.update({ labelIds: current.includes(labelId) ? current.filter((id) => id !== labelId) : [...current, labelId] });
  }

  protected addComment(): void {
    const body = this.draftComment().trim();
    if (!body) return;
    this.posting.set(true);
    this.api.addComment(this.issueId(), body).subscribe({
      next: (comment) => {
        this.comments.update((list) => [...list, comment]);
        this.draftComment.set('');
        this.posting.set(false);
      },
      error: (e) => {
        this.store.error.set(errorMessage(e));
        this.posting.set(false);
      },
    });
  }

  protected deleteIssue(): void {
    const issue = this.issue()!;
    if (!confirm(`Delete ${this.store.issueKey(issue)}? This cannot be undone.`)) return;
    this.store.deleteIssue(issue.id).subscribe({
      next: () => void this.router.navigate(['/projects', issue.projectId, 'board']),
      error: (e) => this.store.error.set(errorMessage(e)),
    });
  }

  protected describe(activity: Activity): string {
    const name = (id: string | null) => this.users.byId(id)?.name ?? 'nobody';
    const status = (value: string | null) => ISSUE_STATUSES.find((s) => s.value === value)?.label ?? value;
    switch (activity.kind) {
      case 'created':
        return 'created this issue';
      case 'status':
        return `moved this from ${status(activity.from)} to ${status(activity.to)}`;
      case 'assignee':
        return activity.to ? `assigned this to ${name(activity.to)}` : 'removed the assignee';
      case 'priority':
        return `changed priority from ${activity.from} to ${activity.to}`;
      case 'title':
        return `renamed this from “${activity.from}”`;
      case 'comment':
        return 'commented';
    }
  }

  private loadTimeline(issueId: string): void {
    this.comments.set([]);
    this.activity.set([]);
    this.timelineLoading.set(true);
    forkJoin({ comments: this.api.comments(issueId), activity: this.api.activity(issueId) }).subscribe({
      next: ({ comments, activity }) => {
        this.comments.set(comments);
        this.activity.set(activity);
        this.timelineLoading.set(false);
      },
      error: (e) => {
        this.store.error.set(errorMessage(e));
        this.timelineLoading.set(false);
      },
    });
  }

  private refreshActivity(): void {
    this.api.activity(this.issueId()).subscribe((activity) => this.activity.set(activity));
  }
}
