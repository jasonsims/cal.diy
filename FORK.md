# FORK.md

This is `jasonsims/cal.diy`, a fork of [`calcom/cal.diy`](https://github.com/calcom/cal.diy). It runs as a sample app that the [traffic-bots](https://github.com/pendo-io/traffic-bots) personas use, to generate realistic traffic for Pendo dev instances. It is a test site, not a real scheduling service.

This file records how the fork is maintained and every way it differs from upstream.

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | Clean mirror of `upstream/main`. Fast-forward only. Never commit here, never merge into it. |
| `deploy` | `main` plus this fork's changes. Default branch on GitHub and the Vercel production branch. |

## Remotes

| Remote     | URL               |
| ---------- | ----------------- |
| `origin`   | `jasonsims/cal.diy` |
| `upstream` | `calcom/cal.diy`  |

Enable `git rerere` in each clone (`git config rerere.enabled true`) so conflict resolutions are remembered between syncs.

## Syncing with upstream

Sync regularly (weekly or monthly). Small, frequent syncs are much easier than one large one.

```bash
git fetch upstream
git checkout main && git merge --ff-only upstream/main
git push origin main

git checkout -b sync/upstream-YYYY-MM deploy
git merge main
```

Open a PR from the `sync/*` branch into `deploy`, check the Vercel preview build, then merge. After resolving conflicts, check the "Changes from upstream" table below. Database migrations from upstream run automatically on the next deploy.

## Rules for keeping the diff small

- Prefer configuration (Vercel env vars and project settings) over editing upstream files.
- Put new things in new files so they can't conflict.
- Don't reformat or refactor upstream files.
- Mark unavoidable edits to upstream code with a `// FORK:` comment so `grep -rn "FORK:"` finds them all. JSON can't hold comments, so list JSON edits in the table below.
- Contribute generic fixes upstream so they stop being this fork's burden.

## Claude Code instructions

`CLAUDE.md` and `AGENTS.md` are upstream's files. Do not edit them, because any change conflicts on the next sync. Fork-specific instructions live in `.claude/rules/fork.md`, which Claude Code loads alongside `CLAUDE.md`.

In this repo `.claude/rules` is upstream's symlink to `agents/rules/`, so the file is tracked as `agents/rules/fork.md`. Upstream doesn't have a file with that name, so it doesn't conflict.

## Changes from upstream

| Files | Change | Why |
| --- | --- | --- |
| `FORK.md`, `agents/rules/fork.md` | New | Fork docs and Claude Code rules. |
| `.nvmrc` | New, `24` | Node 24 LTS for local work, matching the Vercel project. Upstream CI still uses Node 20, which is end of life and deprecated on Vercel. |
| `apps/web/vercel.json` | Every cron runs once a day (01:00 to 06:00 UTC) instead of every 1 to 5 minutes or every 12 hours | The Vercel Hobby plan only allows daily crons and rejects the deploy otherwise. Background tasks (`/api/tasks/cron`) and calendar syncs run daily, which is fine for a test site. Revert this if the project moves to Pro. |
| `apps/web/next.config.ts` | `typescript.ignoreBuildErrors` when `VERCEL_ENV` is set (marked `// FORK:`) | `next build` type-checks the whole monorepo, and on Hobby's 8 GB build machine that gets the build SIGKILLed for running out of memory. Local builds still type-check. |
| `apps/web/vercel.json` | Removed the empty `"functions": {}` | Vercel rejects the deploy with "`functions` should NOT have fewer than 1 properties". |
| `apps/web/modules/pendo/`, `apps/web/global.d.ts` | New | Novus by Pendo web SDK. `PendoScript` is the install snippet plus the single `pendo.initialize`, with URL transforms that keep credentials (password reset, invite and verification tokens, OAuth `code`/`state`) out of recorded URLs. `PendoVisitorSync` identifies the signed-in user and clears the visitor after sign-out. |
| `apps/web/app/layout.tsx`, `apps/web/pages/_document.tsx` | Render `PendoScript` in `<head>`; the root layout also mounts `PendoVisitorSync` inside `Providers` (marked `// FORK:`) | They are the HTML entry points for the App Router and the remaining Pages Router pages. |
| `packages/features/users/repositories/UserRepository.ts`, `packages/trpc/server/routers/viewer/me/get.handler.ts` | `findUnlockedUserForSession` selects `lastActiveAt` and `viewer.me.get` returns it (marked `// FORK:`) | Sent to Pendo as visitor metadata. |

## Deployment

- Host: Vercel, project `cal-diy` in `jasons-projects-faa96c83` (Hobby plan), connected to this repo.
- URL: <https://cal-diy-chi.vercel.app>
- Production branch: `deploy`.
- Project settings (set through the API, not `vercel.json`):
  - Root directory `apps/web`, with source files outside the root directory included.
  - Install command `cd ../.. && yarn install`, build command `cd ../.. && yarn build`.
  - Node.js 24.x.
- Database: Neon Postgres `cal-diy-db` (free plan, `iad1`), from the Vercel Marketplace. It supplies `DATABASE_URL` and `DATABASE_URL_UNPOOLED`. `DATABASE_DIRECT_URL` is set by hand to the unpooled URL, because Prisma's `directUrl` reads that name.
- Migrations: every build runs `prisma migrate deploy` (`packages/prisma` `build` script, `auto-migrations.ts`). Set `SKIP_DB_MIGRATIONS=1` to turn that off.
- Environment variables, Production and Preview:
  - `NEXTAUTH_SECRET`, `CALENDSO_ENCRYPTION_KEY`, `CRON_API_KEY`, `CRON_SECRET`: random secrets. Don't rotate `CALENDSO_ENCRYPTION_KEY`; it encrypts stored credentials.
  - `NEXTAUTH_URL`, `NEXT_PUBLIC_WEBAPP_URL`, `NEXT_PUBLIC_WEBSITE_URL`: `https://cal-diy-chi.vercel.app`. `NEXT_PUBLIC_EMBED_LIB_URL`: the same with `/embed/embed.js`.
  - `ALLOWED_HOSTNAMES`: `"cal-diy-chi.vercel.app"`.
  - `CALCOM_TELEMETRY_DISABLED=1`.
- `NEXT_PUBLIC_*` values are baked in at build time, so changing them needs a new build. Preview deployments point their auth URLs at production, so sign-in only works on the production URL.
- Email is not configured. Sends fall back to `sendmail`, which doesn't exist on Vercel, so they fail and are logged. That is intended: bots use fake addresses.

## Authentication

Sign-in is Cal.diy's built-in email and password login. Google login and every other provider stay off (`GOOGLE_LOGIN_ENABLED` is unset), so no OAuth app is needed. Sign-up is open and email verification is off (the `email-verification` feature flag is disabled by default).

Bots sign in without going through the UI:

1. Create the account once: `POST /api/auth/signup` with JSON `{ "username", "email", "password" }`. `201` means created, `409` means it already exists.
2. Sign in: `GET /api/auth/csrf` for a `csrfToken`, then `POST /api/auth/callback/credentials` as a form with `email`, `password` and `csrfToken`. NextAuth sets the session cookie.

traffic-bots does this in `logins/caldiy.mjs` before the agent starts, so the password never reaches the model. The password needs at least 7 characters with uppercase, lowercase and a number.
