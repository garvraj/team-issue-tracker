import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Issue } from '../../core/models';
import { IssueFormDialog } from './issue-form-dialog';
import { ProjectStore } from './project-store';

@Component({
  selector: 'app-project-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IssueFormDialog],
  providers: [ProjectStore],
  template: `
    @if (store.project(); as project) {
      <header>
        <div class="title">
          <a routerLink="/projects" class="muted crumb">Projects /</a>
          <h1>{{ project.name }}</h1>
          <span class="key">{{ project.key }}</span>
        </div>
        <nav class="tabs" aria-label="Project views">
          <a routerLink="board" routerLinkActive="active">Board</a>
          <a routerLink="list" routerLinkActive="active">List</a>
        </nav>
        <button type="button" class="primary" (click)="creating.set(true)">New issue</button>
      </header>
    }

    @if (store.error(); as error) {
      <p class="error banner" role="alert">
        {{ error }}
        <button type="button" class="link" (click)="store.error.set(null)">Dismiss</button>
      </p>
    }

    @if (store.loading()) {
      <p class="muted">Loading project…</p>
    } @else if (store.project()) {
      <router-outlet />
    }

    @if (creating()) {
      <app-issue-form-dialog (created)="openIssue($event)" (closed)="creating.set(false)" />
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-height: 0;
    }
    header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
    }
    .title {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-right: auto;
    }
    .crumb {
      text-decoration: none;
    }
    h1 {
      margin: 0;
      font-size: 22px;
    }
    .key {
      font-family: var(--mono);
      font-size: 12px;
      color: var(--text-muted);
    }
    .tabs {
      display: flex;
      gap: 4px;
      padding: 3px;
      border-radius: 8px;
      background: var(--surface-2);
    }
    .tabs a {
      padding: 4px 12px;
      border-radius: 6px;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 14px;
    }
    .tabs a.active {
      background: var(--surface);
      color: var(--text);
      box-shadow: 0 1px 2px rgb(0 0 0 / 0.1);
    }
    .banner {
      display: flex;
      gap: 12px;
      align-items: center;
    }
  `,
})
export class ProjectPage {
  readonly projectId = input.required<string>();

  protected readonly store = inject(ProjectStore);
  protected readonly creating = signal(false);
  private readonly router = inject(Router);

  constructor() {
    effect(() => this.store.load(this.projectId()));
  }

  protected openIssue(issue: Issue): void {
    void this.router.navigate(['/projects', issue.projectId, 'issues', issue.id]);
  }
}
