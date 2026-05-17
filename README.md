---
created: 2026-05-15
updated: 2026-05-17
---

# Reedy

A social reading tracker with NYC public library availability. Track books you want to read, are reading, or have finished — and see real-time hold counts from Brooklyn Public Library and New York Public Library.

## Features

- **Reading lists** — Want to Read, Reading, Read, Abandoned statuses with ratings and notes
- **Book clubs** — Shared lists, monthly picks, and discussion threads
- **Library availability** — Live hold counts and wait estimates from BPL and NYPL
- **Book search** — Open Library (primary) + Google Books (fallback)

## Tech stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL via Neon or Supabase
- **ORM**: Prisma
- **Auth**: Auth.js v5 (NextAuth) with Prisma adapter
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL database (Neon or Supabase recommended)

### Setup

```bash
npm install
cp .env.example .env.local
# Fill in your .env.local values

npx prisma generate
npx prisma db push

npm run dev
```

### Environment variables

See `.env.example` for all required variables. Key ones:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random secret for Auth.js (run `npx auth secret`) |
| `GOOGLE_BOOKS_API_KEY` | Google Books API key (optional, for fallback) |
| `GOOGLE_CLIENT_ID` | Google OAuth (optional) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth (optional) |

## Architecture

```
src/
├── app/
│   ├── (auth)/          # Login, register pages
│   ├── (main)/          # Authenticated app pages
│   │   ├── dashboard/   # Reading list overview
│   │   ├── search/      # Book search
│   │   ├── books/[id]/  # Book detail + library availability
│   │   ├── profile/     # User profile
│   │   └── clubs/       # Book club pages
│   └── api/             # API routes
│       ├── books/        # Book CRUD + status updates
│       ├── search/       # Search proxy
│       ├── clubs/        # Club management
│       └── cron/         # Background jobs
├── components/
│   ├── ui/              # Primitive components
│   ├── books/           # Book-specific components
│   ├── clubs/           # Club components
│   └── layout/          # Nav, sidebar
├── lib/
│   ├── api/
│   │   ├── open-library.ts     # Open Library client
│   │   ├── google-books.ts     # Google Books client
│   │   ├── book-metadata.ts    # Unified metadata service
│   │   └── library/            # NYC library availability
│   │       ├── bpl.ts          # Brooklyn Public Library
│   │       └── nypl.ts         # New York Public Library
│   ├── auth/            # Auth.js config
│   └── db/              # Prisma client singleton
└── types/               # Shared TypeScript types
```

## Library availability

Availability is fetched on demand and cached in PostgreSQL for 6 hours. A Vercel cron job (`/api/cron/refresh-availability`) runs every 6 hours to refresh stale records for books on active users' lists.

- **BPL**: Queries the BiblioCommons public catalog API
- **NYPL**: Queries the NYPL public catalog

## MVP order

1. Auth (register/login)
2. Book search (Open Library)
3. Reading status tracking
4. Book detail pages
5. Library availability display
6. Book clubs
7. Discussion threads

## Future

- Mobile app (React Native / Expo)
- More library systems (Queens, BCCLS)
- Goodreads CSV import
- Weekly reading digest emails
- AI book recommendations based on reading history
