import { Injectable } from '@angular/core';
import { Db } from '../models';

const STORAGE_KEY = 'tit.db.v1';
const SEED_URL = 'mock/db.json';

/**
 * In-memory database seeded from `public/mock/db.json` and persisted to
 * localStorage so changes survive a page reload.
 */
@Injectable({ providedIn: 'root' })
export class MockDb {
  private data: Db | null = null;
  private loading: Promise<Db> | null = null;

  ready(): Promise<Db> {
    if (this.data) return Promise.resolve(this.data);
    this.loading ??= this.load().then((db) => (this.data = db));
    return this.loading;
  }

  /** The loaded database. Only valid after `ready()` has resolved. */
  get db(): Db {
    if (!this.data) throw new Error('MockDb accessed before ready()');
    return this.data;
  }

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage full or unavailable: keep working in memory.
    }
  }

  async reset(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    this.data = null;
    this.loading = null;
    await this.ready();
  }

  nextId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }

  private async load(): Promise<Db> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as Db;
    } catch {
      // Fall through to the seed file.
    }
    const res = await fetch(SEED_URL);
    if (!res.ok) throw new Error(`Failed to load seed data (${res.status})`);
    return (await res.json()) as Db;
  }
}
