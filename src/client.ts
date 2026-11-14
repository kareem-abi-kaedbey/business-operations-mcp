
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const client = new Client({
  name: "business-operations-client",
  version: "1.0.0",
});

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "src/server.ts"],
});

await client.connect(transport);

try {
  const { tools } = await client.listTools();

  console.log("Available tools:");
  console.log(tools.map((tool) => tool.name));

  const leadContext = await client.callTool({
    name: "get_lead_context",
    arguments: {
      leadId: "L001",
    },
  });

  console.log("\nLead context:");
  console.log(leadContext);

  const priorityLeads = await client.callTool({
    name: "list_priority_leads",
    arguments: {
      priority: "high",
    },
  });

  console.log("\nHigh-priority leads:");
  console.log(priorityLeads);

  const matchingNotes = await client.callTool({
    name: "search_customer_notes",
    arguments: {
      query: "oak",
    },
  });

  console.log("\nMatching notes:");
  console.log(matchingNotes);

  const { resources } = await client.listResources();

  console.log("\nAvailable resources:");
  console.log(resources);

  const rules = await client.readResource({
    uri: "business-rules://current",
  });

  console.log("\nBusiness rules:");
  console.log(rules.contents);


} finally {
  await client.close();
}

