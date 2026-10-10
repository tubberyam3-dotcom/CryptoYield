---
name: Joint account spending
description: Shared-balance ownership and XP authorization requirements for joint accounts.
---

Both joint-account members must be allowed to withdraw or invest the total combined available balance.

**Why:** The user requested merging both balances so either member can use the total.

**How to apply:** Treat member balances as one spendable pool without physically transferring or duplicating their funds. Credits to either member contribute to the pool. Debit and record creation must be atomic, and simultaneous requests must not overspend it.

Every new joint-account withdrawal must request a one-time XP authorization code sent to the other member's registered email. Successful authorization must not carry over to the next withdrawal. Personal withdrawals do not gain this requirement.

**Why:** The user clarified that the code prompt must refer to the code sent to the partner's registered email. The reusable login XP credential must not be shared or emailed as withdrawal authorization.

**How to apply:** Show a usable entry form for every withdrawal method on desktop and mobile. Send only to the current other member, bind the expiring one-use code to the requester and exact withdrawal, and validate and consume it on the server atomically with the debit. Never expose or store the supplied code in transaction metadata.
