# LocalSpotter

Marketplace connecting local shops with consumers: webshop, shop routes, workshops.

* `frontend/` — Next.js 16 / React 19 / Tailwind 4 (consumer, business-owner and admin portals)
* `backend/` — NestJS 10 / Prisma 5 / PostgreSQL (REST API under `/api/v1`)
* `docs/` — specifications, `PROJECT-HEALTH-AUDIT.md`, `DECISIONS-AND-CONFLICTS.md`, `IMPLEMENTATION-STATUS.md`, `REPAIR-CHANGELOG.md`

## Local setup
```bash
# 1. Database (PostgreSQL) + backend
cd backend
cp .env.example .env        # set DATABASE_URL and a JWT_SECRET of 32+ random characters
npm install
npx prisma generate
npx prisma migrate deploy   # forward-only migrations; never reset a shared database
npm run prisma:seed         # DEV ONLY – creates well-known demo accounts
npm run start:dev           # http://localhost:4000/api/v1 (Swagger at /api/v1/docs)

# 2. Frontend
cd ../frontend
cp .env.example .env.local  # BACKEND_URL=http://localhost:4000
npm install
npm run dev                 # http://localhost:3000  (calls /api/v1, proxied to BACKEND_URL)
```
Local verification codes / reset links are written to `backend/.dev-outbox/` (`MAIL_TRANSPORT=dev-file`); production needs a real mail provider.

## Checks
```bash
cd backend  && npx prisma validate && npm test && npm run build
cd frontend && npm run typecheck && npm run lint && npm test && npm run build
# cross-portal integration tests (disposable PostgreSQL only):
cd backend  && npm run db:test:status && npm run db:test:migrate && npm run test:e2e   # isolated test DB only
cd backend  && npm run db:prod:status                  # READ-ONLY check of the application DB
```
Data lives only in PostgreSQL. See `docs/REPAIR-CHANGELOG.md` for known limitations and open owner decisions.
