
# Business Operations MCP

A lightweight Model Context Protocol (MCP) system that
connects an AI assistant to business operations data
through standardized tool discovery and execution.

The project demonstrates how an LLM-powered application
can interact with a fictional CRM through an independent
MCP server rather than hardcoded, application-specific
tool integrations.

## Overview

Business Operations MCP provides an AI assistant with
access to customer leads, customer notes, and operational
business rules.

The assistant can:

- Discover available business tools dynamically.
- Retrieve detailed lead information.
- Identify high-priority leads.
- Search customer notes.
- Read business rules from an MCP resource.
- Combine multiple tool calls to generate grounded
  business recommendations.

The project uses fictional local data and does not
require a database or cloud infrastructure.

## Architecture

```text
User / CLI
    |
    v
AI Host (Gemini)
    |
    | Dynamic function declarations
    | Function calls and responses
    v
MCP Client
    |
    | MCP / JSON-RPC over stdio
    v
MCP Server
    |
    |-- get_lead_context
    |-- list_priority_leads
    |-- search_customer_notes
    |
    |-- business-rules://current
    |
    v
Local CRM data
```

The MCP server is independent of the LLM provider.

The host orchestrates communication between Gemini and
the MCP client. The server exposes business capabilities
without requiring access to the model.

## Tech Stack

- TypeScript
- Node.js
- Official MCP TypeScript SDK v2
- Zod for runtime input validation
- Google Gemini API
- Google GenAI SDK
- Node.js built-in test runner
- stdio transport

No agent framework is required. The host implements
the tool-calling loop explicitly.

## Project Structure

```text
business-operations-mcp/
├── src/
│   ├── data.ts
│   ├── server.ts
│   ├── client.ts
│   └── host.ts
├── tests/
│   └── mcp.test.ts
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

| File | Responsibility |
| --- | --- |
| `data.ts` | Fictional CRM data and business rules |
| `server.ts` | MCP tools, resource and server transport |
| `client.ts` | Standalone MCP discovery and execution demo |
| `host.ts` | Gemini integration and bounded agentic loop |
| `mcp.test.ts` | MCP integration tests |

## Installation

Requirements:

- Node.js 24
- npm
- A Gemini API key for the AI host only

Clone the repository:

```bash
git clone https://github.com/kareem-abi-kaedbey/business-operations-mcp.git

cd business-operations-mcp
npm ci
```

Create a local environment file:

```bash
cp .env.example .env
```

Configure your Gemini API key:

```dotenv
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
```

API keys can be obtained from Google AI Studio:

https://aistudio.google.com/apikey

The standalone MCP client and integration tests do not
require a Gemini API key.

## Usage

### Standalone MCP Client

```bash
npm run client
```

This command starts the MCP server through the stdio
transport, discovers available tools, invokes the
business tools, and reads the business rules resource.

It demonstrates MCP independently of any LLM.

### AI Host

```bash
npm run host
```

Ask a custom question:

```bash
npm run host -- "Which leads are interested in oak wood?"
```

Example multi-step business question:

```bash
npm run host -- "Find my high-priority leads, retrieve their customer notes, and recommend next actions according to the business rules."
```

### Standalone Server

```bash
npm run server
```

The server communicates over stdin and stdout and is
normally started automatically by an MCP client.

Running the server directly will leave it waiting for
MCP messages.

## MCP Tools

### get_lead_context

Retrieve a lead and its associated customer notes.

Input:

```json
{
  "leadId": "L001"
}
```

Returns lead details and customer notes.

An unknown lead returns a tool result with
`isError: true`.

### list_priority_leads

List leads matching a specified priority.

Input:

```json
{
  "priority": "high"
}
```

Supported priorities:

- low
- medium
- high

### search_customer_notes

Search customer notes using a case-insensitive keyword.

Input:

```json
{
  "query": "oak"
}
```

All tool inputs are described using Zod schemas and
validated by the MCP server.

All three tools are read-only.

## MCP Resource

### business-rules://current

A Markdown resource containing operational rules for
managing leads.

Examples:

- Contact high-priority leads within 24 hours.
- Follow up on sent quotes within 7 days.
- Consider customer budgets and project requirements.
- Do not invent missing customer information.

The client discovers resources using `listResources()`
and retrieves their contents using `readResource()`.

The AI host explicitly reads the resource and injects
its content into the model's system instructions.

## End-to-End Example

Question:

> Find my high-priority leads, retrieve their customer
> notes, and recommend next actions according to the
> business rules.

An observed execution:

```text
1. Host discovers MCP tools using listTools().

2. Host reads business-rules://current.

3. Gemini requests:
   list_priority_leads({ priority: "high" })

4. MCP returns:
   L001 - Sophie Martin
   L003 - Emma Dubois

5. Gemini requests:
   get_lead_context({ leadId: "L001" })
   get_lead_context({ leadId: "L003" })

6. MCP returns lead details and customer notes.

7. Gemini generates a recommendation using the
   retrieved information and business rules.
```

The selected tools and execution order are determined
by the model rather than hardcoded in the host.

The model may select a different valid execution path
for subsequent requests.

## Dynamic Tool Discovery

The host retrieves tool definitions from the MCP server:

```typescript
const { tools } = await client.listTools();
```

Each definition contains a tool name, description and
JSON Schema describing its input.

The host converts these definitions into Gemini function
declarations:

```typescript
const functionDeclarations = tools.map((tool) => {
  const { $schema, ...parametersJsonSchema } =
    tool.inputSchema;

  return {
    name: tool.name,
    description: tool.description,
    parametersJsonSchema,
  };
});
```

This removes the need to manually duplicate the tool
definitions in the AI host.

When Gemini requests a function, the host invokes the
corresponding MCP tool using `callTool()` and returns
the result to the model.

## MCP vs Custom Tool Calling

Traditional function calling typically requires the
application to define tools directly and implement
its own mapping between model-generated calls and
business functions.

With MCP, the business capabilities are exposed by an
independent server through a standardized interface.

| Custom tool calling | MCP-based integration |
| --- | --- |
| Application-defined tools | Server-exposed tools |
| Application-specific discovery | Standardized tool discovery |
| Custom execution interface | MCP `callTool()` |
| Often tightly coupled to application | Reusable across compatible clients |

MCP does not replace LLM function calling or agent
orchestration.

The AI host still decides which capabilities to expose
to the model, handles model-generated function calls,
executes tools through the MCP client, and manages the
conversation history.

## Transport

This project uses stdio.

The MCP client starts the server as a local child process.
Messages are exchanged through standard input and output.

Advantages for this project:

- Simple local development.
- No HTTP server or network configuration.
- Independent client and server processes.
- No remote deployment infrastructure.

For remote or shared MCP servers, Streamable HTTP would
be a potential alternative.

## Error Handling and Safety

The project includes:

- Runtime input validation with Zod.
- Explicit business errors for missing leads.
- Verification of requested tool names against discovered
  tools.
- A bounded loop with a maximum of five model rounds.
- Connection cleanup using `try/finally`.
- API keys stored outside version control.
- Read-only business operations.

The tool-name check prevents execution of names that were
not discovered, but it is not a complete authorization
system.

Business rules supplied to the model are instructions,
not enforceable access-control policies.

## Testing

Run TypeScript checks:

```bash
npm run typecheck
```

Run MCP integration tests:

```bash
npm test
```

The tests start a real MCP server and communicate with
it through an MCP client.

Coverage includes:

- Dynamic tool discovery.
- Lead retrieval and associated notes.
- Unknown-lead error handling.
- Priority filtering.
- Case-insensitive note search.
- Rejection of invalid arguments.
- Resource discovery and retrieval.

Tests do not require an external LLM or API key.

## Limitations

This is a small, educational AI engineering prototype.

Current limitations:

- Fictional data stored in memory.
- No persistence or database integration.
- No authentication or per-user authorization.
- No write or mutation capabilities.
- Local stdio transport only.
- A maximum number of model rounds, but no explicit
  per-tool timeout or total request deadline.
- Business deadlines cannot be reliably verified
  when the necessary timestamps are missing.
- Model responses are nondeterministic and may
  contain incorrect assumptions.
- Tool results and arguments are logged to the console,
  which would require privacy controls for real data.
- No automated evaluation of LLM response quality.

## Future Improvements

Possible extensions include:

- PostgreSQL or CRM API integration.
- Structured MCP tool outputs.
- Streamable HTTP transport.
- Authentication and scoped tool authorization.
- Explicit approval for sensitive or mutating operations.
- Request timeouts, observability and evaluation.
- RAG over customer documents and business knowledge.
- Integration with additional MCP-compatible hosts.

## Purpose

This project was built to explore MCP as a standardized
interface between AI applications and business systems.

It focuses on dynamic capability discovery, explicit
agent orchestration, typed interfaces, integration
testing, and the separation of model logic from
business capabilities.
