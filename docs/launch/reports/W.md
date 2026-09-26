# W report: Website and front door

Agent W · Phase B · 2026-09-27. Plan: `furrie-launch/plans/W-plan.md`. Approval: `furrie-launch/approvals/W.md` (incl. Amendment 1). Gerard's "go" given in the W session on 2026-09-27.

| | PR | Branch | CI | Merge |
|---|---|---|---|---|
| **W-app** | https://github.com/gerrardelliot83-create/furrie/pull/55 | `launch/w-app` (from `origin/main@e1cb38b`) | **green**: `typecheck · lint · build · audit` pass, Vercel pass, GitGuardian pass | as soon as the CTO passes it |
| **W-site** | https://github.com/gerrardelliot83-create/furrie-marketing/pull/1, title starts "DO NOT MERGE until switch-over go" | `launch/w-site` (from `origin/main@57d3464`) | Vercel preview pass, GitGuardian pass (repo has no CI workflow) | **only on the CTO's switch-over go** |
| Redesign kept | branch `wip/founding-seat-redesign` (`646a7ef`, parent `12ca801` = the exact laptop files) | — | **no Vercel deployment** (see S0) | never |

Previews (behind Vercel login): W-app https://furrie-git-launch-w-app-aeneshs-projects.vercel.app · W-site https://furrie-marketing-git-launch-w-site-aeneshs-projects.vercel.app

## In plain English

- **furrie.in** now sends every button to sign-up (`app.furrie.in/login`). Old `/waitlist` links forward there, and the waitlist form no longer takes names. Every untrue sentence is rewritten as approved. `/terms` shows the app's current Terms. The share image and tab icon no longer 404. **It goes live only when the CTO says go.**
- **The app** gets a proper home-screen icon (navy paw on cream) and one brand colour (navy). The browser tab shows the Furrie paw instead of Vercel's triangle. The notification bell loads once per page instead of twice.
- **The welcome email** every new customer gets no longer promises "24/7", "anytime" or an ask-a-vet feature. Neither does the missed-consultation email.
- Nothing touches the database, payments or anything the parked mobile apps call. No test accounts or rows were created.

## Commits

### W-app (`furrie`, PR #55)

| Commit | ID | What |
|---|---|---|
| `3c68a0f` | W-A1 | `manifest.json`: `id`, `scope`, icons 192/512 + maskable 512, background `#fbfcee`, theme **`#010f3a`**, true description. New `public/icons/*` + `public/apple-touch-icon.png` (paw from the existing logo). `layout.tsx`: `themeColor #010f3a`, `appleWebApp.title "Furrie"`. |
| `d285c75` | W-A2 (B-08) | `CustomerLayout`: `NotificationBell` rendered only in the visible slot (`useIsDesktop()` = `useSyncExternalStore` + `matchMedia('(min-width: 768px)')`). |
| `19df3a0` | W-A3 | `robots.txt`: allow `/login` + `/_next/static/`, disallow the rest; no wrong sitemap line. |
| `e8bfb48` | W-A4 | Metadata + login tagline: no "on-demand", no "when you need it". |
| `1426035` | W-A5 | `src/app/favicon.ico`: Vercel triangle → paw (16/32/48). CTO exception Q-C2a. |
| `d67c47b` | W-A7 (R1) | `templates.ts` text only: welcome email (3 lines), missed-consultation email (1 sentence). CTO exception Q-C2b. |
| (this commit) | W-A6 | This report + backlog rows W-1…W-12. |

### W-site (`furrie-marketing`, PR #1)

| Commit | ID | What |
|---|---|---|
| `fadd8b3` | W-S1 | 6 CTAs → `https://app.furrie.in/login`; `/waitlist` → app login (307); sitemap drops `/waitlist`. |
| `9517ec4` | W-S2 | `POST /api/waitlist` → 410 "Furrie is open. Sign up at app.furrie.in with the same email you joined with." No writes, no key read. D6 reference table in the commit message. |
| `4cb7553` | W-S3 | Homepage copy = table C + Amendment 1. Removed the Ask-a-Vet slide/mockup/dot, the 87% ring, both stat rows and the Annual Checkup and rabbit rows. `main.js` guard, `?v=4`. |
| `f6c9307` | W-S4 | Footer links (`/privacy` → Terms was `#`, `/terms` → Privacy was `/`); contact `support@furrie.in`. |
| `b5f280d` | W-S5 | `images/og-image.png` (logo on sage, 1200×630), `favicon.ico` (existing 16/32 PNGs). |
| `5ac086d` | W-S6 | `/terms` → `https://app.furrie.in/terms` (307). |
| `ed2b216` | W-S7 | `CLAUDE.md`: dated launch-state note; file-tree line for the API says 410. |

### S0: redesign preserved (no PR)

Done in `C:\Users\Aenesh\Desktop\furrie-marketing` with a temporary index only (`GIT_INDEX_FILE` in the session scratchpad): `read-tree HEAD` → `add -A` → `write-tree` → `commit-tree -p HEAD` = `12ca801` (all 9 files byte-identical to the working tree, checked by SHA-256). Then `646a7ef` on top changes only this branch's `vercel.json` (`"git": { "deploymentEnabled": false }`). `git branch wip/founding-seat-redesign 646a7ef` and push.

`git status` + file hashes + `HEAD` + SHA-256 of `.git/index`, **before and after (identical, `diff` empty):**

```
## main...origin/main
 M CLAUDE.md
 M api/waitlist.js
 M css/styles.css
 M index.html
 M js/main.js
 M sitemap.xml
 M waitlist.html
?? api/_supabase.js
?? api/waitlist-count.js
---sha256
78c1383a…f9d4 *CLAUDE.md
97582dfc…688b *api/waitlist.js
d0d5065e…4929 *css/styles.css
70d8c678…8537 *index.html
7c9bdcba…75fa *js/main.js
7a559ef3…a9a3 *sitemap.xml
6b92bad7…a5ed5 *waitlist.html
a560b54e…5065 *api/_supabase.js
8f6fdab0…20ba *api/waitlist-count.js
---HEAD
57d3464619c8607311dc6e77b9a4bf3c5169dce7
---real index sha
ff72c252…d425 *.git/index
```

Vercel: GitHub's deployments API for furrie-marketing lists a Preview for `launch/w-site` (`ed2b216`, created within minutes of its push) and **none** for `wip/founding-seat-redesign` / `646a7ef` (0 deployments, 0 commit statuses). Gerard can confirm in Vercel → furrie-marketing → Deployments: no row for that branch.

## Exit criteria

| Criterion | Evidence | Met |
|---|---|---|
| W-app PR green | #55: `typecheck · lint · build · audit` pass (1m52s), Vercel pass. Locally: typecheck 0 errors, lint 0 errors (12 existing warnings), build OK, `npm audit --audit-level=high` exit 0. | yes |
| Manifest valid, icons, no errors | `next start` probe: `/manifest.json`, `/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `/apple-touch-icon.png`, `/favicon.ico`, `/robots.txt` all 200 with the right types. Manifest parses; icons are the declared sizes, PNG, opaque. `theme_color` = `themeColor` = `#010f3a`. Rendered `<head>` of `/customer-portal/login`: `theme-color #010f3a`, `<link rel="manifest">`, `apple-touch-icon`, `apple-mobile-web-app-title Furrie`, `mobile-web-app-capable yes`, favicon links. **Chrome DevTools → Manifest on the preview: Gerard.** | yes / Gerard's check pending |
| Bell mounted once | Real browser against `next start` (`/customer-portal/terms`, signed out, renders `CustomerLayout`): 375 px → 1 bell in `mobileHeaderRight`, 1 `/api/notifications?count_only=true`; 1280 px → 1 bell in `topBar`, 1 request; resized 375 → 1100 without reload → still 1 bell, moved to `topBar` (the remount makes one more request). Before: 2 bells, 2 requests per load. | yes |
| robots.txt correct | Served text = W-A3. | yes |
| W-site PR open with preview URL | #1, preview above. | yes |
| Every changed line traceable to the approved copy table | W-S3 diff = table C "after" column with Amendment 1 (D8 no GST, D9 "registered", W1 wording). Phrase scan of `index.html`: no free (except W1 ×2), invite-only, beta, 24/7, anytime, midnight, rabbit, Priya, 87/72%/3x, <10, "certified vets", "verified network", "skip the line", GST, or §6 banned words. Local render at 1440/1024/768/375 px: no horizontal scroll or overflowing element; 6 Sign-up links → app login; 0 `/waitlist` links; the pinned slider steps 0→1→2→3 with matching mockups and dots; no console errors. | yes; **Gerard reviews the copy on the preview** |
| `wip/founding-seat-redesign` pushed, laptop tree unchanged | S0 above. | yes |
| Email copy + sending method approved | **Dropped by Amendment 1**: Gerard contacts the 5–10 waitlist members himself and grants credits by hand. Table E in the plan stays as a draft he may reuse. If he does, change "the free consultation will be in your account" to "we'll add your free first consultation". | n/a |
| Nothing merged or sent | Neither PR merged; no email or message sent; no SQL run; no Supabase tool used. | yes |

## Database

None. No migration, no rollback, no query. Per Amendment 1 there is no waitlist export or founding cut-over. W never queries the waitlist table.

## Gerard's steps

**W-app (now)**
1. Open https://furrie-git-launch-w-app-aeneshs-projects.vercel.app/manifest.json (sign in to Vercel if asked). You should see `"theme_color": "#010f3a"` and three icons.
2. Open https://furrie-git-launch-w-app-aeneshs-projects.vercel.app/ in Chrome on a computer. The page says 404, which is normal for app previews. Right-click → **Inspect** → **Application** tab → **Manifest**: Name "Furrie", three paw icons, no errors. Close it.
3. When the CTO says pass: GitHub → furrie → Pull requests → **#55** → **Merge pull request**. Vercel deploys in a couple of minutes.
4. After it's live, on your **Android phone** (Chrome):
   - Open app.furrie.in → ⋮ → **Install app** (or **Add to Home screen**). The icon is a navy paw on cream, named "Furrie".
   - Open it from the home screen. The top bar is navy. Sign in with the email code. Open **Buy consultations** and tap the UPI button: your UPI app opens (cancel, don't pay). Try WhatsApp, which opens WhatsApp.
   - If you have a booked slot, join it from the home-screen icon and allow camera/mic.
5. On an **iPhone** (Safari): Share → **Add to Home Screen**. Paw icon, "Furrie". Open it and sign in.
6. On the phone and on a laptop: only **one** bell at the top of the customer app. The laptop browser tab shows the paw.

**W-site (now)**
7. Open https://furrie-marketing-git-launch-w-site-aeneshs-projects.vercel.app on your phone and a laptop.
   - Tap every **Sign up** (top bar, menu, hero, How it works, Getting started, bottom). Each should open the app's login page.
   - Add `/waitlist` to the address. It should open the app's login page.
   - Add `/terms`. It should open the app's Terms.
   - Scroll to the footer on `/privacy`. **Terms** and **Privacy** should work.
   - Read every line. Tell the CTO any line to change. **Don't merge.**
8. Optional: Vercel → furrie-marketing → **Deployments**. There should be no row for `wip/founding-seat-redesign`.

**Switch-over (only on the CTO's go)**, in the order from the approval:
- [ ] S-1 (SQL + code) merged
- [ ] V-1 and W-app #55 merged
- [ ] Your end-to-end launch test
- [ ] `support@furrie.in` reaches you (done 27 Sep)
- [ ] CTO's **go**
- [ ] GitHub → furrie-marketing → PR **#1** → **Merge pull request**. Then wait for Vercel → furrie-marketing → Deployments → Production "Ready".
- [ ] Phone check: www.furrie.in → **Sign up** opens app.furrie.in login; www.furrie.in/waitlist opens app login; the page shows "Open for sign-ups".
- [ ] You message the waitlist members yourself and grant each one credit by hand (Admin → Users → Give credits), matched on the email they signed up with.

## Deviations from the approved plan

| What | Why |
|---|---|
| W-app is built on `origin/main@e1cb38b`, not `603b4f1` | PR #54 (L1.1, all-inclusive prices) merged after the approval was written. None of #54's files overlap with W's. |
| C9 reads "₹499 / per consultation" (no "plus GST"); C7/C19/C41 use "registered vet"; W1 reads "Joined our waitlist? Sign up with the same email you joined with, and we'll add your free first consultation." | Amendment 1 |
| No waitlist size query, CSV export, founding cut-over, Resend Broadcast or +alias test | Amendment 1 (Gerard handles the 5–10 members by hand; never query the waitlist table) |
| W-A7 removes the whole "Ask a vet anything" `<li>` line rather than rewording it | That was the approved draft ("drop the Ask-a-vet bullet"). The other three changes are text only. |
| Manifest description (C-A4) went into W-A1, not W-A4 | The manifest was rewritten in one commit |
| W-S7 also changes the `CLAUDE.md` file-tree line for `api/waitlist.js` | Otherwise it still said "→ Supabase", which W-S2 made untrue |
| Bell verified on `/customer-portal/terms` locally, not a signed-in dashboard | No local Supabase; that page is public and renders the same `CustomerLayout` |
| W-site layout checked numerically (overflow, sizes, slider state), not by screenshots | The browser pane was hidden, so frames didn't render reliably. Gerard's preview read-through covers the visual check. |

## Backlog added (`docs/audits/backlog.md`)

W-1 Plus emails promise unlimited/priority · W-2 VetLayout double bell · W-3 duplicated Terms line on login · W-4 signed-out Terms/Privacy in the app shell · W-5 "is waiting for you" / "All our veterinarians are fully booked" · W-6 legacy `#770002` on error pages · W-7 welcome email "Every consultation ends with a plan" / "our vets" · W-8 one manifest for three hosts · W-9 furrie.in canonical apex vs www · W-10 delete unreachable `waitlist.html` / `terms.html` (D6) · W-11 remove the marketing Supabase keys from Vercel after the waitlist is handled · W-12 furrie-marketing `main` can't be branch-protected on the free plan; any merge deploys production.

## Test accounts and rows created

None. The only external writes are the two pushed branches, the pushed `wip/founding-seat-redesign` branch and the two PRs.
