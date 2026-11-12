import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Session, Users } from './core/auth';
import { MockDb } from './core/mock-backend/mock-db';
import { Avatar } from './shared/ui';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, Avatar],
  template: `
    @if (users.current(); as user) {
      <header class="topbar">
        <a routerLink="/projects" class="brand">Team Issue Tracker</a>
        <span class="spacer"></span>
        <button type="button" class="link" (click)="resetDemoData()" title="Restore the original mock data">Reset demo data</button>
        <span class="user">
          <app-avatar [user]="user" [size]="28" />
          <span>{{ user.name }}</span>
        </span>
        <button type="button" (click)="signOut()">Switch user</button>
      </header>
    }
    <main>
      <router-outlet />
    </main>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .topbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 24px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    .brand {
      font-weight: 700;
      color: inherit;
      text-decoration: none;
    }
    .spacer {
      flex: 1;
    }
    .user {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    main {
      flex: 1;
      padding: 24px;
      min-width: 0;
    }
    @media (max-width: 600px) {
      .topbar,
      main {
        padding-inline: 16px;
      }
      .user span {
        display: none;
      }
    }
  `,
})
export class App {
  protected readonly users = inject(Users);
  private readonly session = inject(Session);
  private readonly mockDb = inject(MockDb);
  private readonly router = inject(Router);

  protected signOut(): void {
    this.session.signOut();
    void this.router.navigateByUrl('/login');
  }

  protected async resetDemoData(): Promise<void> {
    if (!confirm('Discard all changes and restore the original demo data?')) return;
    await this.mockDb.reset();
    // Reload so every view re-fetches from the fresh data.
    location.reload();
  }
}
