#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios, { AxiosError } from "axios";
import { z } from "zod";
import { parsePersonnummer, normalizeToTwelveDigit } from "./utils.js";

const API_BASE_URL =
  "https://skatteverket.entryscape.net/rowstore/dataset/b4de7df7-63c0-4e7e-bb59-1f156a591763";
const CHARACTER_LIMIT = 25000;

enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

interface ApiResponse {
  next?: string;
  resultCount: number;
  offset: number;
  limit: number;
  queryTime: number;
  results: Array<{ testpersonnummer: string }>;
}


function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      switch (error.response.status) {
        case 400:
          return "Error: Invalid query parameter. Check that the regex pattern is valid.";
        case 404:
          return "Error: Dataset not found. The Skatteverket endpoint may have changed.";
        case 429:
          return "Error: Rate limit exceeded. Please wait before making more requests.";
        case 503:
          return "Error: Skatteverket API timed out. Please try again.";
        default:
          return `Error: API request failed with status ${error.response.status}: ${error.response.statusText}`;
      }
    } else if (error.code === "ECONNABORTED") {
      return "Error: Request timed out. The Skatteverket API may be temporarily unavailable.";
    } else if (error.code === "ENOTFOUND") {
      return "Error: Cannot reach skatteverket.entryscape.net. Check your network connection.";
    }
  }
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
}

async function fetchTestpersonnummer(params: {
  pattern?: string;
  limit: number;
  offset: number;
}): Promise<ApiResponse> {
  const queryParams: Record<string, string | number> = {
    _limit: params.limit,
    _offset: params.offset,
  };
  if (params.pattern) {
    queryParams["testpersonnummer"] = params.pattern;
  }

  const response = await axios.get<ApiResponse>(API_BASE_URL, {
    params: queryParams,
    timeout: 15000,
    headers: { Accept: "application/json" },
  });
  return response.data;
}

const server = new McpServer({
  name: "skatteverket-testpersonnummer-mcp-server",
  version: "1.0.0",
});

// ─── Tool 1: search_testpersonnummer ─────────────────────────────────────────

const SearchInputSchema = z
  .object({
    pattern: z
      .string()
      .max(200)
      .optional()
      .describe(
        "Optional regex pattern to filter personnummer. Examples: '^199001' matches born Jan 1990; '^19[5-7]' matches born 1950-1979. Leave empty to list all numbers."
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .default(20)
      .describe("Number of results to return (1-500, default 20)"),
    offset: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe("Number of results to skip for pagination (default 0)"),
    response_format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe(
        "Output format: 'markdown' for human-readable (default) or 'json' for machine-readable"
      ),
  })
  .strict();

type SearchInput = z.infer<typeof SearchInputSchema>;

server.registerTool(
  "skatteverket_search_testpersonnummer",
  {
    title: "Search Swedish Test Personal Numbers",
    description: `Search or list Swedish test personal numbers (testpersonnummer) from Skatteverket's official public dataset.

The dataset contains 43,895 official test personnummer published by the Swedish Tax Agency (Skatteverket) for use in software development and testing. These numbers follow the correct Swedish personnummer format (12 digits: YYYYMMDDNNNN) but are NOT assigned to real people.

Format breakdown: YYYY=year, MM=month, DD=day, NNN=birth serial (odd=male, even=female), K=checksum.

Args:
  - pattern (string, optional): Regex to filter on the full 12-digit personnummer.
      Examples:
        '^199001'     → born January 1990
        '^19[5-6]'    → born 1950-1969
        '^\\d{8}[13579]\\d$' → only male numbers (odd 9th digit)
        '0101'        → born on 1st January any year
  - limit (number): Results per page, 1-500 (default 20)
  - offset (number): Pagination offset (default 0)
  - response_format ('markdown' | 'json'): Output format (default 'markdown')

Returns:
  JSON schema:
  {
    "total": number,         // Total matching records in dataset
    "count": number,         // Records returned in this page
    "offset": number,        // Current pagination offset
    "limit": number,         // Requested limit
    "has_more": boolean,     // Whether more pages exist
    "next_offset": number,   // Offset for next page (if has_more)
    "results": [
      {
        "testpersonnummer": string,  // 12-digit: "198501011234"
        "birth_date": string,        // ISO: "1985-01-01"
        "gender": "male" | "female",
        "ten_digit": string          // Traditional: "850101-1234"
      }
    ]
  }

Examples:
  - "Get 5 test numbers for someone born in 1985" → pattern='^1985', limit=5
  - "Find female test numbers born in the 1970s" → pattern='^197[0-9]\\d{4}[02468]'
  - "List the first 50 test numbers" → no pattern, limit=50

Error handling:
  - Invalid regex → "Error: Invalid query parameter. Check that the regex pattern is valid."
  - Rate limited → "Error: Rate limit exceeded. Please wait before making more requests."`,
    inputSchema: SearchInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (params: SearchInput) => {
    try {
      const data = await fetchTestpersonnummer({
        pattern: params.pattern,
        limit: params.limit,
        offset: params.offset,
      });

      if (!data.results.length) {
        const msg = params.pattern
          ? `No test personnummer found matching pattern '${params.pattern}'.`
          : "No results returned.";
        return { content: [{ type: "text", text: msg }] };
      }

      const parsed = data.results.map((r) => parsePersonnummer(r.testpersonnummer));

      const hasMore = data.resultCount > params.offset + data.results.length;
      const output = {
        total: data.resultCount,
        count: parsed.length,
        offset: params.offset,
        limit: params.limit,
        has_more: hasMore,
        ...(hasMore ? { next_offset: params.offset + parsed.length } : {}),
        results: parsed.map((p) => ({
          testpersonnummer: p.raw,
          birth_date: p.birthDate,
          gender: p.gender,
          ten_digit: p.tenDigit,
        })),
      };

      let text: string;
      if (params.response_format === ResponseFormat.JSON) {
        text = JSON.stringify(output, null, 2);
      } else {
        const lines: string[] = [];
        const patternLabel = params.pattern ? ` matching \`${params.pattern}\`` : "";
        lines.push(`## Testpersonnummer${patternLabel}`);
        lines.push("");
        lines.push(
          `Showing **${parsed.length}** of **${data.resultCount}** numbers (offset ${params.offset})${hasMore ? ` — next page: offset ${params.offset + parsed.length}` : ""}`
        );
        lines.push("");
        lines.push("| 12-siffrig | 10-siffrig | Födelsedag | Kön |");
        lines.push("|------------|-----------|------------|-----|");
        for (const p of parsed) {
          lines.push(
            `| \`${p.raw}\` | \`${p.tenDigit}\` | ${p.birthDate} | ${p.gender === "male" ? "Man" : "Kvinna"} |`
          );
        }
        text = lines.join("\n");
      }

      if (text.length > CHARACTER_LIMIT) {
        const truncated = text.slice(0, CHARACTER_LIMIT);
        text =
          truncated +
          `\n\n[Truncated — use a smaller limit or increase offset to see more results]`;
      }

      return {
        content: [{ type: "text", text }],
        structuredContent: output,
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: handleApiError(error) }],
      };
    }
  }
);

// ─── Tool 2: parse_testpersonnummer ──────────────────────────────────────────

const ParseInputSchema = z
  .object({
    personnummer: z
      .string()
      .regex(
        /^\d{10,12}$/,
        "Must be a 10-digit (YYMMDDNNNN) or 12-digit (YYYYMMDDNNNN) personnummer"
      )
      .describe(
        "Swedish personnummer to parse. Accepts 10-digit (YYMMDDNNNN) or 12-digit (YYYYMMDDNNNN) format. Separators (- or +) are ignored."
      ),
  })
  .strict();

type ParseInput = z.infer<typeof ParseInputSchema>;

server.registerTool(
  "skatteverket_parse_testpersonnummer",
  {
    title: "Parse Swedish Personnummer",
    description: `Parse a Swedish personnummer (personal identity number) and extract structured information.

Works with both 10-digit (YYMMDDNNNN) and 12-digit (YYYYMMDDNNNN) formats. Separators (hyphens) are ignored.

Args:
  - personnummer (string): The personnummer to parse. Examples: "198501011234", "850101-1234", "8501011234"

Returns:
  {
    "raw_input": string,         // Original input
    "twelve_digit": string,      // Normalized 12-digit format: "198501011234"
    "ten_digit": string,         // Traditional format: "850101-1234"
    "birth_date": string,        // ISO date: "1985-01-01"
    "year": number,              // Birth year: 1985
    "month": number,             // Birth month: 1
    "day": number,               // Birth day: 1
    "birth_number": number,      // 3-digit birth serial: 123
    "gender": "male" | "female", // Odd birth_number = male, even = female
    "checksum_digit": number     // Last digit
  }

Examples:
  - "198501011234" → born 1985-01-01, male (birth_number 123 is odd)
  - "199912312468" → born 1999-12-31, female (birth_number 246 is even)

Note: This tool only parses the format — it does NOT validate whether the number exists in Skatteverket's dataset. Use skatteverket_search_testpersonnummer with the exact number as a pattern to verify it is an official test number.`,
    inputSchema: ParseInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params: ParseInput) => {
    try {
      let twelveDigit: string;
      try {
        twelveDigit = normalizeToTwelveDigit(params.personnummer);
      } catch {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Error: Could not normalize to 12 digits. Provide a 10- or 12-digit personnummer.",
            },
          ],
        };
      }

      const p = parsePersonnummer(twelveDigit);
      const checksumDigit = parseInt(twelveDigit.slice(11), 10);

      const output = {
        raw_input: params.personnummer,
        twelve_digit: p.raw,
        ten_digit: p.tenDigit,
        birth_date: p.birthDate,
        year: p.year,
        month: p.month,
        day: p.day,
        birth_number: p.birthNumber,
        gender: p.gender,
        checksum_digit: checksumDigit,
      };

      const text = [
        `## Personnummer: \`${p.raw}\``,
        "",
        `- **10-siffrig**: \`${p.tenDigit}\``,
        `- **Födelsedag**: ${p.birthDate}`,
        `- **Kön**: ${p.gender === "male" ? "Man" : "Kvinna"} (födelsenummer ${p.birthNumber} är ${p.birthNumber % 2 !== 0 ? "udda" : "jämnt"})`,
        `- **Födelsenummer**: ${p.birthNumber}`,
        `- **Kontrollsiffra**: ${checksumDigit}`,
      ].join("\n");

      return {
        content: [{ type: "text", text }],
        structuredContent: output,
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: Could not parse personnummer: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// ─── Start server ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Skatteverket testpersonnummer MCP server running via stdio");
}

main().catch((error: unknown) => {
  console.error("Fatal server error:", error);
  process.exit(1);
});
