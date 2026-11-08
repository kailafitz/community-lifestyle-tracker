# community-lifestyle-tracker
Testing out a lifestyle habit builder and tracker

Circles is a shared, Toggl-style week calendar. You sign up, set up a profile, create a circle (or join one you were invited to), and log activities on a calendar that everyone in the circle can see. Members can "join" each other's activities to copy them onto their own calendar.

Stack: Next.js 15 (App Router), Tailwind CSS v4, shadcn/ui, FullCalendar, Supabase (Postgres, Auth, Storage, Realtime).

## Prerequisites

- Node.js 20+ (22+ recommended by `@supabase/supabase-js`)
- Docker Desktop, running (the Supabase CLI runs the local stack in containers)

## Setup

```bash
npm install

# Supabase CLI env (Google OAuth). Placeholders are fine for email-only.
cp supabase/.env.example supabase/.env

# Start Supabase locally and apply migrations
npm run db:start
npm run db:reset

# App env: copy, then paste the anon and service_role keys printed by `npx supabase status`
cp .env.example .env.local

npm run dev
```

Open http://localhost:3000.

Local services:

| Service | URL |
| --- | --- |
| App | http://localhost:3000 |
| Supabase Studio | http://127.0.0.1:54323 |
| Mailpit (invite and auth emails) | http://127.0.0.1:54324 |

## Google sign-in

1. In Google Cloud Console, create an OAuth client ID (type "Web application").
2. Add `http://127.0.0.1:54321/auth/v1/callback` as an authorized redirect URI.
3. Put the client ID and secret in `supabase/.env`, then run `npx supabase stop && npm run db:start`.

For a hosted project, enable the Google provider in the Supabase dashboard and use `https://<project-ref>.supabase.co/auth/v1/callback` as the redirect URI.

## How invites work

Circle members invite people by email from onboarding or from the **Invite** button on the dashboard.

- **New emails:** the app records the invite and sends a Supabase invite email (see Mailpit locally). The link signs the person in and sends them to onboarding, where they pick a password and can accept the invite.
- **Existing accounts:** no email is sent. The invite shows up in onboarding and in the bell menu on the dashboard.

Sending invite emails uses the service role key, so `SUPABASE_SECRET_KEY` must be set on the server. Never expose it to the browser.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start Next.js in dev mode |
| `npm run build` | Production build |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript checks |
| `npm run db:start` / `db:stop` | Start or stop local Supabase |
| `npm run db:reset` | Recreate the local database from `supabase/migrations` |
| `npm run db:types` | Regenerate `src/lib/types/database.ts` from the local schema |

## Project layout

- `supabase/migrations/`: schema, row level security policies, RPCs, avatars bucket, realtime
- `supabase/templates/invite.html`: invite email, which links to `/auth/confirm`
- `src/middleware.ts`: session refresh and redirects (signed out, onboarding, dashboard)
- `src/app/actions/`: server actions for auth, profile, circles, invites, and activity logs
- `src/app/onboarding/`: name, photo, then create or join a circle
- `src/app/dashboard/`: header (circle switcher, members, invites, user menu) and the week calendar
- `src/components/calendar/`: `WeekCalendar`, `LogActivityDialog`, `LogDetailsPopover`

## Deploying

1. Create a hosted Supabase project, then `npx supabase link` and `npx supabase db push`.
2. In the dashboard, set the Site URL and redirect URLs to your app domain. Paste the contents of `supabase/templates/invite.html` into the "Invite user" email template.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `NEXT_PUBLIC_SITE_URL` in your host's environment.
