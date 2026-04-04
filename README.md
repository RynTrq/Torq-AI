# Torq-AI

Torq-AI is an AI-native browser workspace for building, editing, previewing, and exporting software projects from one place.

## Stack

- Next.js 16 + React 19
- Prisma + PostgreSQL
- Auth.js
- Inngest
- AI SDK with Anthropic, Gemini, and OpenAI routing
- WebContainer + host-side runners for file execution

## Features

- Chat-driven project creation
- File explorer with create, rename, delete, and custom file templates
- AI-assisted file generation and code edits
- Preview for web and text-friendly assets
- Local execution for JavaScript, Python, C, C++, and Java
- GitHub import/export
- Light/dark mode and VS Code-inspired workspace styling

## Environment

Copy `.env.example` to `.env.local` and fill in:

```env
# Postgres / Prisma
DATABASE_URL=
DIRECT_URL=

# Auth.js
AUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GITHUB_ID=
GITHUB_SECRET=

# AI providers
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
FIRECRAWL_API_KEY=

# Background jobs
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

Torq-AI accepts either `GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY` for Gemini.

## Local Development

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Run migrations against your local/dev database:

```bash
npm run prisma:migrate
```

Start the app and local Inngest dev server together:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev
npm run dev:web
npm run inngest:dev
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run build
npm run start
npm run lint
```

## Render Deployment

Torq-AI ships with:

- [render.yaml](/Users/raiyaan/Desktop/Padhai%20Likhai/Torq-AI/render.yaml)
- [Dockerfile](/Users/raiyaan/Desktop/Padhai%20Likhai/Torq-AI/Dockerfile)

The Docker image includes Python, GCC, G++, and Java so language runners still work in production.

### 1. Provision services

- PostgreSQL database
- GitHub OAuth app
- Inngest app
- AI provider keys

### 2. Set Render environment variables

```env
DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=
NEXTAUTH_URL=https://your-service.onrender.com
GITHUB_ID=
GITHUB_SECRET=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
FIRECRAWL_API_KEY=
```

### 3. GitHub OAuth callback

Set your GitHub OAuth app callback URL to:

```text
https://your-service.onrender.com/api/auth/callback/github
```

### 4. Inngest production endpoint

Point Inngest at:

```text
https://your-service.onrender.com/api/inngest
```

### 5. Deploy

Render can deploy the repo directly with Docker. The container startup runs:

- Prisma migrations
- the Next.js standalone server

Health check:

```text
/api/health
```

## Database

The Prisma schema lives in:

- [schema.prisma](/Users/raiyaan/Desktop/Padhai%20Likhai/Torq-AI/prisma/schema.prisma)

The initial migration lives in:

- [migration.sql](/Users/raiyaan/Desktop/Padhai%20Likhai/Torq-AI/prisma/migrations/20260404013000_initial/migration.sql)

## Notes

- The app now uses Auth.js + Prisma/Postgres for authentication and data.
- GitHub connection is handled through Auth.js account linking.
- Gemini is the safest default fallback when other model providers are quota-limited.
