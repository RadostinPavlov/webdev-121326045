# Agent log

One entry per agent session, newest at the bottom. Be honest: what went wrong is the useful part.

<!-- Copy this block for each session:

## YYYY-MM-DD · <short title>
- Goal:
- Delegated:
- Checkpoints:
- Went wrong:
- Changed by hand:

-->

Lecture 6: What the agent built, part 2

  Topics:
   - Components
   - State
   - SSR/CSR
   - Containers
   - CI
   - Environments


## 2026-11-11 · First steps
- **Goal:** set up the codespace and Gemini CLI, start server.js
- **What I asked:** (накратко, ако помниш)
- **Checkpoints:** –
- **Agent mistakes:** –
- **Manual changes:** –
- **Note:** /stats not recorded for this session.

## 2026-11-18 · Debugging server.js
- **Goal:** get check.mjs to 12/12
- **What I asked:** why my server crashed on startup; why unknown tool returned -32601
- **Checkpoints:** check.mjs after each fix (2/8 → 9/12 → 11/12 → 12/12)
- **Agent mistakes:** (ако е имало)
- **Manual changes:** removed duplicate `const fs` and `const lines`; defined `name` from `msg.params.name`; handled missing lecture with isError; returned -32602 for unknown tool instead of -32601

## 2026-11-18 · Description experiment
- **Goal:** test with a real agent, see how the description affects tool choice
- **What I asked:** "What does lecture 5 cover?" (twice)
- **Checkpoints:** /mcp showed my-project connected; check.mjs 12/12 after reverting
- **Agent mistakes:** …
- **Manual changes:** changed and reverted the find_lecture description

