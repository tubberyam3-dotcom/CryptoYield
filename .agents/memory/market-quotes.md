---
name: Market quote integrity
description: Requirements and limits for stock and crypto market pricing
---
Stock and crypto prices should be checked against their market sources every 30 seconds.

**Why:** The user explicitly requested current market prices and a 30-second checking loop; earlier static samples and long caches could misrepresent market values.

**How to apply:** Keep market data separate from catalog descriptions and historical purchase prices. Do not use invented prices when providers fail, or substitute another security for an unavailable ticker. A polling interval is not a guarantee of exchange-real-time data: provider delays must remain clear.
