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

Entering a joint-account join code submits a pending request, not immediate membership. Only admin approval grants joint-account access; rejection keeps the requester outside the account.

**Why:** The user explicitly requested that a joining user remain pending until an admin approves.

**How to apply:** Enforce this for existing-user joins, shareable invitation links, and signup with a join code. Pending users retain only their own funds and cannot access the shared balance. Do not retroactively suspend existing approved members.
