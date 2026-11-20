# Usage

One row per agent session. In Gemini CLI, type `/stats` before you quit and copy the input and output tokens. Copilot shows credits instead of tokens: write those in the credits column. The free tier charges nothing, so record what the session **would cost at the provider's published list price**, and note once below the table which price list you used. Leave the cost empty for rows that only show credits.

| Date | Tool | Input tokens | Output tokens | Credits (if no tokens) | List-price cost |
|---|---|---|---|---|---|
| 2026-10-28 | Gemini CLI | – | – | – | – (stats not recorded) |
| 2026-11-18 | Gemini CLI | 26949 | 96 | – | $0.0197 |
| 2026-11-18 | Gemini CLI | 27176 | 97 | – | $0.0197 |
| 2026-11-19 | Gemini CLI | 3980 | 63 | – | $0.0018 |
| 2026-11-20 | Gemini CLI | 1990 | 32 | – | $0.0007 |
| 2026-11-20 | Gemini CLI | 12473 | 101 | – | $0.0065 |

Price list: Gemini API paid tier (ai.google.dev/gemini-api/docs/pricing), checked 2026-11-19:
gemini-3.8-flash $0.75 / $3.75; gemini-3.5-flash-lite $0.30 / $2.50; gemini-3-flash-preview $0.50 / $3.00 per 1M input/output. Cached tokens not counted.
