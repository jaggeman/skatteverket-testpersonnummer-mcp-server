# skatteverket-testpersonnummer-mcp-server

MCP server for [Skatteverket's official Swedish test personal numbers dataset](https://skatteverket.entryscape.net/rowstore/dataset/b4de7df7-63c0-4e7e-bb59-1f156a591763). Contains 43,895 official test personnummer for use in software development.

**No API key required. CC0 license (Public Domain).**

## Tools

### `skatteverket_search_testpersonnummer`
Search or list test personal numbers with optional regex filtering and pagination.

```
pattern: '^1985'       → numbers starting with 1985 (born in 1985)
pattern: '^199001'     → born January 1990
limit:   20            → 20 results per page (max 500)
offset:  0             → pagination
```

### `skatteverket_parse_testpersonnummer`
Parse any Swedish personnummer (10- or 12-digit) to extract birth date, gender, birth number.

## Installation

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "skatteverket-testpersonnummer": {
      "command": "node",
      "args": ["/absolute/path/to/skatteverket-testpersonnummer-mcp-server/dist/index.js"]
    }
  }
}
```

### Build from source

```bash
git clone https://github.com/YOUR_USERNAME/skatteverket-testpersonnummer-mcp-server
cd skatteverket-testpersonnummer-mcp-server
npm install
npm run build
```

### Using npx (after publishing to npm)

```json
{
  "mcpServers": {
    "skatteverket-testpersonnummer": {
      "command": "npx",
      "args": ["-y", "skatteverket-testpersonnummer-mcp-server"]
    }
  }
}
```

## Examples

**Get 10 test numbers for people born in the 1990s:**
> "Ge mig 10 testpersonnummer för personer födda på 90-talet"

**Find female test numbers from 1975:**
> `pattern: '^1975', limit: 10`

**Parse a specific personnummer:**
> "Vad är födelsedag och kön för 198501011234?"

## Data source

- **Publisher**: Skatteverket (Swedish Tax Agency)
- **License**: CC0 1.0 (Public Domain)
- **Last updated**: 2025-12-16
- **Records**: 43,895 test personal numbers
