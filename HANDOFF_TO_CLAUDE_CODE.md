# Handoff to Claude Code — Furrie Performance Fix Execution

**For:** Claude Code, picking up from a Cowork session
**From:** Cowork session that ran the performance audit
**Date of handoff:** 2026-05-03

---

## Why this handoff exists

The user (Gerard, non-technical founder of Furrie) and I (Cowork-mode Claude) just completed a comprehensive performance audit of the Furrie web app. We then started executing Stage 1 of the fix plan, but hit a documented Cowork-specific bug: the FUSE mount layer between Cowork's Linux VM and the Windows filesystem serves stale/truncated views of files modified via the host. This bug does NOT affect Claude Code (which runs natively in the user's shell, no VM, no FUSE).

**You are being asked to take over the code-heavy execution.** Cowork session retains the strategic/discussion role — the user will return there for stage-gate decisions and discussions that don't require filesystem operations.

Read this entire document before doing anything. Then read the three reference documents listed below before any code change.

---

## Required reading (in this order)

1. **`CLAUDE.md`** at project root — codebase conventions, tech stack, design rules. Some of these were updated during the audit (Mumbai region, Vercel `bom1`).
2. **`PERFORMANCE_AUDIT.md`** at project root — the full audit. 19 numbered findings (F-01 through F-19), Capacitor readiness section (C-01 through V-04), a Discussions parking lot (D-1 through D-10). The single most important finding is F-01 (Vercel/Supabase region mismatch).
3. **`STAGE_1_EXECUTION_PLAN.md`** at project root — the agreed plan for fixing what the audit found. 12 batches, 5 discussion gates, sequenced from lowest-risk to highest-risk.

After reading those three, you have the full context.

---

## Project at a glance

- **App:** Furrie — vet teleconsultation platform for India. Customer + Vet + Admin portals.
- **Stack:** Next.js 16.1.6 (App Router, React 19), TypeScript strict, Supabase, Vercel, Daily.co video, Cashfree payments, Resend email, Sentry telemetry.
- **Region:** Supabase in Mumbai (`ap-south-1`). Vercel currently in `iad1` (Washington DC) — this is THE biggest performance problem and the audit's #1 finding (F-01).
- **Founder is non-technical.** Explain trade-offs in plain language, but technical precision in code is expected. Discussions belong in plain English; code reviews can use jargon.
- **Mobile plans:** Two Capacitor apps (customer + vet) coming after Stage 1 + Stage 2. Admin stays web-only.

---

## Current state of work (as of handoff)

### Branch state

- **Local branch you should be on:** `perf/audit-fixes`
- **Created from:** `main` at commit `fb357f9` (this was the older state)
- **Where main is now:** `babd95d` (3 commits ahead — there were upstream changes we never rebased onto)
- **Git lock note:** During Cowork session, a stale `.git/index.lock` file was seen by the bash sandbox but did NOT exist on the Windows filesystem. That artifact dies with the Cowork environment — should not affect you. If `git status` from your terminal shows weird behavior, just verify the lock file genuinely isn't there with `Test-Path .git\index.lock`.

### Uncommitted work on disk

These files are modified but NOT yet committed. The Cowork session edited them via host-side file tools, so the changes are on Windows. Verify with `git diff` before committing.

| File | Change | Audit finding |
|---|---|---|
| `CLAUDE.md` | Region note: Singapore → Mumbai (`ap-south-1`); added Vercel `bom1` deployment note | F-02 |
| `vercel.json` | Added `"regions": ["bom1"]` at top level | F-01 (code side only) |
| `next.config.ts` | Added `experimental.optimizePackageImports: ["lucide-react", "date-fns"]` and `images.formats: ["image/avif", "image/webp"]` | F-18 |
| `sentry.server.config.ts` | `tracesSampleRate` 0.1 → 0.25 with comment | F-05 |
| `sentry.edge.config.ts` | `tracesSampleRate` 0.1 → 0.25 with comment | F-05 |
| `instrumentation-client.ts` | `tracesSampleRate` 0.1 → 0.25 with comment | F-05 |

These edits collectively constitute **Batch 1** of the execution plan.

### Untracked files on disk

- `PERFORMANCE_AUDIT.md` — should be added in the same commit or first commit on the perf branch.
- `STAGE_1_EXECUTION_PLAN.md` — same.
- `HANDOFF_TO_CLAUDE_CODE.md` — this file. Up to you whether to commit; I would.

### What's been done conceptually

- Audit phases 0-6: complete. Methodology and findings in `PERFORMANCE_AUDIT.md`.
- Stage 1 Batch 1: file edits applied (above). NOT yet typechecked, NOT yet linted, NOT yet committed in your environment.
- Stage 1 Batches 2-12: not started.

### What did NOT happen yet (and you need to do)

1. Reset `perf/audit-fixes` to `origin/main` (it's behind by 3 commits).
2. Verify all Batch 1 edits are intact (cat the files, diff against origin/main).
3. Run `npm run typecheck && npm run lint && npm run build` in your terminal. All three should pass. The Cowork session's typecheck output was unreliable due to the FUSE bug — your environment should give a clean result.
4. Commit Batch 1.
5. Vercel dashboard step (USER ACTION): user needs to set Function Region to `bom1` in Vercel UI. Coordinate this with them; the `vercel.json` change alone is not sufficient.
6. Proceed to Batch 2 (public route middleware exclusion).

---

## User preferences (from the audit + planning conversation)

The user explicitly chose these in answer to questions during planning. **Do not re-ask these. Honor them.**

- **Branch strategy:** Single long-lived `perf/audit-fixes` branch. Each batch is a separate commit on this branch. One PR at the end merging the whole branch back to main.
- **Measurement strategy:** Skip the rigorous before/after telemetry protocol. No 24-hour wait. Just ship the fixes. Capture informal DevTools snapshots if convenient.
- **Working style:** Comprehensive plan + risk analysis BEFORE each batch's code changes. User wants to approve before code is touched. "Once I approve the plan begin- make code changes first and any changes you need me to do on third party platforms we can collaborate."
- **Stage-gate reviews:** At end of Stage 1 (and at every transition between Stages), pause and review with the user before proceeding to the next stage. The four-stage program is: Stage 1 (Performance fixes) → Stage 2 (Production environment separation) → Stage 3 (Capacitor development on testing env) → Stage 4 (App store submission).
- **Discussions:** The five discussion gates inside Stage 1 (D-1, D-5, D-4, D-2, D-3) are explicit pause points. When you reach one, summarize the question, present the options from the plan, recommend an approach, and wait for the user. Don't unilaterally pick one.
- **Documentation:** Discussions and decisions get logged into `PERFORMANCE_AUDIT.md` (in the relevant finding's section) so a year from now, the reasoning is recoverable.

---

## Immediate first actions (suggested sequence)

```
# 1. Confirm branch state
git status
git log --oneline -5
git branch --show-current     # should be perf/audit-fixes

# 2. Verify Batch 1 edits are present
git diff main -- CLAUDE.md vercel.json next.config.ts sentry.server.config.ts sentry.edge.config.ts instrumentation-client.ts

# 3. Reset branch to latest main (Cowork couldn't do this due to lock; you can)
git stash                     # save the unstaged Batch 1 edits
git fetch origin
git reset --hard origin/main  # reset perf/audit-fixes to latest main
git stash pop                 # reapply Batch 1 edits

# 4. Verify everything still good
git status
git diff --stat               # should show 6 modified files + 3 untracked .md files

# 5. Run quality checks
npm run typecheck             # must pass
npm run lint                  # must pass
npm run build                 # ideally passes; if it fails, dig in before committing

# 6. Commit Batch 1
git add CLAUDE.md vercel.json next.config.ts sentry.server.config.ts sentry.edge.config.ts instrumentation-client.ts
git add PERFORMANCE_AUDIT.md STAGE_1_EXECUTION_PLAN.md HANDOFF_TO_CLAUDE_CODE.md
git commit -m "perf: Batch 1 — region config, Sentry sample rate, package imports

Stage 1 Batch 1 of the performance audit execution plan.

- F-02: Update CLAUDE.md region note (Singapore -> Mumbai ap-south-1)
- F-01 (code side): Add regions: [bom1] to vercel.json
- F-18: optimizePackageImports for lucide-react and date-fns; AVIF/WebP image formats
- F-05: Sentry tracesSampleRate 0.1 -> 0.25 (server, edge, client instrumentation)

Also adds: PERFORMANCE_AUDIT.md, STAGE_1_EXECUTION_PLAN.md, HANDOFF_TO_CLAUDE_CODE.md

The Vercel Function Region must also be changed in the Vercel dashboard
(Settings -> Functions -> Function Region -> bom1). This commit only locks
the setting in code; the actual deployment region is controlled in the UI."

# 7. Push the branch (don't open PR yet — we'll PR at end of Stage 1)
git push -u origin perf/audit-fixes

# 8. Coordinate the Vercel dashboard change with the user, then proceed to Batch 2
```

---

## Discussion gates ahead (don't skip these)

These pause points are baked into the plan. When you reach each one, do NOT proceed without explicit user approval. Each gate is described fully in `STAGE_1_EXECUTION_PLAN.md`.

- **D-1 — Auth caching strategy** (before Batch 6, F-04). Options: React `cache()` wrapper (recommended) vs middleware-passes-headers approach. User decides which.
- **D-5 — Image strategy** (before Batch 7, F-17). Options: `next/image` vs custom `<PetImage>` using Supabase transform API vs hybrid (recommended). User decides.
- **D-4 — ISR staleness window** (before Batch 8, F-15). Options: 60s revalidate, 30s + revalidatePath (recommended), 10s revalidate, or skip ISR entirely. User decides.
- **D-2 — Customer notification strategy** (before Batch 9, F-07). Options: Realtime broadcast (recommended), longer poll, adaptive poll, defer. User decides.
- **D-3 — Vet Realtime topology** (before Batch 10, F-10). Options: single channel vs split channels. Highest-risk batch. User decides.

These gates exist because the trade-offs aren't purely technical — they involve product decisions (e.g., is 60s stale data acceptable to a vet?). The user is the right person to answer.

---

## Notable gotchas to know about

1. **Vercel Function Region is dashboard-controlled, not code-controlled.** The `regions: ["bom1"]` in `vercel.json` documents the intent but does NOT change deployment. User must set it in Vercel UI: Settings → Functions → Function Region → Mumbai. Coordinate this when ready.
2. **Subdomain rewrites in `vercel.json`** — these are critical for production multi-portal routing. Don't accidentally remove them when editing the file.
3. **CSP header in `next.config.ts`** — long, easy to accidentally break. Don't reformat the array unless intentionally changing CSP. There's a working `connect-src` already; verify any deploy doesn't strip it.
4. **`@supabase/ssr` cookie behavior** — middleware sets cookies; pages read them. The `getUser()` pattern in middleware is required for security (don't replace with `getSession()`). This is referenced multiple times in the audit (F-04).
5. **Realtime subscriptions in `useVetDashboardRealtime.ts`** — the vet portal has 4-6 simultaneous channels per vet. Batch 10 (F-10) consolidates these but it's the highest-risk change. Read the file thoroughly before editing.
6. **`force-dynamic` removal carries risk** — pages that read user-specific data cannot be ISR-cached at the route level. Batch 8 (F-15) needs careful per-page analysis.

---

## Where the user goes from here

When you (Claude Code) finish Stage 1, do these wrap-up steps:

1. Capture an informal "after" DevTools network snapshot of the customer dashboard.
2. Update the relevant findings in `PERFORMANCE_AUDIT.md` with measured outcomes (so the audit reflects actual results, not just predictions).
3. Open a PR for `perf/audit-fixes` → `main`. Include in the PR description: which findings were addressed, summary of measurements, anything deferred.
4. Tell the user Stage 1 is complete and we're at the Stage 1 → Stage 2 gate.

The user will then come back to Cowork (or stay in Claude Code, their preference) to plan Stage 2: production/testing environment separation.

---

## Tone the user prefers

- Plain language for trade-offs and decisions.
- Technical precision for code.
- "Plan with risk analysis, then approve, then execute."
- Don't surprise them. Surface decisions before making them, not after.
- It's fine to ask questions. It's not fine to silently choose between two reasonable options.
- If you find something genuinely concerning during execution (e.g., a security issue not covered by the audit), surface it immediately rather than fold it into a batch.

---

## End of handoff

Go read the three reference documents before any code action. After that, the immediate first actions sequence above will get you committed and ready to start Batch 2.

If you hit anything ambiguous, the user is friendly and patient — ask.

— Cowork session, signing off
