import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, output, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage } from '../../core/api';
import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES, Issue, IssuePriority, IssueStatus, IssueType } from '../../core/models';
import { ProjectStore } from './project-store';

@Component({
  selector: 'app-issue-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <dialog #dialog (close)="closed.emit()" (click)="onBackdropClick($event)">
      <form [formGroup]="form" (ngSubmit)="submit()">
        <h2>New issue</h2>

        <label>
          Title
          <input formControlName="title" autocomplete="off" placeholder="Short summary of the problem or task" />
        </label>
        @if (form.controls.title.touched && form.controls.title.invalid) {
          <small class="error">A title is required (max 200 characters).</small>
        }

        <label>
          Description
          <textarea formControlName="description" rows="5" placeholder="Steps to reproduce, context, acceptance criteria…"></textarea>
        </label>

        <div class="row">
          <label>
            Type
            <select formControlName="type">
              @for (t of types; track t.value) {
                <option [value]="t.value">{{ t.label }}</option>
              }
            </select>
          </label>
          <label>
            Status
            <select formControlName="status">
              @for (s of statuses; track s.value) {
                <option [value]="s.value">{{ s.label }}</option>
              }
            </select>
          </label>
          <label>
            Priority
            <select formControlName="priority">
              @for (p of priorities; track p.value) {
                <option [value]="p.value">{{ p.label }}</option>
              }
            </select>
          </label>
        </div>

        <div class="row">
          <label>
            Assignee
            <select formControlName="assigneeId">
              <option value="">Unassigned</option>
              @for (user of store.members(); track user.id) {
                <option [value]="user.id">{{ user.name }}</option>
              }
            </select>
          </label>
          <label>
            Due date
            <input type="date" formControlName="dueDate" />
          </label>
        </div>

        <fieldset>
          <legend>Labels</legend>
          @for (label of store.labels(); track label.id) {
            <label class="check">
              <input type="checkbox" [checked]="selectedLabels().has(label.id)" (change)="toggleLabel(label.id)" />
              {{ label.name }}
            </label>
          }
        </fieldset>

        @if (error(); as message) {
          <p class="error">{{ message }}</p>
        }

        <div class="actions">
          <button type="button" (click)="dialog.close()">Cancel</button>
          <button type="submit" class="primary" [disabled]="saving()">{{ saving() ? 'Creating…' : 'Create issue' }}</button>
        </div>
      </form>
    </dialog>
  `,
  styles: `
    dialog {
      width: min(560px, calc(100vw - 32px));
      padding: 0;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
      color: var(--text);
    }
    dialog::backdrop {
      background: rgb(0 0 0 / 0.4);
    }
    form {
      display: grid;
      gap: 12px;
      padding: 20px;
    }
    h2 {
      margin: 0;
    }
    label {
      display: grid;
      gap: 4px;
      font-size: 13px;
      font-weight: 500;
    }
    .row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }
    fieldset {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 16px;
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 400;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `,
})
export class IssueFormDialog {
  protected readonly store = inject(ProjectStore);
  readonly created = output<Issue>();
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly types = ISSUE_TYPES;
  protected readonly statuses = ISSUE_STATUSES;
  protected readonly priorities = ISSUE_PRIORITIES;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedLabels = signal(new Set<string>());

  protected readonly form = inject(NonNullableFormBuilder).group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    type: ['task' as IssueType],
    status: ['todo' as IssueStatus],
    priority: ['medium' as IssuePriority],
    assigneeId: [''],
    dueDate: [''],
  });

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected toggleLabel(id: string): void {
    this.selectedLabels.update((set) => {
      const next = new Set(set);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.dialog().nativeElement.close();
  }

  protected submit(): void {
    if (this.form.invalid || !this.form.value.title?.trim()) {
      this.form.controls.title.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.store
      .createIssue({
        ...value,
        assigneeId: value.assigneeId || null,
        dueDate: value.dueDate || null,
        labelIds: [...this.selectedLabels()],
      })
      .subscribe({
        next: (issue) => {
          this.created.emit(issue);
          this.dialog().nativeElement.close();
        },
        error: (e) => {
          this.error.set(errorMessage(e));
          this.saving.set(false);
        },
      });
  }
}
