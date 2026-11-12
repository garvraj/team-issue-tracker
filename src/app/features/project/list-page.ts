import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Users } from '../../core/auth';
import { IssueSort, IssueSortField, sortIssues } from '../../core/issue-filter';
import { ISSUE_STATUSES } from '../../core/models';
import { Avatar, LabelChip, PriorityIcon, RelativeTimePipe, TypeIcon } from '../../shared/ui';
import { FilterBar } from './filter-bar';
import { ProjectStore } from './project-store';

@Component({
  selector: 'app-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, FilterBar, Avatar, LabelChip, PriorityIcon, TypeIcon, RelativeTimePipe],
  template: `
    <app-filter-bar />
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            @for (col of columns; track col.field) {
              <th [attr.aria-sort]="ariaSort(col.field)">
                <button type="button" class="sort" (click)="toggleSort(col.field)">
                  {{ col.label }}
                  @if (sort().field === col.field) {
                    <span aria-hidden="true">{{ sort().direction === 'asc' ? '▲' : '▼' }}</span>
                  }
                </button>
              </th>
            }
            <th>Labels</th>
            <th>Assignee</th>
          </tr>
        </thead>
        <tbody>
          @for (issue of rows(); track issue.id) {
            <tr>
              <td class="key"><app-type-icon [value]="issue.type" /> {{ store.issueKey(issue) }}</td>
              <td class="title">
                <a [routerLink]="['../issues', issue.id]">{{ issue.title }}</a>
              </td>
              <td><span class="status" [attr.data-status]="issue.status">{{ statusLabel(issue.status) }}</span></td>
              <td><app-priority [value]="issue.priority" [showLabel]="true" /></td>
              <td class="muted" [title]="issue.updatedAt | date: 'medium'">{{ issue.updatedAt | relativeTime }}</td>
              <td [class.overdue]="isOverdue(issue.dueDate, issue.status)">{{ issue.dueDate ? (issue.dueDate | date: 'MMM d') : '—' }}</td>
              <td>
                <span class="labels">
                  @for (id of issue.labelIds; track id) {
                    @if (store.labelById(id); as label) {
                      <app-label-chip [label]="label" />
                    }
                  }
                </span>
              </td>
              <td><app-avatar [user]="users.byId(issue.assigneeId)" /></td>
            </tr>
          } @empty {
            <tr>
              <td colspan="8" class="muted empty">No issues match the current filters.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: 16px;
    }
    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th,
    td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    th {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
    tbody tr:hover {
      background: var(--surface-2);
    }
    .sort {
      all: unset;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      color: var(--text-muted);
    }
    .key {
      font-family: var(--mono);
      font-size: 12px;
      color: var(--text-muted);
    }
    .title {
      white-space: normal;
      min-width: 240px;
    }
    .title a {
      color: inherit;
      text-decoration: none;
    }
    .title a:hover {
      text-decoration: underline;
    }
    .status {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--surface-2);
    }
    .status[data-status='in_progress'] {
      background: color-mix(in srgb, var(--accent) 18%, transparent);
    }
    .status[data-status='in_review'] {
      background: color-mix(in srgb, var(--warning) 22%, transparent);
    }
    .status[data-status='done'] {
      background: color-mix(in srgb, var(--success) 20%, transparent);
    }
    .labels {
      display: flex;
      gap: 4px;
    }
    .overdue {
      color: var(--danger);
      font-weight: 500;
    }
    .empty {
      text-align: center;
      padding: 32px;
    }
  `,
})
export class ListPage {
  protected readonly store = inject(ProjectStore);
  protected readonly users = inject(Users);

  protected readonly columns: { field: IssueSortField; label: string }[] = [
    { field: 'number', label: 'ID' },
    { field: 'title', label: 'Title' },
    { field: 'status', label: 'Status' },
    { field: 'priority', label: 'Priority' },
    { field: 'updatedAt', label: 'Updated' },
    { field: 'dueDate', label: 'Due' },
  ];

  protected readonly sort = signal<IssueSort>({ field: 'updatedAt', direction: 'desc' });
  protected readonly rows = computed(() => sortIssues(this.store.filteredIssues(), this.sort()));

  protected toggleSort(field: IssueSortField): void {
    this.sort.update((s) =>
      s.field === field ? { field, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { field, direction: 'asc' },
    );
  }

  protected ariaSort(field: IssueSortField): string | null {
    const s = this.sort();
    if (s.field !== field) return null;
    return s.direction === 'asc' ? 'ascending' : 'descending';
  }

  protected statusLabel(status: string): string {
    return ISSUE_STATUSES.find((s) => s.value === status)?.label ?? status;
  }

  protected isOverdue(dueDate: string | null, status: string): boolean {
    return !!dueDate && status !== 'done' && dueDate < new Date().toISOString().slice(0, 10);
  }
}
