# Page-load measurement protocol

Defined in Phase 0 (audit OBS-3). Every phase from here on re-runs this
exactly and commits the result to `docs/perf/<date>-<phase>.md`, so the
numbers are comparable. Do not change the pages, the order or the counting
rules without noting it in the results file.

## What is measured

| Metric | Definition | Source |
|---|---|---|
| TTFB | `navigation.responseStart` — first byte of HTML after a hard reload | `performance` API |
| DCL | `navigation.domContentLoadedEventEnd` — HTML parsed, sync scripts run | `performance` API |
| Settled | latest `responseEnd` of any request made by the page, sampled 8 s after load — when the screen stops changing | `performance` API |
| Supabase calls | requests to `*.supabase.co` or `api.furrie.in`, split into `/auth/v1/`, `/rest/v1/`, `/realtime/v1/` | `performance` resource entries |
| API routes | same-origin requests under `/api/` | `performance` resource entries |
| Server time | function duration for the matching route | Vercel Observability → Functions (Observability Plus on since 2026-09-14) and Sentry → Performance → transaction |

All times are milliseconds from navigation start. Report the **median of
three** hard reloads per page, and keep the three raw rows.

## Accounts

- **Test customer**: any customer account with at least one pet and one past
  consultation (so the dashboard and lists are not empty). Sign in with the
  emailed code at `https://app.furrie.in/login`.
- **Test vet**: a vet account created from the admin portal
  (`https://admin.furrie.in` → Vets → Add vet). Sign in with the emailed
  temporary password at `https://vet.furrie.in/login`. Assign the test
  customer's past consultation to this vet if the lists would otherwise be
  empty.

Gerard signs in; the agent never types credentials.

## Pages (in this order)

| # | Page | URL | Signed in as |
|---|---|---|---|
| 1 | Customer dashboard | `https://app.furrie.in/dashboard` | customer |
| 2 | Consultations list | `https://app.furrie.in/consultations` | customer |
| 3 | Consultation detail | `https://app.furrie.in/consultations/<id>` (a closed one) | customer |
| 4 | Vet dashboard | `https://vet.furrie.in/dashboard` | vet |
| 5 | Vet patient detail | `https://vet.furrie.in/patients/<petId>` | vet |
| 6 | Login → dashboard transition | `https://app.furrie.in/login` then verify the code | customer |

## Procedure for pages 1–5

1. Open the page in the Browser pane (or Chrome with DevTools → Network,
   **Disable cache** ticked).
2. Hard reload (Ctrl+Shift+R). Wait 8 seconds.
3. Run the snippet below in the console (or via the Browser pane's JavaScript
   tool) and copy the JSON line it prints.
4. Repeat steps 2–3 twice more (three rows per page).
5. In Vercel → project `furrie` → Observability → Functions, note the p50
   duration for the route that rendered the page (e.g. `/customer-portal/dashboard`)
   over the last hour. In Sentry → Performance, note the p50 for the same
   transaction. Record both as "Server time".

```js
(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const res = performance.getEntriesByType('resource');
  const isSupabase = (r) => /supabase\.co|api\.furrie\.in/.test(r.name);
  const sb = res.filter(isSupabase);
  const count = (re) => sb.filter((r) => re.test(r.name)).length;
  const api = res.filter((r) => {
    try { const u = new URL(r.name); return u.origin === location.origin && u.pathname.startsWith('/api/'); } catch { return false; }
  });
  const settled = Math.max(nav.loadEventEnd, ...res.map((r) => r.responseEnd));
  const row = {
    page: location.pathname,
    ttfb: Math.round(nav.responseStart),
    dcl: Math.round(nav.domContentLoadedEventEnd),
    settled: Math.round(settled),
    supabase: sb.length,
    auth: count(/\/auth\/v1\//),
    rest: count(/\/rest\/v1\//),
    realtime: count(/\/realtime\/v1\//),
    apiRoutes: api.length,
    requests: res.length,
  };
  console.log(JSON.stringify(row));
  return row;
})();
```

Notes on counting: the `performance` buffer holds 250 resource entries by
default, which is enough for every page in this list. Realtime WebSocket
upgrades do not appear as resource entries; the `realtime` count only
reflects HTTP calls to `/realtime/v1/` (channel auth).

## Procedure for page 6 (login → dashboard)

Wall-clock, not the `performance` API, because it spans two documents.

1. Sign out. Open `https://app.furrie.in/login`, enter the email, request
   the code, and get the code from the inbox **before** starting the clock.
2. In DevTools → Network, tick **Preserve log** and clear the log.
3. Type the code. Start a stopwatch (or note `performance.now()` in the
   console of the login page) at the moment the verify button is pressed.
4. Stop when the dashboard has finished loading: no spinner, unread count
   shown, no request in flight in the Network panel.
5. Record: total seconds, the number of requests in the Network log, and the
   number of those to `*.supabase.co` / `api.furrie.in`.
6. Repeat three times (sign out between runs). Each run needs a fresh code.

## Results file format

```
# <date> — <phase name>
Measured on: <date/time IST>, <browser>, <network: wifi/4G>, production (<deployment id>)
Accounts: customer <masked email>, vet <masked email>

| Page | Run | TTFB | DCL | Settled | Supabase (auth/rest/rt) | /api | Server p50 (Vercel / Sentry) |
|---|---|---|---|---|---|---|---|
| Customer dashboard | 1 | … |
| Customer dashboard | 2 | … |
| Customer dashboard | 3 | … |
| Customer dashboard | median | … |
…
| Login → dashboard | 1 | — | — | <seconds> | <count> | <count> | — |
```
