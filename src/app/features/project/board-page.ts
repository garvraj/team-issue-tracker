import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Users } from '../../core/auth';
import { Issue, IssueStatus } from '../../core/models';
import { Avatar, LabelChip, PriorityIcon, TypeIcon } from '../../shared/ui';
import { FilterBar } from './filter-bar';
import { ProjectStore } from './project-store';

/**
 * Converts a drop position in the (possibly filtered) visible column into a
 * position in the full column, so hidden issues keep their relative order.
 */
export function toFullColumnIndex(fullColumn: readonly Issue[], visible: readonly Issue[], movedId: string, visibleIndex: number): number {
  const full = fullColumn.filter((i) => i.id !== movedId);
  const shown = visible.filter((i) => i.id !== movedId);
  if (visibleIndex < shown.length) return full.findIndex((i) => i.id === shown[visibleIndex].id);
  if (shown.length === 0) return full.length;
  return full.findIndex((i) => i.id === shown[shown.length - 1].id) + 1;
}

@Component({
  selector: 'app-board-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDropListGroup, CdkDropList, CdkDrag, RouterLink, FilterBar, Avatar, LabelChip, PriorityIcon, TypeIcon],
  template: `
    <app-filter-bar />
    <div class="board" cdkDropListGroup>
      @for (column of store.columns(); track column.value) {
        <section class="column">
          <h2>
            {{ column.label }}
            <span class="count">{{ column.issues.length }}</span>
          </h2>
          <div
            class="cards"
            cdkDropList
            [id]="column.value"
            [cdkDropListData]="column.issues"
            (cdkDropListDropped)="drop($event, column.value)"
          >
            @for (issue of column.issues; track issue.id) {
              <a class="card" cdkDrag [cdkDragData]="issue" [routerLink]="['../issues', issue.id]">
                <div class="meta">
                  <app-type-icon [value]="issue.type" />
                  <span class="key">{{ store.issueKey(issue) }}</span>
                  <app-priority [value]="issue.priority" />
                </div>
                <p class="title">{{ issue.title }}</p>
                <div class="foot">
                  <span class="labels">
                    @for (id of issue.labelIds; track id) {
                      @if (store.labelById(id); as label) {
                        <app-label-chip [label]="label" />
                      }
                    }
                  </span>
                  <app-avatar [user]="users.byId(issue.assigneeId)" [size]="22" />
                </div>
              </a>
            } @empty {
              <p class="empty muted">No issues</p>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: 16px;
    }
    .board {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(260px, 1fr);
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 8px;
    }
    .column {
      display: flex;
      flex-direction: column;
      min-height: 60vh;
      border-radius: 10px;
      background: var(--surface-2);
    }
    h2 {
      display: flex;
      justify-content: space-between;
      margin: 0;
      padding: 12px 12px 8px;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }
    .count {
      font-weight: 400;
    }
    .cards {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 0 8px 12px;
    }
    .card {
      display: grid;
      gap: 6px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      color: inherit;
      text-decoration: none;
      cursor: grab;
    }
    .card:hover {
      border-color: var(--border-strong);
    }
    .meta,
    .foot {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .foot {
      justify-content: space-between;
    }
    .key {
      font-family: var(--mono);
      font-size: 12px;
      color: var(--text-muted);
      margin-right: auto;
    }
    .title {
      margin: 0;
      font-size: 14px;
      line-height: 1.35;
    }
    .labels {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .empty {
      text-align: center;
      font-size: 13px;
    }
    .cdk-drag-preview {
      box-shadow: 0 8px 24px rgb(0 0 0 / 0.2);
    }
    .cdk-drag-placeholder {
      opacity: 0.35;
    }
    .cdk-drag-animating,
    .cards.cdk-drop-list-dragging .card:not(.cdk-drag-placeholder) {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }
  `,
})
export class BoardPage {
  protected readonly store = inject(ProjectStore);
  protected readonly users = inject(Users);

  protected drop(event: CdkDragDrop<Issue[], Issue[], Issue>, status: IssueStatus): void {
    const issue = event.item.data;
    if (event.previousContainer === event.container && event.previousIndex === event.currentIndex) return;

    const fullColumn = this.store
      .issues()
      .filter((i) => i.status === status)
      .sort((a, b) => a.order - b.order);
    const index = toFullColumnIndex(fullColumn, event.container.data, issue.id, event.currentIndex);
    this.store.moveIssue(issue.id, status, index);
  }
}
