---
name: Smartsupp purpose
description: The user's app-wide analytics-only requirement for Smartsupp.
---

Use Smartsupp across the whole app for analytics only. Do not show the live-chat icon or interface on desktop or mobile.

**Why:** The user explicitly requested Smartsupp for analytics, without a visible live-chat icon.

**How to apply:** Preserve this requirement when changing tracking, navigation or support features; do not enable chat as an incidental consequence of updating the integration.

Do not rely on Smartsupp's configuration flags alone to enforce analytics-only use.

**Why:** The user reported visible chat despite the hide flags. The provider's live loader can reset `hideWidget` when its customization feature is unavailable.

**How to apply:** Retain an independent page-level visual guard as well as the SDK hide command; leave the analytics loader running.

Do not initialize third-party tracking on password-reset pages containing private, one-time credentials in their URLs.

**Why:** Basic visitor tracking can capture page URLs, so app-wide analytics must not expose password-reset tokens.

**How to apply:** Preserve the credential-page exclusion and consider the same risk when adding other credential-bearing routes.
