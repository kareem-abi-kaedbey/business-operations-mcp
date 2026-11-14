
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const client = new Client({
  name: "business-operations-test",
  version: "1.0.0",
});

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "src/server.ts"],
});

// Start the MCP server before running the tests
before(async () => {
  await client.connect(transport);
});

// Close the connection after running the tests
after(async () => {
  await client.close();
});

// Helper: extract JSON from an MCP text result
function parseToolResult(result: {
  content?: unknown;
}): unknown {
  assert.ok(Array.isArray(result.content));

  const item = result.content[0];

  assert.ok(item);
  assert.equal(item.type, "text");
  assert.equal(typeof item.text, "string");

  return JSON.parse(item.text);
}

// Test 1: Dynamic tool discovery
test("discovers all three business tools", async () => {
  const { tools } = await client.listTools();

  const names = tools.map((tool) => tool.name).sort();

  assert.deepEqual(names, [
    "get_lead_context",
    "list_priority_leads",
    "search_customer_notes",
  ]);
});

// Test 2: Retrieve an existing lead
test("retrieves a lead and its customer notes", async () => {
  const result = await client.callTool({
    name: "get_lead_context",
    arguments: {
      leadId: "L001",
    },
  });

  assert.ok(!result.isError);

  const data = parseToolResult(result) as {
    lead: {
      id: string;
      name: string;
      currency: string;
    };
    notes: unknown[];
  };

  assert.equal(data.lead.id, "L001");
  assert.equal(data.lead.name, "Sophie Martin");
  assert.equal(data.lead.currency, "EUR");
  assert.equal(data.notes.length, 2);
});

// Test 3: Handle an unknown lead
test("returns a business error for an unknown lead", async () => {
  const result = await client.callTool({
    name: "get_lead_context",
    arguments: {
      leadId: "L999",
    },
  });

  assert.equal(result.isError, true);

  assert.match(
    JSON.stringify(result),
    /Lead L999 not found/
  );
});

// Test 4: Filter leads by priority
test("returns the expected high-priority leads", async () => {
  const result = await client.callTool({
    name: "list_priority_leads",
    arguments: {
      priority: "high",
    },
  });

  assert.ok(!result.isError);

  const data = parseToolResult(result) as {
    id: string;
    priority: string;
  }[];

  assert.equal(data.length, 2);

  assert.ok(
    data.every((lead) => lead.priority === "high")
  );

  assert.deepEqual(
    data.map((lead) => lead.id).sort(),
    ["L001", "L003"]
  );
});

// Test 5: Case-insensitive customer note search
test("searches customer notes without case sensitivity", async () => {
  const result = await client.callTool({
    name: "search_customer_notes",
    arguments: {
      query: "OAK",
    },
  });

  assert.ok(!result.isError);

  const data = parseToolResult(result) as {
    leadId: string;
    content: string;
  }[];

  assert.equal(data.length, 1);
  assert.equal(data[0]?.leadId, "L001");
  assert.match(data[0]?.content ?? "", /oak/i);
});

// Test 6: Reject an invalid priority
test("rejects invalid tool arguments", async () => {
  let rejected = false;

  try {
    const result = await client.callTool({
      name: "list_priority_leads",
      arguments: {
        priority: "urgent",
      },
    });

    rejected = result.isError === true;
  } catch {
    // Some SDK validation errors are propagated as exceptions.
    rejected = true;
  }

  assert.ok(rejected, "Invalid priority should be rejected");
});

// Test 7: Discover and read the business rules resource
test("discovers and reads the business rules resource", async () => {
  const { resources } = await client.listResources();

  assert.ok(
    resources.some(
      (resource) =>
        resource.uri === "business-rules://current"
    )
  );

  const result = await client.readResource({
    uri: "business-rules://current",
  });

  const text = result.contents
    .map((item) => ("text" in item ? item.text : ""))
    .join("\n");

  assert.match(text, /within 24 hours/);
  assert.match(text, /within 7 days/);
  assert.match(text, /EUR/);
});
