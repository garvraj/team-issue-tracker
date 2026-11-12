import { Routes } from '@angular/router';
import { signedInGuard } from './core/auth';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login-page').then((m) => m.LoginPage) },
  {
    path: '',
    canActivate: [signedInGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'projects' },
      {
        path: 'projects',
        loadComponent: () => import('./features/projects/project-list-page').then((m) => m.ProjectListPage),
      },
      {
        path: 'projects/:projectId',
        loadComponent: () => import('./features/project/project-page').then((m) => m.ProjectPage),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'board' },
          { path: 'board', loadComponent: () => import('./features/project/board-page').then((m) => m.BoardPage) },
          { path: 'list', loadComponent: () => import('./features/project/list-page').then((m) => m.ListPage) },
          {
            path: 'issues/:issueId',
            loadComponent: () => import('./features/project/issue-detail-page').then((m) => m.IssueDetailPage),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'projects' },
];
