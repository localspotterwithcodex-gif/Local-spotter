# LocalSpotter Backend API

Production-ready NestJS backend service for **LocalSpotter.nl**, designed to serve the Next.js web application as well as future Android and iOS mobile clients.

---

## Tech Stack

- **Framework**: NestJS (TypeScript, Node.js)
- **Database**: PostgreSQL (Prisma ORM)
- **API Standard**: REST with `/api/v1` global prefix
- **Documentation**: Swagger OpenAPI (`/api/v1/docs`)
- **Authentication**: Passport JWT & bcrypt password hashing
- **Validation**: `class-validator` & `class-transformer`

---

## Directory Structure

```
backend/
├── src/
│   ├── main.ts                   # Application entrypoint & Swagger setup
│   ├── app.module.ts              # Root NestJS module
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts       # Global Prisma module
│   │   └── prisma.service.ts      # PrismaClient wrapper
│   │
│   ├── health/
│   │   ├── health.controller.ts   # System & DB health endpoint (/api/v1/health)
│   │   └── health.module.ts       # Health check module
│   │
│   ├── common/                    # Shared guards, decorators, filters & pipes
│   └── [feature-modules]/         # Future auth, users, businesses, products, etc.
│
├── prisma/
│   ├── schema.prisma              # Complete PostgreSQL database schema
│   └── seed.ts                    # Development database seed script
│
├── .env.example                   # Environment configuration template
├── package.json                   # Dependencies & build scripts
└── tsconfig.json                  # TypeScript compiler settings
```

---

## Getting Started

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure your PostgreSQL database URL:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/localspotter?schema=public"
```

### 3. Generate Prisma Client & Migrate

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Seed Development Data

```bash
npm run prisma:seed
```

This seeds initial accounts:
- **Super Admin**: `admin@localspotter.nl` (Password: `Password123!`)
- **Business Owner**: `eigenaar@boetiek-amsterdam.nl` (Password: `Password123!`)
- **Consumer**: `sophie.vis@example.nl` (Password: `Password123!`)
- **Subscription Plans**: Webshop (€50/m), Shoproutes (€100/m), Workshop (€150/m)

### 5. Run Server

```bash
# Development mode
npm run start:dev

# Production build & run
npm run build
npm run start:prod
```

---

## API Endpoints

- **Health Check**: `GET /api/v1/health`
- **Swagger Documentation**: `http://localhost:4000/api/v1/docs`

---

## Status & Progress

- [x] **Backend Phase A**: NestJS setup, Prisma PostgreSQL schema, seed script, health endpoint, Swagger documentation.
- [ ] **Backend Phase B**: Auth module (JWT, Login, Register, RBAC guards).
- [ ] **Backend Phase C**: Business & Subscription modules.
- [ ] **Backend Phase D**: Product & Variant modules.
- [ ] **Backend Phase E**: Commerce & Order modules.
- [ ] **Backend Phase F**: Payment & Payout modules.
- [ ] **Backend Phase G**: Workshop & Booking modules.
- [ ] **Backend Phase H**: Shoproutes & GPS modules.
- [ ] **Backend Phase I**: Social, Reviews & Follower modules.
- [ ] **Backend Phase J**: Admin moderation & reporting APIs.
