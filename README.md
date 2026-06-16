# skatteverket-testpersonnummer-mcp-server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that gives AI assistants like Claude access to [Skatteverket's official Swedish test personal numbers dataset](https://skatteverket.entryscape.net/rowstore/dataset/b4de7df7-63c0-4e7e-bb59-1f156a591763).

Contains **43,895 official test personnummer** — fake Swedish personal identity numbers published by the Swedish Tax Agency for use in software development and testing.

**No API key required. CC0 license (Public Domain).**

## Tools

### `skatteverket_search_testpersonnummer`
Search or list test personal numbers with optional regex filtering and pagination.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `pattern` | string | — | Regex filter on the 12-digit number. Optional. |
| `limit` | number | 20 | Results per page (max 500) |
| `offset` | number | 0 | Pagination offset |
| `response_format` | `markdown` \| `json` | `markdown` | Output format |

**Pattern examples:**
```
^1985        → born in 1985
^199001      → born January 1990
^19[5-6]     → born 1950-1969
```

### `skatteverket_parse_testpersonnummer`
Parse any Swedish personnummer (10- or 12-digit) and extract birth date, gender, and birth number. No API call needed — pure local parsing.

---

## Installation

### Requirements
- [Node.js](https://nodejs.org) v18 or later
- [Claude Desktop](https://claude.ai/download) (or any MCP-compatible client)

### Step 1 — Clone and build

```bash
git clone https://github.com/jaggeman/skatteverket-testpersonnummer-mcp-server
cd skatteverket-testpersonnummer-mcp-server
npm install
npm run build
```

### Step 2 — Add to Claude Desktop

> **Important:** Claude Desktop overwrites its config file while running. You must close it completely before editing, otherwise your changes will be lost.

**Windows:**

1. Quit Claude Desktop fully — right-click the tray icon → **Quit** (not just close the window)
2. Open the config file in Notepad by running this in PowerShell or the Run dialog (`Win+R`):
   ```
   notepad %APPDATA%\Claude\claude_desktop_config.json
   ```
3. Add the new server inside the `"mcpServers"` block. Example of a complete file:
   ```json
   {
     "mcpServers": {
       "skatteverket-testpersonnummer": {
         "command": "C:\\Program Files\\nodejs\\node.exe",
         "args": [
           "C:\\Users\\yourname\\skatteverket-testpersonnummer-mcp-server\\dist\\index.js"
         ]
       }
     }
   }
   ```
   Replace `yourname` and the path with where you cloned the repo. If you already have other MCP servers, add a comma after the last one and append this block.
4. Save the file and close Notepad.

**macOS:**

1. Quit Claude Desktop: **Claude menu → Quit Claude**
2. Open Terminal and run:
   ```bash
   open -e "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
   ```
3. Add the server the same way as above, using your actual path:
   ```json
   {
     "mcpServers": {
       "skatteverket-testpersonnummer": {
         "command": "node",
         "args": [
           "/Users/yourname/skatteverket-testpersonnummer-mcp-server/dist/index.js"
         ]
       }
     }
   }
   ```
4. Save and close.

> **Can't find the file?** If the file doesn't exist yet, create it — Claude Desktop will pick it up on next launch. Make sure the folder `Claude` exists inside `AppData\Roaming` (Windows) or `Application Support` (macOS).

### Step 3 — Restart Claude Desktop

Start Claude Desktop again. The tools `skatteverket_search_testpersonnummer` and `skatteverket_parse_testpersonnummer` will now be available — you'll see a hammer icon in the chat input field.

---

## Usage examples

**Get 10 test numbers for people born in the 1990s:**
> "Give me 10 test personnummer for people born in the 1990s"

**Find test numbers born on a specific date:**
> "Find all test personnummer for January 1, 1985"

**Parse a specific personnummer:**
> "What is the birth date and gender for personnummer 198501012382?"

**Get numbers for testing age verification (born 18+ years ago):**
> "Give me test personnummer for people born before 2007"

---

## Data source

| Field | Value |
|-------|-------|
| Publisher | Skatteverket (Swedish Tax Agency) |
| License | CC0 1.0 — Public Domain |
| Last updated | 2025-12-16 |
| Records | 43,895 |
| API | [Swagger docs](https://skatteverket.entryscape.net/rowstore/dataset/b4de7df7-63c0-4e7e-bb59-1f156a591763/swagger) |
