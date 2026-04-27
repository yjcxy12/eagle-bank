# Eagle Bank API

A REST API for a fictional bank built with Fastify, TypeScript, PostgreSQL and Drizzle ORM.

## Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Fastify
- **Database**: PostgreSQL (via Docker)
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Auth**: JWT (`@fastify/jwt`)
- **Testing**: Vitest (integration tests against a real test DB)
- **Linting/Formatting**: Biome (TS), Prettier (YAML)

## Prerequisites

- Node.js 20+
- Docker

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

### 3. Start Postgres

```bash
docker compose up -d
```

This creates two databases automatically:
- `eagle_bank` — application database
- `eagle_bank_test` — test database

### 4. Run migrations and seed

```bash
npm run db:setup
```

This runs migrations and seeds the database with two test users:

| Email | Password |
|---|---|
| alice@example.com | password123 |
| bob@example.com | password123 |

### 5. Start the dev server

```bash
npm run dev
```

Server runs at `http://localhost:3000`.

## API

See [`openapi.yaml`](./openapi.yaml) for the full API specification.

### Authentication

All endpoints except `POST /v1/users` require a Bearer token.

```bash
# Login to get a token
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}'
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled server |
| `npm test` | Run integration tests |
| `npm run db:setup` | Run migrations + seed |
| `npm run db:migrate` | Run migrations only |
| `npm run db:generate` | Generate migrations from schema changes |
| `npm run db:seed` | Seed the database |
| `npm run check` | Format and lint all files |

## Running Tests

Tests use a real Postgres test database (`eagle_bank_test`). Migrations are applied automatically before the test suite runs.

```bash
npm test
```
