# Torq-AI

Torq-AI is a fully featured **cloud-based AI coding workspace** built with modern web technologies.

Torq-AI is a browser-based development environment inspired by modern AI-native code editors, featuring real-time collaboration, AI-assisted editing, and full-stack project management.

---

## ✨ Features

### 🧠 AI Capabilities

* Real-time code suggestions with ghost text
* Quick Edit (Cmd + K style natural language editing)
* Conversation-based AI assistant
* Context-aware code improvements

### 💻 Code Editor

* Multi-language syntax highlighting (JS, TS, CSS, HTML, JSON, Markdown, Python)
* Line numbers & code folding
* Minimap overview
* Bracket matching & indentation guides
* Multi-cursor editing
* Tab-based file navigation

### 📁 File Management

* File explorer with folder hierarchy
* Create, rename, delete files and folders
* VSCode-style file icons
* Auto-save with debouncing

### ⚡ Real-Time Architecture

* Instant updates powered by Convex
* Optimistic UI updates
* Background job processing via Inngest
* Local and hosted file execution for multiple languages

---

# 🏗 Tech Stack

| Category                | Technologies                                           |
| ----------------------- | ------------------------------------------------------ |
| **Frontend**            | Next.js 16, React 19, TypeScript, Tailwind CSS 4       |
| **Editor**              | CodeMirror 6, Custom Extensions                        |
| **Backend**             | Convex (Real-time Database), Inngest (Background Jobs) |
| **AI**                  | Claude, Gemini, and OpenAI model routing               |
| **Auth**                | Clerk (with GitHub OAuth)                              |
| **UI**                  | shadcn/ui, Radix UI                                    |
| **Execution**           | WebContainer API, xterm.js, host-side runners          |

---

# 📂 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── messages/
│   │   ├── suggestion/
│   │   └── quick-edit/
│   └── projects/
├── components/
│   ├── ui/
│   └── ai-elements/
├── features/
│   ├── auth/
│   ├── conversations/
│   ├── editor/
│   ├── preview/
│   └── projects/
├── inngest/
└── lib/

convex/
├── schema.ts
├── projects.ts
├── files.ts
├── conversations.ts
└── system.ts
```

---

# 🛠 Getting Started

## Prerequisites

* Node.js 20+
* npm or pnpm
* Accounts required:

  * Clerk (Authentication)
  * Convex (Database)
  * Inngest (Background jobs)
  * Anthropic or Google AI Studio (AI API)

---

## Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/AI-Coding-Agent.git
cd AI-Coding-Agent
```

---

### 2️⃣ Install Dependencies

```bash
npm install
```

---

### 3️⃣ Setup Environment Variables

```bash
cp .env.example .env.local
```

Add:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_FRONTEND_API_URL=
CLERK_JWT_ISSUER_DOMAIN=

# Convex
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOYMENT=
TORQ_AI_CONVEX_INTERNAL_KEY=

# AI Providers
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
```

Torq-AI accepts either `GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY`
for Gemini.

---

### 4️⃣ Start Development Servers

```bash
npm run dev
```

---

### 5️⃣ Open in Browser

```
http://localhost:3000
```

---

# 📜 Scripts

```bash
npm run dev       # Development server
npm run build     # Production build
npm run start     # Start production
npm run lint      # ESLint
npm run convex:deploy # Deploy Convex functions to production
```

---

# 🚂 Deploy To Railway

Torq-AI is configured for Railway with a Docker-based production image so the
live app can still run files in:

* JavaScript
* Python
* C
* C++
* Java

The app now builds with Next.js standalone output and includes a health endpoint:

```text
/api/health
```

## 1️⃣ Prepare production services first

### Convex

Deploy your backend to Convex production:

```bash
npm run convex:deploy
```

Then copy your production Convex URL into Railway as:

```env
NEXT_PUBLIC_CONVEX_URL=
```

### Clerk

Create a Clerk production instance and switch to live keys:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_JWT_ISSUER_DOMAIN=https://your-production-clerk-domain
```

Important:

* Clerk production requires a real domain you control.
* Reconfigure GitHub OAuth in Clerk production.
* Re-enable the Convex integration in the Clerk production instance.

### Inngest

Create or configure your production Inngest app and set the serve URL to:

```text
https://your-railway-domain/api/inngest
```

Add these to Railway:

```env
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

## 2️⃣ Set Railway environment variables

Required on Railway:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=
NEXT_PUBLIC_CONVEX_URL=
TORQ_AI_CONVEX_INTERNAL_KEY=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

AI and optional integrations:

```env
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
FIRECRAWL_API_KEY=
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
```

## 3️⃣ Mirror critical env vars into Convex production

In your Convex production deployment, set:

```env
CLERK_JWT_ISSUER_DOMAIN=
TORQ_AI_CONVEX_INTERNAL_KEY=
```

## 4️⃣ Deploy on Railway

1. Push this repo to GitHub.
2. In Railway, create a new project.
3. Choose **Deploy from GitHub repo**.
4. Railway will detect the `Dockerfile` and build the app automatically.
5. Add all required environment variables.
6. Generate a Railway domain or attach your custom domain.
7. Confirm health at:

```text
https://your-domain/api/health
```

## 5️⃣ Post-deploy checklist

After the app is live:

1. Open the site and verify Clerk sign-in.
2. Create a project.
3. Send a chat prompt.
4. Import a GitHub repository.
5. Export a project to GitHub.
6. Create and run a `.py`, `.js`, `.c`, `.cpp`, or `.java` file.
7. Preview an `.html` or `.md` file.

---
