# Campus — College Management System frontend

A role-based frontend for the CMS API described in [`FRONTEND.md`](./FRONTEND.md). It covers
authentication, role-filtered navigation and dashboards, and the full CRUD surface for
departments, courses, subjects, faculty, students, attendance, exams, results, notices, fees,
assignments and reports.

## Stack

- Next.js 16 (App Router, Turbopack) with Cache Components enabled
- React 19 and TypeScript (strict)
- Tailwind CSS v4
- No additional runtime dependencies — the API client, hooks and UI kit are in this repo

## Requirements

- [Bun](https://bun.sh) (the project is developed and built with `bun`)
- The CMS backend running and reachable over HTTP(S)

## Getting started

```bash
bun install
cp .env.example .env.local   # then edit the API URL
bun run dev
```

Open <http://localhost:3000>. Unauthenticated visits redirect to `/login`.

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes (defaults to `http://127.0.0.1:8080/api/v1`) | Base URL of the API, including `/api/v1` |

For a backend hosted on EC2 behind a domain:

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com/api/v1
```

Notes:

- `NEXT_PUBLIC_*` values are inlined into the client bundle **at build time**. Set the variable in
  the environment that runs `bun run build`, not only at runtime.
- Trailing slashes are stripped automatically.
- The backend must allow the frontend origin via its `FRONTEND_URL` CORS setting, and the API domain
  must serve HTTPS if the frontend is served over HTTPS.
- `.env.example` is committed; `.env.local` and other env files are ignored.

## Authentication

- `POST /auth/login` returns a JWT that is stored in `localStorage` together with the user profile
  and expiry.
- On boot the app validates the session with `GET /auth/me`. A `401`/`403` clears the session and
  redirects to `/login`; transient network failures keep the cached profile.
- Any authenticated `401` from the API clears storage and returns to `/login`.
- Changing a password replaces the stored token with the fresh one returned by the API.

## Routes

| Route | Access |
| --- | --- |
| `/login` | Public |
| `/dashboard` | All authenticated roles |
| `/departments`, `/courses` | All authenticated roles (admin actions gated) |
| `/subjects` | All roles (`/subjects/mine` for faculty and students) |
| `/faculty` | Admin |
| `/students` | Admin, faculty (read-only for faculty) |
| `/attendance`, `/exams`, `/results` | Admin, faculty |
| `/my-attendance`, `/my-results`, `/my-fees` | Student |
| `/assignments`, `/notices` | All roles (create/grading controls gated) |
| `/fees` | Admin |
| `/reports` | Admin, faculty (fee report admin-only) |
| `/profile`, `/change-password` | All authenticated roles |

## Scripts

```bash
bun run dev      # development server
bun run build    # production build (includes type checking)
bun run start    # serve the production build
```

## Deploying against the EC2 backend

1. Point the backend domain (for example `api.example.com`) at the EC2 instance and terminate TLS
   with a certificate (ALB, CloudFront, Caddy or nginx).
2. Set the backend's `FRONTEND_URL` to the public origin of this frontend so CORS allows it.
3. Build the frontend with `NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1`.
4. Serve the result with `bun run start` (or any Node host) behind HTTPS.

## Security

Every response is served with hardened headers from `next.config.ts`:

| Header | Purpose |
| --- | --- |
| `Content-Security-Policy` | Restricts content to `'self'` and the API origin; blocks objects, frames, form posts elsewhere, and base-URI hijacking |
| `Strict-Transport-Security` | Production only: `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` — no MIME-type guessing |
| `X-Frame-Options` | `DENY` — legacy clickjacking protection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Disables camera, microphone, geolocation, payment, USB, sensors and Topics |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |
| `Origin-Agent-Cluster` | `?1` — origin-keyed agent clustering |
| `X-DNS-Prefetch-Control` | `off` — no DNS prefetch leaks |
| `X-Permitted-Cross-Domain-Policies` | `none` |
| `X-XSS-Protection` | `0` — disables the legacy auditor |
| `X-Download-Options` | `noopen` |

`x-powered-by` is disabled (`poweredByHeader: false`) and production browser source maps are off.

Notes:

- `connect-src` is derived from `NEXT_PUBLIC_API_BASE_URL` **at build time**. If the API origin
  changes, rebuild the frontend or the browser will block the API calls.
- The CSP allows `'unsafe-inline'` for scripts and styles because Cache Components (PPR) rules out
  nonce-based policies and the App Router streams its payload through inline scripts. If you ever
  disable `cacheComponents`, replace this with a nonce-based policy generated in `proxy.ts` (the
  Next.js 16 name for middleware) for a stricter policy.
- `upgrade-insecure-requests` is added to the production CSP when the API origin is HTTPS. Gating
  it on the API scheme keeps a production build served locally over plain HTTP (`bun run start`)
  usable.
- HSTS is only sent in production. `preload` has no effect until the domain is submitted at
  <https://hstspreload.org>; remove it if you cannot commit to HTTPS on every subdomain.
- The JWT is stored in `localStorage`, so any script running on the origin can read it — the CSP is
  what limits that exposure. Moving to `HttpOnly` cookies requires backend support (the login
  response must set the cookie) and is recommended for higher assurance.
- Development CSP additionally allows `'unsafe-eval'` and WebSocket connections for HMR. Those are
  never included in a production build.

## Project structure

```
app/
  (app)/            authenticated shell and all role-based screens
  login/            sign-in screen
components/
  layout/           top bar and sidebar
  ui/               buttons, inputs, tables, modals, charts, feedback
lib/
  api.ts            fetch wrapper, envelopes, pagination, session storage
  auth.tsx          auth provider and guard helpers
  hooks.ts          query/mutation/debounce/click-outside hooks
  lookups.ts        shared option loaders (departments, courses, subjects, …)
  navigation.ts     role-based sidebar and route rules
types/api.ts        complete API contract types
```
