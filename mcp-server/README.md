# Exercise 1 · MCP server

Your hand-written MCP server lives in this folder. Write it in any language you like. The full task is on the exercise page; this file is the short version plus your notes.

## What is already here

| File | What it is |
|---|---|
| `lectures.json` | The course lectures. Your first tool reads this file. |
| `messages.jsonl` | The messages a client sends, in order, with what your server must answer. |
| `check.mjs` | The self-check. It starts your server, sends those messages and tells you what is wrong. |

## The two tools

1. **`find_lecture`**: everyone writes this one. Input: `number` (1 to 10). It returns the title and topics of that lecture from `lectures.json`. A number outside the range is not a crash and not a protocol error: it is a result with `isError: true` and a readable message.
2. **One of your own**: anything useful that reads local data. Give it a description a model can choose by. Every tool needs one: the self-check applies the same rule to all of them, because a description is the only thing a model reads when it decides what to call.

## Where this goes next

Do not throw this folder away after Exercise 1. From Exercise 3 it becomes **your project's own MCP server**: the same protocol loop, with the tools rewired from `lectures.json` to your real data. Its tools call exactly the same service functions your HTTP routes call, so a tool obeys the same rules an API request does, and it carries a user (the `MCP_TOKEN` in `.env.example`) so it may do what that person may do and no more.

That is the whole design, and it is one sentence: **one set of rules, two front doors.** An MCP tool that writes its own database query is a second way into your data with none of your rules on it, and Exercise 5 is very good at finding those.

Add an `mcp` script to `package.json` (`"mcp": "node mcp-server/server.js"`) so your agent, CI and the lecturer can all start the server the same way.

## Run the self-check

```bash
node mcp-server/check.mjs -- <your start command>
# for example
node mcp-server/check.mjs -- node mcp-server/server.js
node mcp-server/check.mjs -- python3 mcp-server/server.py
# once you have added the mcp script
node mcp-server/check.mjs -- npm run --silent mcp
```

It prints one line per check. Fix the failures yourself: the agent may explain a message or review your handler, but it must not write the protocol code for you.

## How to start it
<!-- The exact command, so the lecturer can run your server too. -->
npm run --silent mcp

## Session transcript
<!-- Paste one full session: initialize, the reply, tools/list, one good tools/call, one that fails. -->
👋 Welcome to Codespaces! You are on a custom image defined in your devcontainer.json file.

🔍 To explore VS Code to its fullest, search using the Command Palette (Cmd/Ctrl + Shift + P)

📝 Edit away, then run your build command to see your code running in the browser.
echo 'Workspace ready. Start the agent with: gemini'
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo 'Workspace ready. Start the agent with: gemini'
Workspace ready. Start the agent with: gemini
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ ls mcp-server
README.md  check.mjs  lectures.json  messages.jsonl
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | node mcp-server/server.js
node:internal/modules/cjs/loader:1433
  throw err;
  ^

Error: Cannot find module '/workspaces/webdev-121326045/mcp-server/server.js'
    at Function._resolveFilename (node:internal/modules/cjs/loader:1430:15)
    at defaultResolveImpl (node:internal/modules/cjs/loader:1040:19)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1045:22)
    at Function._load (node:internal/modules/cjs/loader:1216:25)
    at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
    at node:internal/main/run_main_module:36:49 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}

Node.js v22.23.4
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | node mcp-server/server.js
node:internal/modules/cjs/loader:1433
  throw err;
  ^

Error: Cannot find module '/workspaces/webdev-121326045/mcp-server/server.js'
    at Function._resolveFilename (node:internal/modules/cjs/loader:1430:15)
    at defaultResolveImpl (node:internal/modules/cjs/loader:1040:19)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1045:22)
    at Function._load (node:internal/modules/cjs/loader:1216:25)
    at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
    at node:internal/main/run_main_module:36:49 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}

Node.js v22.23.4
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ code mcp-server/server.js
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | node mcp-server/server.js
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | node mcp-server/server.js
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | node mcp-server/server.js
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | node mcp-server/server.js 2>/dev/null
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"me","version":"1.0.0"}}}' | node mcp-server/server.js 2>/dev/null
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","method":"notifications/initialized"}' | node mcp-server/server.js 2>/dev/null
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ node mcp-server/check.mjs -- node mcp-server/server.js
FAIL initialize answered
       no reply arrived within 2.5s
ok   notification gets no reply
FAIL tools/list returns your tools
       no reply arrived within 2.5s
FAIL find_lecture returns lecture 5
       no reply arrived within 2.5s
FAIL a lecture that does not exist is a tool error
       no reply arrived within 2.5s
FAIL unknown tool is a protocol error (-32602)
       no reply arrived within 2.5s
FAIL unknown method is a protocol error (-32601)
       no reply arrived within 2.5s
ok   nothing but protocol on stdout

2/8 checks passed
Fix the failures above yourself. The agent may explain a message, but not write the handler.
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | node mcp-server/server.js
Получих съобщение: {"jsonrpc":"2.0","id":1,"method":"initialize"}
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"me","version":"1.0.0"}}}' | node mcp-server/server.js 2>/dev/null
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"me","version":"1.0.0"}}}' | node mcp-server/server.js 2>/dev/null
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | node mcp-server/server.js
got: {"jsonrpc":"2.0","id":1,"method":"initialize"}
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"me","version":"1.0.0"}}}' | node mcp-server/server.js 2>/dev/null
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"me","version":"1.0.0"}}}' | node mcp-server/server.js 2>/dev/null
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-11-25","capabilities":{"tools":{}},"serverInfo":{"name":"my-lecture-server","version":"1.0.0"}}}
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","method":"notifications/initialized"}' | node mcp-server/server.js 2>/dev/null
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ node mcp-server/check.mjs -- node mcp-server/server.js
ok   initialize answered
ok   notification gets no reply
FAIL tools/list returns your tools
       no reply arrived within 2.5s
FAIL find_lecture returns lecture 5
       no reply arrived within 2.5s
FAIL a lecture that does not exist is a tool error
       no reply arrived within 2.5s
FAIL unknown tool is a protocol error (-32602)
       no reply arrived within 2.5s
FAIL unknown method is a protocol error (-32601)
       no reply arrived within 2.5s
ok   nothing but protocol on stdout

3/8 checks passed

Your server printed this on stderr:
   got: {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"course-check","version":"1.0.0"}}}
   got: {"jsonrpc":"2.0","method":"notifications/initialized"}
   got: {"jsonrpc":"2.0","id":2,"method":"tools/list"}
   got: {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":5}}}
   got: {"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":99}}}
   got: {"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"no_such_tool","arguments":{}}}
   got: {"jsonrpc":"2.0","id":6,"method":"nonsense/method"}
Fix the failures above yourself. The agent may explain a message, but not write the handler.
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ node mcp-server/check.mjs -- node mcp-server/server.js
FAIL initialize answered
       no reply arrived within 2.5s
ok   notification gets no reply
FAIL tools/list returns your tools
       no reply arrived within 2.5s
FAIL find_lecture returns lecture 5
       no reply arrived within 2.5s
FAIL a lecture that does not exist is a tool error
       no reply arrived within 2.5s
FAIL unknown tool is a protocol error (-32602)
       no reply arrived within 2.5s
FAIL unknown method is a protocol error (-32601)
       no reply arrived within 2.5s
ok   nothing but protocol on stdout

2/8 checks passed

Your server printed this on stderr before it exited with code 1:
   /workspaces/webdev-121326045/mcp-server/server.js:30
   const lines = readline.createInterface({ input: process.stdin });
         ^

   SyntaxError: Identifier 'lines' has already been declared
       at wrapSafe (node:internal/modules/cjs/loader:1713:18)
       at Module._compile (node:internal/modules/cjs/loader:1755:20)
       at Object..js (node:internal/modules/cjs/loader:1913:10)
       at Module.load (node:internal/modules/cjs/loader:1505:32)
       at Function._load (node:internal/modules/cjs/loader:1309:12)
       at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
       at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
   ... 3 more line(s)
Read that first: a server that crashes fails every check after the crash for one reason.
Fix the failures above yourself. The agent may explain a message, but not write the handler.
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","method":"notifications/initialized"}' | node mcp-server/server.js 2>/dev/null
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"me","version":"1.0.0"}}}' | node mcp-server/server.js 2>/dev/null
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-11-25","capabilities":{"tools":{}},"serverInfo":{"name":"lectures","version":"0.1.0"}}}
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node mcp-server/server.js 2>/dev/null
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node mcp-server/server.js 2>/dev/null
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node mcp-server/server.js 2>/dev/null
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node mcp-server/server.js 2>/dev/null
{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"find_lecture","description":"Return the title and topics of one course lecture by its number, 1 to 12. Use it when asked what a lecture covers.","inputSchema":{"type":"object","properties":{"number":{"type":"integer","description":"Lecture number, 1 to 12"}},"required":["number"]}},{"name":"lectures","description":"List the number and title of every course lecture. Use it when asked what the course covers.","inputSchema":{"type":"object","properties":{}}}]}}
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node mcp-server/server.js 2>/dev/null
{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"find_lecture","description":"Return the title and topics of one course lecture by its number, 1 to 12. Use it when asked what a lecture covers.","inputSchema":{"type":"object","properties":{"number":{"type":"integer","description":"Lecture number, 1 to 12"}},"required":["number"]}},{"name":"lectures","description":"List the number and title of every course lecture. Use it when asked what the course covers.","inputSchema":{"type":"object","properties":{}}}]}}
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ node mcp-server/check.mjs -- node mcp-server/server.js
ok   initialize answered
ok   notification gets no reply
ok   tools/list returns your tools
ok   find_lecture has an input schema
ok   find_lecture has a real description
ok   a second tool of your own
ok   every tool has a real description
ok   find_lecture returns lecture 5
FAIL a lecture that does not exist is a tool error
       no reply arrived within 2.5s
FAIL unknown tool is a protocol error (-32602)
       no reply arrived within 2.5s
FAIL unknown method is a protocol error (-32601)
       no reply arrived within 2.5s
ok   nothing but protocol on stdout

9/12 checks passed

Your server printed this on stderr before it exited with code 1:
   got: {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"course-check","version":"1.0.0"}}}
   got: {"jsonrpc":"2.0","method":"notifications/initialized"}
   got: {"jsonrpc":"2.0","id":2,"method":"tools/list"}
   got: {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":5}}}
   got: {"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":99}}}
   /workspaces/webdev-121326045/mcp-server/server.js:65
         return textResult(msg.id, 'Lecture ' + lecture.number + ': ' + lecture.title + '. Topics: ' + lecture.topics, false);
                                                        ^

   TypeError: Cannot read properties of undefined (reading 'number')
       at handle (/workspaces/webdev-121326045/mcp-server/server.js:65:54)
       at Interface.<anonymous> (/workspaces/webdev-121326045/mcp-server/server.js:78:17)
   ... 10 more line(s)
Read that first: a server that crashes fails every check after the crash for one reason.
Fix the failures above yourself. The agent may explain a message, but not write the handler.
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ node mcp-server/check.mjs -- node mcp-server/server.js
ok   initialize answered
ok   notification gets no reply
ok   tools/list returns your tools
ok   find_lecture has an input schema
ok   find_lecture has a real description
ok   a second tool of your own
ok   every tool has a real description
ok   find_lecture returns lecture 5
FAIL a lecture that does not exist is a tool error
       no reply arrived within 2.5s
FAIL unknown tool is a protocol error (-32602)
       no reply arrived within 2.5s
FAIL unknown method is a protocol error (-32601)
       no reply arrived within 2.5s
ok   nothing but protocol on stdout

9/12 checks passed

Your server printed this on stderr before it exited with code 1:
   got: {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"course-check","version":"1.0.0"}}}
   got: {"jsonrpc":"2.0","method":"notifications/initialized"}
   got: {"jsonrpc":"2.0","id":2,"method":"tools/list"}
   got: {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":5}}}
   got: {"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":99}}}
   /workspaces/webdev-121326045/mcp-server/server.js:65
         return textResult(msg.id, 'Lecture ' + lecture.number + ': ' + lecture.title + '. Topics: ' + lecture.topics, false);
                                                        ^

   TypeError: Cannot read properties of undefined (reading 'number')
       at handle (/workspaces/webdev-121326045/mcp-server/server.js:65:54)
       at Interface.<anonymous> (/workspaces/webdev-121326045/mcp-server/server.js:78:17)
   ... 10 more line(s)
Read that first: a server that crashes fails every check after the crash for one reason.
Fix the failures above yourself. The agent may explain a message, but not write the handler.
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ node mcp-server/check.mjs -- node mcp-server/server.js
ok   initialize answered
ok   notification gets no reply
ok   tools/list returns your tools
ok   find_lecture has an input schema
ok   find_lecture has a real description
ok   a second tool of your own
ok   every tool has a real description
ok   find_lecture returns lecture 5
ok   a lecture that does not exist is a tool error
ok   unknown tool is a protocol error (-32602)
ok   unknown method is a protocol error (-32601)
ok   nothing but protocol on stdout

12/12 checks passed
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":5}}}' | node mcp-server/server.js 2>/dev/null
{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"Lecture 5: What the agent built, part 1. Topics: HTTP, REST vs GraphQL, data modeling, ORM, layers"}],"isError":false}}
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ node mcp-server/check.mjs -- node mcp-server/server.js
FAIL initialize answered
       no reply arrived within 2.5s
ok   notification gets no reply
FAIL tools/list returns your tools
       no reply arrived within 2.5s
FAIL find_lecture returns lecture 5
       no reply arrived within 2.5s
FAIL a lecture that does not exist is a tool error
       no reply arrived within 2.5s
FAIL unknown tool is a protocol error (-32602)
       no reply arrived within 2.5s
FAIL unknown method is a protocol error (-32601)
       no reply arrived within 2.5s
ok   nothing but protocol on stdout

2/8 checks passed

Your server printed this on stderr before it exited with code 1:
   /workspaces/webdev-121326045/mcp-server/server.js:4
   const fs = require('node:fs');
         ^

   SyntaxError: Identifier 'fs' has already been declared
       at wrapSafe (node:internal/modules/cjs/loader:1713:18)
       at Module._compile (node:internal/modules/cjs/loader:1755:20)
       at Object..js (node:internal/modules/cjs/loader:1913:10)
       at Module.load (node:internal/modules/cjs/loader:1505:32)
       at Function._load (node:internal/modules/cjs/loader:1309:12)
       at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
       at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
   ... 3 more line(s)
Read that first: a server that crashes fails every check after the crash for one reason.
Fix the failures above yourself. The agent may explain a message, but not write the handler.
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ node mcp-server/check.mjs -- node mcp-server/server.js
FAIL initialize answered
       no reply arrived within 2.5s
ok   notification gets no reply
FAIL tools/list returns your tools
       no reply arrived within 2.5s
FAIL find_lecture returns lecture 5
       no reply arrived within 2.5s
FAIL a lecture that does not exist is a tool error
       no reply arrived within 2.5s
FAIL unknown tool is a protocol error (-32602)
       no reply arrived within 2.5s
FAIL unknown method is a protocol error (-32601)
       no reply arrived within 2.5s
ok   nothing but protocol on stdout

2/8 checks passed

Your server printed this on stderr before it exited with code 1:
   /workspaces/webdev-121326045/mcp-server/server.js:4
   const fs = require('node:fs');
         ^

   SyntaxError: Identifier 'fs' has already been declared
       at wrapSafe (node:internal/modules/cjs/loader:1713:18)
       at Module._compile (node:internal/modules/cjs/loader:1755:20)
       at Object..js (node:internal/modules/cjs/loader:1913:10)
       at Module.load (node:internal/modules/cjs/loader:1505:32)
       at Function._load (node:internal/modules/cjs/loader:1309:12)
       at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
       at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
   ... 3 more line(s)
Read that first: a server that crashes fails every check after the crash for one reason.
Fix the failures above yourself. The agent may explain a message, but not write the handler.
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ node mcp-server/check.mjs -- node mcp-server/server.js
FAIL initialize answered
       no reply arrived within 2.5s
ok   notification gets no reply
FAIL tools/list returns your tools
       no reply arrived within 2.5s
FAIL find_lecture returns lecture 5
       no reply arrived within 2.5s
FAIL a lecture that does not exist is a tool error
       no reply arrived within 2.5s
FAIL unknown tool is a protocol error (-32602)
       no reply arrived within 2.5s
FAIL unknown method is a protocol error (-32601)
       no reply arrived within 2.5s
ok   nothing but protocol on stdout

2/8 checks passed

Your server printed this on stderr before it exited with code 1:
   /workspaces/webdev-121326045/mcp-server/server.js:4
   const fs = require('node:fs');
         ^

   SyntaxError: Identifier 'fs' has already been declared
       at wrapSafe (node:internal/modules/cjs/loader:1713:18)
       at Module._compile (node:internal/modules/cjs/loader:1755:20)
       at Object..js (node:internal/modules/cjs/loader:1913:10)
       at Module.load (node:internal/modules/cjs/loader:1505:32)
       at Function._load (node:internal/modules/cjs/loader:1309:12)
       at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
       at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
   ... 3 more line(s)
Read that first: a server that crashes fails every check after the crash for one reason.
Fix the failures above yourself. The agent may explain a message, but not write the handler.
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ node mcp-server/check.mjs -- node mcp-server/server.js
ok   initialize answered
ok   notification gets no reply
ok   tools/list returns your tools
ok   find_lecture has an input schema
ok   find_lecture has a real description
ok   a second tool of your own
ok   every tool has a real description
ok   find_lecture returns lecture 5
ok   a lecture that does not exist is a tool error
FAIL unknown tool is a protocol error (-32602)
       got code -32601, expected -32602
ok   unknown method is a protocol error (-32601)
ok   nothing but protocol on stdout

11/12 checks passed

Your server printed this on stderr:
   got: {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"course-check","version":"1.0.0"}}}
   got: {"jsonrpc":"2.0","method":"notifications/initialized"}
   got: {"jsonrpc":"2.0","id":2,"method":"tools/list"}
   got: {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":5}}}
   got: {"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":99}}}
   got: {"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"no_such_tool","arguments":{}}}
   got: {"jsonrpc":"2.0","id":6,"method":"nonsense/method"}
Fix the failures above yourself. The agent may explain a message, but not write the handler.
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ node mcp-server/check.mjs -- node mcp-server/server.js
ok   initialize answered
ok   notification gets no reply
ok   tools/list returns your tools
ok   find_lecture has an input schema
ok   find_lecture has a real description
ok   a second tool of your own
ok   every tool has a real description
ok   find_lecture returns lecture 5
ok   a lecture that does not exist is a tool error
FAIL unknown tool is a protocol error (-32602)
       got code -32601, expected -32602
ok   unknown method is a protocol error (-32601)
ok   nothing but protocol on stdout

11/12 checks passed

Your server printed this on stderr:
   got: {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"course-check","version":"1.0.0"}}}
   got: {"jsonrpc":"2.0","method":"notifications/initialized"}
   got: {"jsonrpc":"2.0","id":2,"method":"tools/list"}
   got: {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":5}}}
   got: {"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":99}}}
   got: {"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"no_such_tool","arguments":{}}}
   got: {"jsonrpc":"2.0","id":6,"method":"nonsense/method"}
Fix the failures above yourself. The agent may explain a message, but not write the handler.
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ node mcp-server/check.mjs -- node mcp-server/server.js
ok   initialize answered
ok   notification gets no reply
FAIL tools/list returns your tools
       result.tools is not an array
FAIL find_lecture has an input schema
       inputSchema.properties.number is missing
FAIL find_lecture has a real description
       write a description a model can choose by, at least 20 characters
FAIL a second tool of your own
       found 0 tool(s)
FAIL every tool has a real description
FAIL find_lecture returns lecture 5
       no reply arrived within 2.5s
FAIL a lecture that does not exist is a tool error
       no reply arrived within 2.5s
FAIL unknown tool is a protocol error (-32602)
       no reply arrived within 2.5s
FAIL unknown method is a protocol error (-32601)
       no reply arrived within 2.5s
ok   nothing but protocol on stdout

3/12 checks passed

Your server printed this on stderr before it exited with code 1:
   got: {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"course-check","version":"1.0.0"}}}
   got: {"jsonrpc":"2.0","method":"notifications/initialized"}
   got: {"jsonrpc":"2.0","id":2,"method":"tools/list"}
   got: {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":5}}}
   /workspaces/webdev-121326045/mcp-server/server.js:57
       if (name === 'find_lecture') {
       ^

   ReferenceError: name is not defined
       at handle (/workspaces/webdev-121326045/mcp-server/server.js:57:5)
       at Interface.<anonymous> (/workspaces/webdev-121326045/mcp-server/server.js:92:17)
       at Interface.emit (node:events:519:28)
   ... 9 more line(s)
Read that first: a server that crashes fails every check after the crash for one reason.
Fix the failures above yourself. The agent may explain a message, but not write the handler.
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ node mcp-server/check.mjs -- node mcp-server/server.js
ok   initialize answered
ok   notification gets no reply
ok   tools/list returns your tools
ok   find_lecture has an input schema
ok   find_lecture has a real description
ok   a second tool of your own
ok   every tool has a real description
ok   find_lecture returns lecture 5
ok   a lecture that does not exist is a tool error
FAIL unknown tool is a protocol error (-32602)
       got code -32601, expected -32602
ok   unknown method is a protocol error (-32601)
ok   nothing but protocol on stdout

11/12 checks passed

Your server printed this on stderr:
   got: {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"course-check","version":"1.0.0"}}}
   got: {"jsonrpc":"2.0","method":"notifications/initialized"}
   got: {"jsonrpc":"2.0","id":2,"method":"tools/list"}
   got: {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":5}}}
   got: {"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":99}}}
   got: {"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"no_such_tool","arguments":{}}}
   got: {"jsonrpc":"2.0","id":6,"method":"nonsense/method"}
Fix the failures above yourself. The agent may explain a message, but not write the handler.
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ node mcp-server/check.mjs -- node mcp-server/server.js
ok   initialize answered
ok   notification gets no reply
ok   tools/list returns your tools
ok   find_lecture has an input schema
ok   find_lecture has a real description
ok   a second tool of your own
ok   every tool has a real description
ok   find_lecture returns lecture 5
ok   a lecture that does not exist is a tool error
FAIL unknown tool is a protocol error (-32602)
       got code -32601, expected -32602
ok   unknown method is a protocol error (-32601)
ok   nothing but protocol on stdout

11/12 checks passed

Your server printed this on stderr:
   got: {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"course-check","version":"1.0.0"}}}
   got: {"jsonrpc":"2.0","method":"notifications/initialized"}
   got: {"jsonrpc":"2.0","id":2,"method":"tools/list"}
   got: {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":5}}}
   got: {"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":99}}}
   got: {"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"no_such_tool","arguments":{}}}
   got: {"jsonrpc":"2.0","id":6,"method":"nonsense/method"}
Fix the failures above yourself. The agent may explain a message, but not write the handler.
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ node mcp-server/check.mjs -- node mcp-server/server.js
ok   initialize answered
ok   notification gets no reply
ok   tools/list returns your tools
ok   find_lecture has an input schema
ok   find_lecture has a real description
ok   a second tool of your own
ok   every tool has a real description
ok   find_lecture returns lecture 5
ok   a lecture that does not exist is a tool error
ok   unknown tool is a protocol error (-32602)
ok   unknown method is a protocol error (-32601)
ok   nothing but protocol on stdout

12/12 checks passed
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $ node mcp-server/server.js
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"me","version":"1.0.0"}}}
got: {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"me","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-11-25","capabilities":{"tools":{}},"serverInfo":{"name":"lectures","version":"0.1.0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
got: {"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
got: {"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"find_lecture","description":"Return the title and topics of one course lecture by its number, 1 to 12. Use it when asked what a lecture covers.","inputSchema":{"type":"object","properties":{"number":{"type":"integer","description":"Lecture number, 1 to 12"}},"required":["number"]}},{"name":"list_lectures","description":"List the number and title of every course lecture. Use it when asked what the course covers.","inputSchema":{"type":"object","properties":{}}}]}}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":5}}}
got: {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":5}}}
{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"Lecture 5: What the agent built, part 1. Topics: HTTP, REST vs GraphQL, data modeling, ORM, layers"}],"isError":false}}
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":99}}}
got: {"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":99}}}
{"jsonrpc":"2.0","id":4,"result":{"content":[{"type":"text","text":"Lecture 99 not found"}],"isError":true}}
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":99}}}
got: {"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":99}}}
{"jsonrpc":"2.0","id":4,"result":{"content":[{"type":"text","text":"Lecture 99 not found"}],"isError":true}}
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":99}}}
got: {"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":99}}}
{"jsonrpc":"2.0","id":4,"result":{"content":[{"type":"text","text":"Lecture 99 not found"}],"isError":true}}
^C
@RadostinPavlov ➜ /workspaces/webdev-121326045 (main) $
## The description experiment
<!-- Three sentences: what you changed in the description, whether the model chose the tool differently, and why you think so. -->
✦ Lecture 7 is titled "Evaluating output" and covers:

   - Non-determinism
   - False positives
   - When to trust it
