# Fork rules

This repo is `jasonsims/cal.diy`, a fork of `calcom/cal.diy` that serves as a sample app for the traffic-bots personas, which generate traffic for Pendo dev instances. These rules apply on top of `CLAUDE.md`, `AGENTS.md` and the other files in this directory, which belong to upstream. Read `FORK.md` for the full picture.

Where these rules conflict with upstream's (for example "create PRs in draft mode" or the PR size limits), these win for fork work. Upstream's coding standards still apply to any code written here.

## Do not edit upstream-owned files

- Never edit `CLAUDE.md`, `AGENTS.md`, or any other file in `agents/` except this one. Upstream changes them, and any edit here becomes a merge conflict on the next sync.
- Fork-specific instructions go in this file. `.claude/rules` is a symlink to `agents/rules`, so this file is tracked as `agents/rules/fork.md`.
- Tools that drop files into the repo (for example `vercel link` appending to `.gitignore`, or `vercel integration add` installing agent skills into `agents/skills/`, `.agents/` and `skills-lock.json`) must have those changes reverted, not committed.

## Branches

- `main` mirrors `upstream/main`. Never commit to it, never open a PR into it, never merge into it. Only `git merge --ff-only upstream/main`.
- `deploy` is the fork's default branch and the Vercel production branch. All fork work goes through PRs into `deploy`.
- Branch work off `deploy`, not `main`.

## Keep the diff against upstream as small as possible

Every line changed in an upstream file is a future merge conflict. Before editing, ask whether the change can be made with configuration, a new file, or a wrapper instead.

- Prefer Vercel env vars and project settings over code. Most of Cal.diy's behavior is switchable by env var; check `.env.example` and `turbo.json` first.
- Prefer new files over edits to existing ones.
- Do not reformat, rename, reorder imports in, or refactor upstream files.
- When an edit to an upstream file is unavoidable, keep it small and mark it with a `// FORK:` comment so `grep -rn "FORK:"` lists every divergence. JSON files can't hold comments, so rely on the table in `FORK.md`.
- Add an entry to the "Changes from upstream" table in `FORK.md` for every change on `deploy`. Name the files and give the reason.
- If a change would be useful to everyone, say so. It may belong upstream instead.

## Deployment and data

- The site is <https://cal-diy-chi.vercel.app>, Vercel project `cal-diy` on the Hobby plan. Hobby only allows daily crons, so don't add or speed up crons in `apps/web/vercel.json`.
- Every build runs `prisma migrate deploy` against the production Neon database. A migration that lands on `deploy` changes the live database.
- Sign-in is email and password only. Keep Google and other OAuth providers off. The bots depend on `POST /api/auth/signup` staying open and email verification staying off.
- Never print or commit database URLs, `NEXTAUTH_SECRET`, `CALENDSO_ENCRYPTION_KEY` or bot passwords. `vercel env pull` writes secrets to `.env.local`, which is git-ignored; keep it that way.

## Before committing

- Use Node 24 (`nvm use`). Upstream CI uses Node 20, and your default Node may be older.
- For changes to app or package code, run `yarn type-check:ci --force` as `CLAUDE.md` says. A failing type check also fails the Vercel build.
- Commit messages and PR titles follow upstream's conventional style, for example `feat(web): ...`, `fix(prisma): ...`, `docs(fork): ...`.

## Syncing with upstream

Follow "Syncing with upstream" in `FORK.md`. Sync through a `sync/upstream-YYYY-MM` branch and a PR into `deploy`, never directly.
