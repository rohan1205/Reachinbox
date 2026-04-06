# ReachInbox Assignment - Full-stack Email Scheduler

Production-style scheduler with a React dashboard, real Google OAuth login, delayed email jobs via BullMQ + Redis, PostgreSQL persistence, and Ethereal SMTP delivery.

## Tech Stack

- Backend: `TypeScript`, `Express`, `BullMQ`, `Redis`, `Prisma`, `PostgreSQL`, `Nodemailer`
- Frontend: `Next.js`, `TypeScript`, `Tailwind CSS`, `NextAuth` (Google provider)
- Infra: `Docker Compose` for Redis + Postgres

## Features Implemented

- Backend scheduler API to accept and persist send requests
- Delayed job scheduling using BullMQ (no cron)
- Redis-backed worker processing with configurable concurrency
- Configurable minimum delay between email sends
- Redis-backed per-sender hourly limit with rescheduling to future windows (no dropped jobs)
- Idempotent queue job IDs (`jobId = email-${scheduledEmailId}`)
- Dashboard UI with:
  - Google login + logout
  - Compose flow (subject, body, leads file, start time, delay, hourly limit)
  - Scheduled emails tab
  - Sent/failed emails tab
  - Loading + empty states

## Project Structure

- `backend` - API + worker + DB models
- `frontend` - Next.js UI and auth
- `docker-compose.yml` - Postgres + Redis services

## Setup & Run

### 1) Start infra

```bash
docker-compose up -d
```

### 2) Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run dev
```

In another terminal:

```bash
cd backend
npm run worker
```

### 3) Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Environment Variables

### Backend (`backend/.env`)

Use `backend/.env.example` and set:

- `DATABASE_URL`
- `REDIS_HOST`, `REDIS_PORT`
- `PORT`
- `FRONTEND_URL`
- `WORKER_CONCURRENCY`
- `MIN_SEND_INTERVAL_MS`
- `MAX_EMAILS_PER_HOUR_PER_SENDER`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (Ethereal)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (for backend passport routes)

### Frontend (`frontend/.env.local`)

Use `frontend/.env.example` and set:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_ID`
- `GOOGLE_SECRET`

## Ethereal Setup

1. Create account at [Ethereal Email](https://ethereal.email/).
2. Copy SMTP credentials.
3. Set `SMTP_USER` and `SMTP_PASS` in `backend/.env`.

## API Endpoints

- `POST /api/emails/schedule` - schedule campaign emails
- `GET /api/emails/scheduled?sender=<email>` - pending emails
- `GET /api/emails/sent?sender=<email>` - sent/failed emails

## Architecture Notes (How Constraints Are Met)

- **No cron jobs:** Scheduling is done only through BullMQ delayed jobs.
- **Persistence on restart:**  
  - Postgres stores scheduling metadata and email states.
  - Redis stores delayed jobs and processing state.
  - If API/worker restarts, queued delayed jobs continue from Redis.
- **Concurrency:** Controlled by `WORKER_CONCURRENCY` in worker options.
- **Delay between sends:** Enforced by BullMQ global limiter (`max: 1`, `duration: MIN_SEND_INTERVAL_MS`).
- **Hourly rate limit:** Redis `INCR` counter per sender + hour window (`emails_sent:<sender>:<hour>`).
- **When hourly limit is exceeded:**  
  Job is moved to delayed state in next hour using a Redis overflow sequence to preserve ordering as much as possible.
- **Idempotency:**  
  Queue job IDs are deterministic (`email-<dbId>`), so duplicate enqueue attempts do not create duplicate jobs.

## Behavior Under Load

When 1000+ emails are scheduled around the same timestamp:

- Jobs are persisted as delayed jobs in Redis.
- Worker concurrency allows parallel job fetch/processing safely.
- Limiter enforces minimum spacing between actual sends.
- Hourly cap logic pushes overflow into next windows without dropping jobs.

## Demo Checklist

- Login with Google and land on dashboard
- Upload leads + schedule campaign from UI
- View entries in Scheduled tab
- Wait/refresh and observe Sent/Failed tab updates
- Restart API/worker and verify future emails still send
- (Bonus) Schedule larger batch with low hourly cap to demonstrate spillover behavior

## Assumptions / Trade-offs

- Per-sender hourly limit is enforced with Redis counters; this is robust across multiple worker instances.
- Ordering under limit overflow is best-effort via per-hour sequence key in Redis.
- Delivery provider is Ethereal (fake SMTP), suitable for functional verification but not production throughput benchmarking.
