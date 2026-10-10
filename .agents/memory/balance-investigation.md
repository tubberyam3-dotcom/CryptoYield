---
name: Balance investigations
description: Financial audit safeguards and the distinction between development and live account data.
---

Investigate published account balances using the database skill's read-only production queries. Do not assume the workspace connection points to live data, or that a Neon driver means the app has an external production database.

**Why:** The workspace and production had different account data during a balance investigation; production was accessible through the managed production query tool.

**How to apply:** Establish the data environment before drawing conclusions. Never overwrite live data with the development dataset.

Do not credit or adjust cash by replacing it with arithmetic based on an earlier balance read. Use atomic increments or locked transactions, and commit administrative adjustments together with their financial record.

**Why:** Overlapping credits, spending and admin adjustments can overwrite one another even when all final balances remain nonnegative.

**How to apply:** Preserve this invariant in new financial operations and tests. A successful credit must not erase a transaction that completed after an earlier read.

Do not restore missing funds from a guess, a dashboard discrepancy or an incomplete transaction history. Verify the affected account, previous amount and legitimate intervening transactions first.

**Why:** Investment allocations, market prices and joint-account spending can legitimately change what a user sees; an overwrite risk alone does not prove a specific missing amount.

**How to apply:** Separate code safeguards from corrections to historical financial records. Request the affected account and before/after amounts when a verified baseline is unavailable.
