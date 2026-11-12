import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Session, Users } from '../../core/auth';
import { Avatar } from '../../shared/ui';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar],
  template: `
    <div class="login">
      <h1>Team Issue Tracker</h1>
      <p class="muted">This is a demo with mock data. Pick a teammate to sign in as.</p>
      <ul class="users">
        @for (user of users.all(); track user.id) {
          <li>
            <button type="button" (click)="signIn(user.id)">
              <app-avatar [user]="user" [size]="36" />
              <span>
                <strong>{{ user.name }}</strong>
                <small class="muted">{{ user.email }} · {{ user.role }}</small>
              </span>
            </button>
          </li>
        } @empty {
          <li class="muted">Loading users…</li>
        }
      </ul>
    </div>
  `,
  styles: `
    .login {
      max-width: 420px;
      margin: 10vh auto;
      padding: 0 16px;
    }
    h1 {
      margin-bottom: 4px;
    }
    .users {
      list-style: none;
      padding: 0;
      margin-top: 24px;
      display: grid;
      gap: 8px;
    }
    button {
      display: flex;
      gap: 12px;
      align-items: center;
      width: 100%;
      padding: 10px 12px;
      text-align: left;
    }
    button span {
      display: grid;
    }
  `,
})
export class LoginPage {
  protected readonly users = inject(Users);
  private readonly session = inject(Session);
  private readonly router = inject(Router);

  signIn(userId: string): void {
    this.session.signIn(userId);
    void this.router.navigateByUrl('/projects');
  }
}
