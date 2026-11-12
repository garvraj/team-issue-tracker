import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { Api } from './api';
import { USER_HEADER } from './mock-backend/mock-backend.interceptor';
import { User } from './models';

const STORAGE_KEY = 'tit.userId';

/**
 * Mock sign-in: the "session" is just the id of the chosen user. Kept free of
 * HTTP dependencies so the auth interceptor can inject it without a cycle.
 */
@Injectable({ providedIn: 'root' })
export class Session {
  readonly userId = signal<string | null>(readStoredUserId());
  readonly isSignedIn = computed(() => this.userId() !== null);

  signIn(userId: string): void {
    this.userId.set(userId);
    try {
      localStorage.setItem(STORAGE_KEY, userId);
    } catch {
      // ignore
    }
  }

  signOut(): void {
    this.userId.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

/** Directory of users plus the signed-in user's profile. */
@Injectable({ providedIn: 'root' })
export class Users {
  private readonly session = inject(Session);

  readonly all = toSignal(inject(Api).users(), { initialValue: [] as User[] });
  readonly current = computed(() => this.byId(this.session.userId()) ?? null);

  byId(id: string | null): User | undefined {
    return id ? this.all().find((u) => u.id === id) : undefined;
  }
}

function readStoredUserId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const userId = inject(Session).userId();
  return next(userId ? req.clone({ setHeaders: { [USER_HEADER]: userId } }) : req);
};

export const signedInGuard: CanActivateFn = () =>
  inject(Session).isSignedIn() || inject(Router).createUrlTree(['/login']);
