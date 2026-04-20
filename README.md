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
