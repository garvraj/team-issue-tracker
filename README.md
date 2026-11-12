# Team Issue Tracker

A Kanban-style issue tracker for small teams, built with Angular 21 (standalone components, signals, zoneless change detection).

The app runs entirely in the browser. A mock REST backend, implemented as an HTTP interceptor, serves `/api/*` requests from seed JSON. Changes are saved to `localStorage`, so the app behaves like it has a real server and needs no setup.

## Features

- **Projects:** an overview with open and total issue counts and team members.
- **Board:** drag-and-drop Kanban columns (Backlog → To do → In progress → In review → Done). Updates are optimistic and roll back if the request fails.
- **List view:** a sortable table. Priority and status sort by rank, not alphabetically, and issues without a due date always sort last. Overdue dates are highlighted.
- **Filtering:** text search (title, description or issue key such as `WEB-12`), plus assignee, label, priority and type filters. The filters work in both views.
- **Issue detail:** inline editing, a status/priority/type/assignee/due-date/labels sidebar, comments, and an activity timeline built from server-side change events.
- **Create issue:** a modal form with validation.
- **Mock sign-in:** pick a teammate. The selected user is sent as an `X-User-Id` header and recorded as the reporter or actor.

## Getting started

Requires Node.js 20.19+.

```bash
npm install
npm start          # http://localhost:4200
npm test           # unit tests (Vitest)
npm run build      # production build
```

Use **Reset demo data** in the top bar to discard local changes and reload the seed data.

## Architecture

```
src/app/
├── core/
│   ├── models.ts                 Domain types and enum metadata
│   ├── api.ts                    Typed HTTP client for /api/*
│   ├── auth.ts                   Session (mock sign-in), user directory, auth interceptor, route guard
│   ├── issue-filter.ts           Pure filtering and sorting functions
│   └── mock-backend/
│       ├── mock-db.ts            In-memory DB seeded from public/mock/db.json, persisted to localStorage
│       ├── routes.ts             REST route table and handlers (validation, ordering, activity log)
│       └── mock-backend.interceptor.ts   Serves /api/* with simulated latency
├── features/
│   ├── login/                    Choose a user
│   ├── projects/                 Project overview
│   └── project/                  Per-project shell + board, list, issue detail, create dialog
│       └── project-store.ts      Signal-based state shared by the project's views
└── shared/ui.ts                  Avatar, label chip, priority/type icons, relative-time pipe
```

Key decisions:

- **The mock backend sits behind `HttpClient`.** Components and services only know about a REST API. To move to a real server, remove `mockBackendInterceptor` from `app.config.ts`; nothing else changes.
- **Route handlers are pure functions over a `Db` object.** That lets them be unit-tested without Angular or HTTP (see `routes.spec.ts`).
- **State is scoped to each project.** `ProjectStore` is provided by `ProjectPage`, so every project visit starts with fresh state and child routes share it without global singletons.
- **Board ordering is stored per column.** Each issue has an `order` within its status column. A move re-numbers the source and target columns on the server. With filters active, `toFullColumnIndex` maps the drop position in the visible list to a position in the full column, so hidden issues keep their relative order.

## API (mock)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/users` | All users |
| GET | `/api/labels` | All labels |
| GET | `/api/projects` | Projects with issue counts |
| GET | `/api/projects/:id` | One project |
| GET | `/api/projects/:id/issues` | Issues in a project |
| POST | `/api/projects/:id/issues` | Create an issue |
| GET | `/api/issues/:id` | One issue |
| PATCH | `/api/issues/:id` | Update fields (logs activity for tracked changes) |
| POST | `/api/issues/:id/move` | `{ status, index }`: reorder or change column |
| DELETE | `/api/issues/:id` | Delete with its comments and activity |
| GET/POST | `/api/issues/:id/comments` | List or add comments |
| GET | `/api/issues/:id/activity` | Change history |

## Roadmap

- [ ] Create and edit projects; manage members
- [ ] Label management (create, rename, recolor)
- [ ] Sub-tasks and issue links ("blocks", "duplicates")
- [ ] Markdown rendering and @mentions in comments
- [ ] Sprints/cycles with burndown chart
- [ ] Keyboard shortcuts (`c` to create, `/` to search, `j`/`k` to navigate)
- [ ] Saved filters, with filters synced to the URL query string
- [ ] Role-based permissions (only admins can delete)
- [ ] Notifications for assigned issues
- [ ] Component and end-to-end tests (Playwright)
- [ ] Swap the mock backend for a real API
