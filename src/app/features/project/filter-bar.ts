import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { UNASSIGNED, isFilterActive } from '../../core/issue-filter';
import { ISSUE_PRIORITIES, ISSUE_TYPES } from '../../core/models';
import { ProjectStore } from './project-store';

@Component({
  selector: 'app-filter-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar" role="search">
      <input
        type="search"
        placeholder="Search issues…"
        aria-label="Search issues"
        [value]="filter().text"
        (input)="store.setFilter({ text: $any($event.target).value })"
      />
      <select aria-label="Assignee" [value]="filter().assigneeId ?? ''" (change)="store.setFilter({ assigneeId: valueOf($event) })">
        <option value="">Any assignee</option>
        <option [value]="unassigned">Unassigned</option>
        @for (user of store.members(); track user.id) {
          <option [value]="user.id">{{ user.name }}</option>
        }
      </select>
      <select aria-label="Label" [value]="filter().labelId ?? ''" (change)="store.setFilter({ labelId: valueOf($event) })">
        <option value="">Any label</option>
        @for (label of store.labels(); track label.id) {
          <option [value]="label.id">{{ label.name }}</option>
        }
      </select>
      <select
        aria-label="Priority"
        [value]="filter().priority ?? ''"
        (change)="store.setFilter({ priority: $any(valueOf($event)) })"
      >
        <option value="">Any priority</option>
        @for (p of priorities; track p.value) {
          <option [value]="p.value">{{ p.label }}</option>
        }
      </select>
      <select
        aria-label="Type"
        [value]="filter().type ?? ''"
        (change)="store.setFilter({ type: $any(valueOf($event)) })"
      >
        <option value="">Any type</option>
        @for (t of types; track t.value) {
          <option [value]="t.value">{{ t.label }}</option>
        }
      </select>
      @if (active()) {
        <button type="button" class="link" (click)="store.clearFilter()">Clear filters</button>
        <span class="muted count">{{ store.filteredIssues().length }} of {{ store.issues().length }}</span>
      }
    </div>
  `,
  styles: `
    .bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    input {
      flex: 1 1 200px;
      max-width: 280px;
    }
    .count {
      font-size: 13px;
    }
  `,
})
export class FilterBar {
  protected readonly store = inject(ProjectStore);
  protected readonly filter = this.store.filter;
  protected readonly active = computed(() => isFilterActive(this.filter()));
  protected readonly unassigned = UNASSIGNED;
  protected readonly priorities = ISSUE_PRIORITIES;
  protected readonly types = ISSUE_TYPES;

  protected valueOf(event: Event): string | null {
    return (event.target as HTMLSelectElement).value || null;
  }
}
