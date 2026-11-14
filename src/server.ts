
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { leads, customerNotes, businessRules } from "./data.js";

serveStdio(() => {
  const server = new McpServer({
    name: "business-operations-mcp",
    version: "1.0.0",
  });

  // Tool 1: Retrieve a lead and its notes
  server.registerTool(
    "get_lead_context",
    {
      description: "Retrieve a lead's details and associated customer notes by ID.",
      inputSchema: z.object({
        leadId: z.string(),
      }),
    },
    async ({ leadId }) => {
      const lead = leads.find((lead) => lead.id === leadId);

      if (!lead) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Lead ${leadId} not found.`,
            },
          ],
        };
      }

      const notes = customerNotes.filter(
        (note) => note.leadId === leadId
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ lead, notes }),
          },
        ],
      };
    }
  );

  // Tool 2: List leads by priority
  server.registerTool(
    "list_priority_leads",
    {
      description: "List business leads with the specified priority level.",
      inputSchema: z.object({
        priority: z.enum(["low", "medium", "high"]),
      }),
    },
    async ({ priority }) => {
      const matchingLeads = leads.filter(
        (lead) => lead.priority === priority
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(matchingLeads),
          },
        ],
      };
    }
  );

  // Tool 3: Search customer notes
  server.registerTool(
    "search_customer_notes",
    {
      description: "Search customer notes for a keyword, ignoring letter case.",
      inputSchema: z.object({
        query: z.string().trim().min(1),
      }),
    },
    async ({ query }) => {
      const matchingNotes = customerNotes.filter(
        (note) =>
          note.content.toLowerCase().includes(query.toLowerCase())
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(matchingNotes),
          },
        ],
      };
    }
  );

  // Resource: Business rules
  server.registerResource(
    "business-rules",
    "business-rules://current",
    {
      title: "Current Business Rules",
      description: "Operational rules for managing business leads.",
      mimeType: "text/markdown",
    },
    async (uri) => {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: businessRules,
          },
        ],
      };
    }
  );

  return server;
});
