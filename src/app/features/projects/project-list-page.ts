import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { Users } from '../../core/auth';
import { Avatar } from '../../shared/ui';

@Component({
  selector: 'app-project-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Avatar],
  template: `
    <h1>Projects</h1>
    @if (projects(); as list) {
      <div class="grid">
        @for (project of list; track project.id) {
          <a class="card" [routerLink]="['/projects', project.id]">
            <div class="head">
              <span class="key">{{ project.key }}</span>
              <h2>{{ project.name }}</h2>
            </div>
            <p class="muted">{{ project.description }}</p>
            <div class="foot">
              <span class="muted">{{ project.openIssueCount }} open · {{ project.totalIssueCount }} total</span>
              <span class="members">
                @for (id of project.memberIds; track id) {
                  <app-avatar [user]="users.byId(id)" [size]="22" />
                }
              </span>
            </div>
          </a>
        }
      </div>
    } @else {
      <p class="muted">Loading projects…</p>
    }
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
      color: inherit;
      text-decoration: none;
      transition: border-color 0.15s;
    }
    .card:hover {
      border-color: var(--accent);
    }
    .head {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    h2 {
      font-size: 16px;
      margin: 0;
    }
    .key {
      font-family: var(--mono);
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--surface-2);
    }
    p {
      margin: 0;
      flex: 1;
    }
    .foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .members {
      display: flex;
    }
    .members app-avatar {
      display: flex;
      border-radius: 50%;
      box-shadow: 0 0 0 2px var(--surface);
    }
    .members app-avatar + app-avatar {
      margin-left: -6px;
    }
  `,
})
export class ProjectListPage {
  protected readonly users = inject(Users);
  protected readonly projects = toSignal(inject(Api).projects());
}
