---
name: Joint account spending
description: Shared-balance ownership and XP authorization requirements for joint accounts.
---

Both joint-account members must be allowed to withdraw or invest the total combined available balance.

**Why:** The user requested merging both balances so either member can use the total.

**How to apply:** Treat member balances as one spendable pool without physically transferring or duplicating their funds. Credits to either member contribute to the pool. Debit and record creation must be atomic, and simultaneous requests must not overspend it.

Every new joint-account withdrawal must request the initiating member's own existing XP code. Successful authorization must not carry over to the next withdrawal. Personal withdrawals do not gain this requirement.

**Why:** The user requested an XP code each time a joint-account withdrawal is initiated; the existing XP code is a reusable account credential, not a freshly generated OTP.

**How to apply:** Ask again and validate on the server for every withdrawal method. Never expose or store the supplied code in transaction metadata.
