# GitHub Insights Pro

Production-grade starter architecture for a full-stack analytics app using:
- **Backend**: Node.js + Express + TypeScript
- **Frontend**: Next.js + React + TypeScript
- **Database**: PostgreSQL (`pg`)
- **Auth**: GitHub OAuth
- **Charts**: Recharts

## 1) Folder structure (backend + frontend)

```text
devpulse/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── app.ts
│   │   │   └── routes/
│   │   │       ├── auth.route.ts
│   │   │       ├── health.route.ts
│   │   │       └── insights.route.ts
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   └── env.ts
│   │   ├── data/
│   │   │   └── repositories/
│   │   │       └── github.repository.ts
│   │   ├── services/
│   │   │   └── insights.service.ts
│   │   ├── test/
│   │   │   └── insights.service.test.ts
│   │   └── server.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── insights-chart.tsx
│   ├── lib/
│   │   └── api.ts
│   ├── .env.example
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
├── package.json
└── README.md
```

## 2) Setup commands

```bash
# from repo root
npm install

# configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# run backend + frontend in separate terminals
npm run dev -w backend
npm run dev -w frontend

# quality checks
npm run lint
npm run test
npm run build
```

## 3) Key dependencies

- Backend: `express`, `cors`, `dotenv`, `zod`, `pg`
- Frontend: `next`, `react`, `react-dom`, `recharts`
- Tooling: `typescript`, `tsx`, `@types/*`

## 4) Initial boilerplate code

- **API layer**: Express routes in `backend/src/api/routes/*`
- **Services layer**: domain logic in `backend/src/services/insights.service.ts`
- **Data layer**: GitHub API repository abstraction in `backend/src/data/repositories/github.repository.ts`
- **Environment config**: validated env in `backend/src/config/env.ts` and frontend `.env.example`
- **OAuth flow**: `GET /api/auth/github/login` and `GET /api/auth/github/callback`
- **Charts UI**: Recharts line chart in `frontend/components/insights-chart.tsx`

## 5) GitHub GraphQL integration API

All endpoints require `Authorization: Bearer <github_access_token>`.

### `GET /api/github/profile`
Returns normalized authenticated user profile.

Example response:

```json
{
  "source": "github",
  "fetchedAt": "2026-04-20T11:00:00.000Z",
  "data": {
    "id": "MDQ6VXNlcjE=",
    "username": "octocat",
    "displayName": "The Octocat",
    "avatarUrl": "https://avatars.githubusercontent.com/u/1?v=4",
    "profileUrl": "https://github.com/octocat",
    "bio": "GitHub mascot",
    "email": null,
    "company": "@github",
    "location": "San Francisco",
    "followers": 100,
    "following": 5,
    "createdAt": "2011-01-25T18:44:36Z"
  }
}
```

### `GET /api/github/repositories`
Returns all repositories for the authenticated user with pagination handled internally.

Example response:

```json
{
  "source": "github",
  "fetchedAt": "2026-04-20T11:00:00.000Z",
  "data": [
    {
      "id": "R_kgDOExample",
      "name": "devpulse",
      "fullName": "octocat/devpulse",
      "description": "Analytics app",
      "url": "https://github.com/octocat/devpulse",
      "visibility": "public",
      "stars": 42,
      "forks": 7,
      "primaryLanguage": "TypeScript",
      "updatedAt": "2026-04-18T10:12:00Z",
      "createdAt": "2025-11-01T09:00:00Z"
    }
  ]
}
```

### `GET /api/github/commits`
Returns normalized commit history for the last 90 days across user repositories.

Example response:

```json
{
  "source": "github",
  "fetchedAt": "2026-04-20T11:00:00.000Z",
  "data": {
    "lookbackDays": 90,
    "totalCount": 1,
    "items": [
      {
        "id": "abc123",
        "repository": "octocat/devpulse",
        "committedAt": "2026-04-15T08:20:00Z",
        "message": "Add github integration service",
        "url": "https://github.com/octocat/devpulse/commit/abc123",
        "authorName": "The Octocat",
        "authorLogin": "octocat"
      }
    ]
  }
}
```

### `GET /api/github/work-items`
Returns normalized pull requests and issues with pagination handled internally.

Example response:

```json
{
  "source": "github",
  "fetchedAt": "2026-04-20T11:00:00.000Z",
  "data": {
    "pullRequests": [
      {
        "id": "PR_1",
        "type": "pull_request",
        "number": 12,
        "repository": "octocat/devpulse",
        "title": "Improve backend API",
        "url": "https://github.com/octocat/devpulse/pull/12",
        "state": "OPEN",
        "createdAt": "2026-04-10T12:00:00Z",
        "updatedAt": "2026-04-12T12:00:00Z",
        "closedAt": null,
        "mergedAt": null
      }
    ],
    "issues": [
      {
        "id": "I_1",
        "type": "issue",
        "number": 21,
        "repository": "octocat/devpulse",
        "title": "Fix dashboard bug",
        "url": "https://github.com/octocat/devpulse/issues/21",
        "state": "CLOSED",
        "createdAt": "2026-04-02T08:00:00Z",
        "updatedAt": "2026-04-03T08:30:00Z",
        "closedAt": "2026-04-03T08:30:00Z",
        "mergedAt": null
      }
    ]
  }
}
```

Rate limit errors are returned as `429`:

```json
{
  "error": "GitHub API rate limit exceeded",
  "resetAt": "2026-04-20T12:00:00.000Z"
}
```
