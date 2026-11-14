
import { GoogleGenAI } from "@google/genai";
import type { Content, Part } from "@google/genai";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing");
}

const ai = new GoogleGenAI({ apiKey });

const model =
  process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

const client = new Client({
  name: "business-operations-host",
  version: "1.0.0",
});

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "src/server.ts"],
});

await client.connect(transport);

try {
  // 1. Discover MCP tools
  const { tools } = await client.listTools();

  const functionDeclarations = tools.map((tool) => {
    const { $schema, ...parametersJsonSchema } =
      tool.inputSchema;

    return {
      name: tool.name,
      description: tool.description,
      parametersJsonSchema,
    };
  });

  const allowedTools = new Set(
    tools.map((tool) => tool.name)
  );

  console.log("Available functions:");
  console.log([...allowedTools]);

  // 2. Read business rules from MCP
  const resource = await client.readResource({
    uri: "business-rules://current",
  });

  const businessRules = resource.contents
    .map((item) => ("text" in item ? item.text : ""))
    .join("\n");

  // 3. Get the user's question
  const question =
    process.argv.slice(2).join(" ") ||
    "Which high-priority leads should I contact?";

  const history: Content[] = [
    {
      role: "user",
      parts: [{ text: question }],
    },
  ];

  const maxRounds = 5;
  let completed = false;

  // 4. Agentic loop
  for (let round = 0; round < maxRounds; round++) {
    const response = await ai.models.generateContent({
      model,
      contents: history,
      config: {
        systemInstruction: `
You are a business operations assistant.

Follow these business rules:
${businessRules}

Use available tools to retrieve real customer information.
Do not invent customer data.
Explain your recommendations clearly.
        `,
        tools: [{ functionDeclarations }],
      },
    });

    const modelContent = response.candidates?.[0]?.content;

    if (!modelContent) {
      throw new Error("Gemini returned no content");
    }

    // Preserve the model's complete response
    history.push(modelContent);

    const calls = response.functionCalls ?? [];

    // No tool requested: return the final answer
    if (calls.length === 0) {
      console.log("\nFinal answer:");
      console.log(response.text);

      completed = true;
      break;
    }

    // 5. Execute requested tools via MCP
    const functionResponses: Part[] = [];

    for (const call of calls) {
      const name = call.name;

      if (!name || !allowedTools.has(name)) {
        throw new Error(`Unknown tool: ${name}`);
      }

      console.log(`\nCalling MCP tool: ${name}`);
      console.log("Arguments:", call.args);

      const result = await client.callTool({
        name,
        arguments: call.args ?? {},
      });

      console.log("MCP result:", result);

      functionResponses.push({
        functionResponse: {
          id: call.id,
          name,
          response: result.isError
            ? { error: result }
            : { output: result },
        },
      });
    }

    // 6. Return tool results to Gemini
    history.push({
      role: "user",
      parts: functionResponses,
    });
  }

  if (!completed) {
    console.warn("Maximum agent rounds reached.");
  }

} finally {
  await client.close();
}
