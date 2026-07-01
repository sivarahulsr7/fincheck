# FinCheck — Full Application Audit

> **Status (fix pass complete).** Tier 1 and Tier 2 fully fixed and verified
> (91 unit tests). Tier 3: PIN lock bypass, biometric onboarding, and
> change-PIN verification fixed; committed `firestore.rules` (requires auth) —
> **must be deployed once** with `firebase deploy --only firestore:rules`.
> **Deliberately deferred** (documented at the bottom): (a) full multi-tenant
> collection restructure — would strand existing data; the auth-required rules
> close the public hole for this single-user app; (b) PIN plaintext→hash —
> needs a legacy-compare migration or it locks the user out. `onPointerDown`
> on the sub-tabs was kept (it fixed the earlier "tabs freeze" report).


A harsh, exhaustive review of the entire app by 5 parallel reviewers (data/state layer, Money section, Wealth section, app shell/auth, shared components/config). Findings are grouped by **fix tier** (blast radius), then listed by subsystem with severity, location, problem, and fix.

**Guiding constraint:** there is real financial data in a working app. No fix may strand or corrupt it. "Fix everything" = make it better without breaking what works.

---

## Cross-cutting root causes (one bug, many symptoms)

| # | Root cause | Symptoms across the app |
|---|-----------|--------------------------|
| R1 | **UTC vs local dates.** `formatters.js` stamps/boundaries via `toISOString()` (UTC); `DatePicker` uses local fields. | Late-night (00:00–05:30 IST) transactions land on the wrong day/month; "This Month" filter excludes them; Budget spend range wrong; Insights bars mis-bucketed; "Today"/"Yesterday" headers mislabel. |
| R2 | **Non-atomic balance writes.** Read-modify-write on account balances, not batched, not `increment()`. | Same-account transaction edits silently drift the balance; partial write on a transfer can make money vanish. |
| R3 | **PIN lock is not a security control.** 3 wrong attempts *unlocks* + resets; PIN stored plaintext; change needs no current PIN. | Anyone holding the phone gets full access to finances. |
| R4 | **Compact number format drops the sign.** `Math.abs` in `fmt` compact branch. | Negative amounts render as positive (`-₹5000` → `₹5.0K`). |
| R5 | **Privacy toggle leaks.** Chart tooltips + Allocation TOTAL bypass `<Amount>`. | With balances hidden, hovering charts / reading TOTAL exposes exact ₹ figures. |

---

## TIER 1 — Pure logic/presentation, zero data risk

### Timezone (R1)
- **formatters.js:34,45,52,66** — `todayISO`, `startOfMonth`, `endOfMonth`, `nDaysAgo` use UTC `toISOString()`. Fix: extract one local `toISO(date)` helper (same as `DatePicker.toISO`) and use everywhere. Rewrite `formatters.test.js` (current test compares UTC-to-UTC, can't catch this).
- **formatters.js:18,24** — `fmtDate`/`fmtMonth` parse `new Date('YYYY-MM-DD')` as UTC. Fix: local parse.
- **formatters.js:37-38** — `monthKey` parses string as UTC then reads local getMonth. Fix: local parse.

### Presentation / correctness
- **formatters.js:2-5 (R4)** — compact `fmt` drops sign. Fix: prefix `-` when value < 0.
- **Wealth/NetWorthHistory.jsx:45; Wealth/Allocation.jsx:54,90 (R5)** — chart tooltips + TOTAL bypass `Amount`. Fix: honor `balancesHidden`.
- **Wealth/NetWorthHistory.jsx:53** — negative net worth hard-coded `text-green`. Fix: conditional red/green.
- **Wealth/Liabilities.jsx:58** — liability type label hand-rolled (`replace('loan',' Loan')` → "Creditcard"). Fix: look up a shared `LIABILITY_TYPES` in constants.
- **Overview.jsx:146** — hardcoded fake `-2.5%` trend next to Wealth card. Fix: remove.
- **Overview.jsx:194** — `mExpense / Math.max(mIncome,1)` → "500000%" when income 0. Fix: distinct "No income" message.
- **Money/Transactions.jsx:116-128** — CSV export only escapes description; commas in account/category names break columns. Fix: `csvEscape` on every field.
- **Goals.jsx:45; Import.jsx:205 (Shared H2)** — no `safe-area-inset-top`; headers clip under notch. Fix: add inset padding.
- **Money/Budget.jsx:43-45** — `getSpent` runs O(budgets×transactions) per render, unmemoized. Fix: one memoized `spentByCategory` map.
- **Amount.jsx:7 (Shared M1)** — hidden branch still applies `text-red`/`text-green`, leaking sign. Fix: drop semantic color when hidden.
- Dead code: `Transactions.jsx:7` unused `fmt`/`fmtDate`; `useFinanceStore.js:9` unused `monthKey`; `GoalForm.jsx:5` unused `todayISO`; `constants.js:54-59` unused `RECURRING_FREQ`; `useFinanceStore.js:368-377` dead `getCashflow`.

---

## TIER 2 — Data-touching (one cluster at a time, verify each)

### Money
- **Transactions.jsx:33,104-114,231-271 (C1)** — bulk-select delete is fully wired but **unreachable** (nothing sets `selectMode=true`). Fix: add a "Select" trigger + Cancel.
- **Transactions.jsx:43-62 (H1)** — search runs *inside* type+month filters, so it can't find income/transfers/old records. Fix: when searching, bypass type/month filters.
- **Budget.jsx:20-28 vs 30-38 (H3)** — `currentMk`/`monthLabel` use `setMonth` without pinning day → overflow desyncs header from spend range on 29–31. Fix: `setMonth(m+offset, 1)`.
- **Transactions.jsx:75-79 (M1)** — `monthlyAvg` ignores filters, divides by months-with-expenses not elapsed. Fix: clarify semantic.
- **TransactionForm.jsx:28-30 / DatePicker (M3)** — future dates allowed; they hit balances but fall outside windows. Fix: cap at today.
- **Budget.jsx:48,131-132 (L1)** — `limit: 0` is saveable → contradictory "0% but OVERSPENT". Fix: validate `Number(limit)>0`.

### Wealth
- **NetWorthHistory.jsx:34,12-36 (C1)** — back-projects today's assets/liabilities onto every past month (ignores purchaseDate/startDate). See Tier 3 note — needs approach decision.
- **NetWorthHistory.jsx:27-29 (C2)** — rollback assumes all balance change came from transactions; seeded/manually-edited balances corrupt history.
- **Liabilities.jsx:50-51,75 (M3)** — payoff bar hidden when `originalAmount` missing and when fully paid (outstanding 0). Fix: handle both.
- **Assets.jsx:88-89; AssetForm.jsx:19 (M4)** — invested=0 assets can't be entered / show +0%. Fix: allow invested 0 when currentValue>0.

### Data layer
- **useFinanceStore.js:120-123 (H3)** — `deleteAccount` orphans transactions; balances become unreversible. Fix: block or cascade in a batch.
- **useFinanceStore.js:361-366 (M2)** — `getNetWorth` sums credit-card balances as assets while Overview/Allocation exclude them. Fix: one credit-card sign convention across all three.
- **useFinanceStore.js:311-358 (M3)** — `convertInvestmentsToAssets` not idempotent (double-click → duplicate assets). Fix: deterministic asset id from source tx id, or migration flag.
- **useFinanceStore.js:149-224,364 (M5)** — `Number(amount)` NaN poisons balances permanently. Fix: `Number.isFinite` guard at boundary.
- **useAppStore.js / createdAt (M1)** — `createdAt` is number for transactions, string elsewhere. Fix: epoch ms everywhere.

### App shell
- **App.jsx:28-34 (#3)** — `visibilitychange` locks on **foreground** (`!document.hidden`), leaking the task-switcher snapshot and wiping in-progress forms (Import file picker). Fix: lock on `document.hidden`.
- **Import.jsx:84 (#4)** — `parseFloat(tx.amount)` no fallback → NaN into Firestore. Fix: `|| 0` + skip invalid.
- **Import.jsx:61-143 (#5)** — no schema validation; >500 writes exceeds batch limit and fails wholesale. Fix: validate shape, chunk batches ≤500.
- **LoginScreen.jsx:8-12; useAuthStore.js:29-40 (#10)** — redirect fallback leaves `loading` stuck; redirect errors swallowed. Fix: surface errors, reset loading.
- **App.jsx:137-141 (#6)** — `innerPage`/`fabAction` not reset on tab change (latent stuck-screen). Fix: reset on tab change.

---

## TIER 3 — Do NOT blind-apply (verify at runtime / decide approach first)

### R2 — Balance atomicity (useFinanceStore.js:126-226, C3/C4)
Same-account edit drift is a **real bug**. Correct fix is `writeBatch` + `increment(delta)` so balances are server-atomic and no stale client read is needed. **Must verify at runtime**: add expense → edit amount on same account → balance correct; confirm onSnapshot doesn't double-apply after `increment()`. A green build proves nothing.

### R3 — PIN (useAppStore.js:23-32; PinLock.jsx; Settings.jsx:50-72)
- **Bypass (high value, low risk):** 3 wrong attempts must NOT unlock. Require Google re-auth to reset. **Do this.**
- **Plaintext→hash (HOLD):** needs a legacy-compare migration or it locks the user out of their own app. Skip unless migration included.
- **Change-PIN needs current PIN (medium):** add verification.
- **Biometric onboarding dead code (PinLock.jsx:86-89):** `setPin` unlocks before the prompt can render. Fix: defer unlock until prompt resolved.

### C1/C2 — Multi-tenancy (Firestore)
All collections are global (no `users/{uid}/…`); no committed `firestore.rules`. Any signed-in user reaches everyone's data. **Restructuring collections strands existing data.** First: check what rules are actually deployed. Low-risk step = commit a `firestore.rules` requiring auth (and, if the app is public, scoping to uid) rather than a collection restructure. Decide before touching.

---

## Confirmed NON-issues (do not "fix")
- Forms don't carry stale state — `BottomSheet` returns `null` when closed, so children unmount/remount.
- Both NetWorthHistory & Allocation datasets are memoized; all `.map` keys present; Allocation `other` bucket doesn't double-count.
- Transfer omission from net-worth rollback is correct *because* the chart sums all accounts (fragile invariant — add a comment).
- Firebase Web API key is a public client identifier, not a leaked secret; `.env` is gitignored.
- `onPointerDown` on tabs is intentional (fixes the earlier "tabs freeze" complaint) — do NOT revert to onClick per Money N3.
- Rollup native-binding pin currently in sync; document why it exists.
