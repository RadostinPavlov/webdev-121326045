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

## 2026-10-28 · First steps
- Goal: set up the codespace and Gemini CLI, start writing server.js
- Delegated: asked Gemini to list the files in the repo and explain what AGENTS.md is for
- Checkpoints: Gemini answered about my repository's files
- Went wrong: nothing; /stats was not recorded for this session
- Changed by hand: nothing

## 2026-11-18 · Debugging server.js
- Goal: get check.mjs to 12/12
- Delegated: asked why my server crashed on startup and why an unknown tool returned -32601; the agent explained, I wrote the fixes
- Checkpoints: check.mjs after each fix (2/8 → 9/12 → 11/12 → 12/12)
- Went wrong: duplicate `const fs` and `const lines` crashed the server; `name` was not defined; a missing lecture crashed instead of returning isError; unknown tool returned -32601 instead of -32602
- Changed by hand: removed the duplicate declarations; read `name` from `msg.params.name`; returned a result with `isError: true` for a missing lecture; returned -32602 for an unknown tool

## 2026-11-18 · Description experiment
- Goal: use the server from a real agent and see how a tool description affects tool choice
- Delegated: asked "What does lecture 5 cover?" twice, once with the original and once with a vague `find_lecture` description
- Checkpoints: /mcp showed my-project connected; both sessions made one successful tool call; check.mjs 12/12 after reverting
- Went wrong: nothing; the model still chose `find_lecture` with the vague description
- Changed by hand: changed and then reverted the `find_lecture` description; fixed the lecture range from 1–12 to 1–10


## 2026-11-19 · Usage limit
- Goal: check that the agent reads AGENTS.md ("Always ask before"), then plan Slice 1
- Delegated: asked what AGENTS.md says under "Always ask before"
- Checkpoints: none reached; the main model never answered
- Went wrong: hit the usage limit for the Pro models, switched to gemini-3-flash-preview, then hit the limit for gemini-3.8-flash; 20 requests to the main model were refused and no tool was called
- Changed by hand: nothing