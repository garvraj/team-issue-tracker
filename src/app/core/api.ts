import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Activity,
  Comment,
  Issue,
  IssuePatch,
  IssueStatus,
  Label,
  NewIssue,
  Project,
  ProjectSummary,
  User,
} from './models';

/** Typed client for the issue tracker REST API. */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  users(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }

  labels(): Observable<Label[]> {
    return this.http.get<Label[]>('/api/labels');
  }

  projects(): Observable<ProjectSummary[]> {
    return this.http.get<ProjectSummary[]>('/api/projects');
  }

  project(id: string): Observable<Project> {
    return this.http.get<Project>(`/api/projects/${id}`);
  }

  issues(projectId: string): Observable<Issue[]> {
    return this.http.get<Issue[]>(`/api/projects/${projectId}/issues`);
  }

  createIssue(projectId: string, input: NewIssue): Observable<Issue> {
    return this.http.post<Issue>(`/api/projects/${projectId}/issues`, input);
  }

  updateIssue(id: string, patch: IssuePatch): Observable<Issue> {
    return this.http.patch<Issue>(`/api/issues/${id}`, patch);
  }

  /** Returns every issue in the project, since a move re-orders whole columns. */
  moveIssue(id: string, status: IssueStatus, index: number): Observable<Issue[]> {
    return this.http.post<Issue[]>(`/api/issues/${id}/move`, { status, index });
  }

  deleteIssue(id: string): Observable<null> {
    return this.http.delete<null>(`/api/issues/${id}`);
  }

  comments(issueId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`/api/issues/${issueId}/comments`);
  }

  addComment(issueId: string, body: string): Observable<Comment> {
    return this.http.post<Comment>(`/api/issues/${issueId}/comments`, { body });
  }

  activity(issueId: string): Observable<Activity[]> {
    return this.http.get<Activity[]>(`/api/issues/${issueId}/activity`);
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) return error.error?.message ?? error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}
