# FinCheck — Product Gap Analysis (PM layer)

A product-management review of every feature: not code bugs (see `AUDIT.md`)
but **what's missing, what's shallow, and what would make each feature actually
useful.** Pick items by ID (e.g. "do TXN-1, LIA-2, REC-1") and I'll implement.

**Legend**
- Priority: **P0** core/table-stakes gap · **P1** high value · **P2** nice · **P3** polish
- Effort: **S** (hours) · **M** (~a day) · **L** (multi-day / data-model change)
- 💰 = needs care to stay 100% free (flagged); everything else is free-safe.

---

## Recurring & automation — *the single biggest missing feature*
The app has a dead `RECURRING_FREQ` constant but **no recurring transactions at all.** For a finance app this is table-stakes: salary, rent, EMI, SIP, subscriptions all repeat.

| ID | Gap | Why it matters | P | Effort |
|----|-----|----------------|---|--------|
| REC-1 | **Recurring transactions** (salary/rent/EMI/SIP auto-post monthly/weekly) | Removes the #1 chore; makes budgets & cashflow forecasts real | P0 | L |
| REC-2 | **Upcoming/scheduled view** — see what's due this month before it posts | Cashflow planning | P1 | M |
| REC-3 | **Auto-link recurring EMI → liability & SIP → asset** (reuses the linking engine) | Loans/assets stay current with zero effort | P1 | M |
| REC-4 | **Bill reminders / due-date alerts** (PWA push via FCM — free) | Avoid missed payments/late fees | P1 | M 💰(FCM free tier) |

---

## Transactions
| ID | Gap | Why it matters | P | Effort |
|----|-----|----------------|---|--------|
| TXN-1 | **Split transactions** (one payment → multiple categories) | Real receipts aren't single-category (grocery run = food + household) | P1 | M |
| TXN-2 | **Date-range & amount-range filters** in search | Current filters are type/month/account/category only | P2 | S |
| TXN-3 | **Tags** (many-to-one) in addition to category | Cross-cutting views (e.g. "trip to Goa" across categories) | P2 | M |
| TXN-4 | **Receipt/photo attachment** | Proof for warranties, reimbursements, taxes | P2 | M 💰(needs storage — Firebase Storage has a free tier; or store as compressed base64) |
| TXN-5 | **Quick-add presets / templates** (repeat common txns in 1 tap) | Speed; most txns are repeats of a few | P2 | S |
| TXN-6 | **Undo / trash** for deletes (soft-delete) | Deletes are irreversible today; one mis-tap loses data | P1 | M |
| TXN-7 | **Bulk edit category/account** (not just bulk delete) | Re-categorizing imported data | P3 | S |

---

## Budgets
| ID | Gap | Why it matters | P | Effort |
|----|-----|----------------|---|--------|
| BUD-1 | **Near-limit alerts** ("80% of Food budget used") | A budget you don't get warned about is passive | P1 | M 💰(push, or in-app) |
| BUD-2 | **Rollover / envelope budgets** (unspent carries forward) | Popular, sticky budgeting model | P2 | M |
| BUD-3 | **Overall monthly budget** (not just per-category) | Many users think top-down first | P2 | S |
| BUD-4 | **Auto-budget templates** (50/30/20, or "same as last month") | Removes the blank-slate problem | P2 | S |
| BUD-5 | **Budget vs actual trend** over months | See if you're improving | P2 | M |
| BUD-6 | **Income-aware budgets** (% of income) | Adapts when income varies | P3 | M |

---

## Insights & reporting
| ID | Gap | Why it matters | P | Effort |
|----|-----|----------------|---|--------|
| INS-1 | **Savings rate** (income − spend) / income, tracked monthly | The single most motivating personal-finance number | P1 | S |
| INS-2 | **Month-over-month comparison** ("Food ↑ 23% vs last month") | Turns data into insight | P1 | M |
| INS-3 | **Top merchants / descriptions** | Where money actually goes beyond category | P2 | S |
| INS-4 | **Cashflow forecast** (project month-end from recurring + trend) | Forward-looking, not just historical | P2 | M (needs REC-1) |
| INS-5 | **Yearly summary / annual report** (great for review & taxes) | High-value once/year moment | P2 | M |
| INS-6 | **Full PDF/report export** | Sharing, records, taxes | P3 | M |

---

## Assets / Investments
| ID | Gap | Why it matters | P | Effort |
|----|-----|----------------|---|--------|
| AST-1 | **Returns math: absolute + XIRR/CAGR** per asset & portfolio | "Am I actually growing?" — current app only shows raw gain | P1 | M |
| AST-2 | **SIP tracking** (recurring contribution schedule per asset) | Most retail investing is SIP | P1 | M (needs REC-1) |
| AST-3 | **Manual price update reminder / quick-update sheet** | `currentValue` is manual and goes stale | P2 | S |
| AST-4 | **Live price refresh** for MF/stocks/crypto | Removes manual updates entirely | P2 | L 💰(free APIs exist but rate-limited/unofficial — must vet) |
| AST-5 | **Target allocation & rebalancing hints** ("equity 8% over target") | Turns the allocation pie into advice | P2 | M |
| AST-6 | **Asset income (dividends/interest) tracking** | Completes the return picture | P3 | M |

---

## Liabilities / Loans
| ID | Gap | Why it matters | P | Effort |
|----|-----|----------------|---|--------|
| LIA-1 | **Amortization schedule + payoff date** (see remaining months, interest ahead) | Makes a loan tangible; you asked about principal accuracy — this is its natural extension | P1 | M |
| LIA-2 | **Interest-paid-to-date** (split of everything you've paid) | Real cost of the loan | P1 | S |
| LIA-3 | **Prepayment impact calculator** ("pay ₹1L extra → save ₹X, finish 8 mo early") | Highly motivating, drives good behavior | P1 | M |
| LIA-4 | **Multi-loan payoff strategy** (snowball vs avalanche) | For users with several debts | P2 | M |
| LIA-5 | **"Recalculate outstanding from repayments"** (the retroactive fix we discussed) | Corrects a loan after setting interest late | P2 | M |
| LIA-6 | **Credit-card as a first-class liability** (limit, due date, utilization, statement) | Cards are the most common debt; currently only a generic account | P1 | L |

---

## Net worth
| ID | Gap | Why it matters | P | Effort |
|----|-----|----------------|---|--------|
| NW-1 | **Real monthly net-worth snapshots** (persist each month) | Current history is *reconstructed* & approximate (see AUDIT C1/C2); snapshots make the trend true | P1 | M |
| NW-2 | **Net-worth goal + trajectory** ("₹1Cr by 2030, on track?") | A north-star metric | P2 | M |
| NW-3 | **Assets-vs-liabilities trend** (two lines, not one) | Matches your new A/L framing | P2 | S |

---

## Goals
| ID | Gap | Why it matters | P | Effort |
|----|-----|----------------|---|--------|
| GOA-1 | **Auto-progress from linked account/asset** (not manual `currentAmount`) | Manual updates = stale, abandoned goals | P1 | M |
| GOA-2 | **Projected completion date** (from contribution rate) | Makes goals feel achievable/urgent | P1 | S |
| GOA-3 | **Scheduled contributions** (auto-move toward goal) | Automation = success | P2 | M (needs REC-1) |

---

## Accounts
| ID | Gap | Why it matters | P | Effort |
|----|-----|----------------|---|--------|
| ACC-1 | **Reconciliation** ("set actual balance", log the adjustment) | Balances drift from reality; today editing balance silently desyncs the ledger | P1 | M |
| ACC-2 | **Transfer history / between-accounts view** | Transfers exist but aren't summarized anywhere | P3 | S |
| ACC-3 | **Archive/hide closed accounts** (keep history, hide from lists) | Clutter over time | P3 | S |

---

## Onboarding, notifications & cross-cutting
| ID | Gap | Why it matters | P | Effort |
|----|-----|----------------|---|--------|
| CC-1 | **First-run onboarding** (set accounts, currency, optional sample data) | New users hit a blank app | P1 | M |
| CC-2 | **Notification center** (bill due, budget, goal, stale prices) — extend the bell we added | One place for all nudges; bell is currently interest-only | P1 | M 💰(in-app free; push via FCM free) |
| CC-3 | **Full data backup/restore (JSON export/import round-trip)** | You can import from FinBoom but can't export your own FinCheck data | P1 | S |
| CC-4 | **Multi-currency** | Only INR hardcoded; travel/NRI use | P3 | L |
| CC-5 | **Category management UI** (add/edit/hide custom categories) | Categories are hardcoded in code | P2 | M |
| CC-6 | **Pull-to-refresh & haptics** | Native-app feel on the PWA | P3 | S |
| CC-7 | **Spending anomaly alerts** ("unusually high spend today") | Proactive, sticky | P3 | M |

---

## Recommended shortlist (my picks, if you want a starting point)
Highest value-to-effort, and they compound (later ones build on earlier):

1. **REC-1 Recurring transactions** (P0) — unlocks REC-2/3, INS-4, AST-2, GOA-3. Foundational.
2. **LIA-1 + LIA-2 + LIA-3** (loan schedule, interest-paid, prepayment) — directly extends the principal-accuracy work you just cared about; high motivation.
3. **INS-1 Savings rate** (P1, S) — one number, big behavioral payoff, cheap.
4. **NW-1 Real net-worth snapshots** (P1) — fixes the one genuinely-approximate feature in the app.
5. **CC-3 Data backup/export** (P1, S) — you can import but not export; low effort, real safety.
6. **GOA-1 + GOA-2** — makes Goals self-sustaining instead of manual.
7. **TXN-6 Undo/trash** (P1) — data-safety; deletes are currently irreversible.

Tell me which IDs to build and I'll implement them (verified + tested) the same way as everything else.
