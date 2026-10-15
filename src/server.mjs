import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { invoke } from "./domain.mjs";
import { toolDefinitions } from "./tool-definitions.mjs";

function inputSchema(definition) {
  const shape = {};
  for (const [key, spec] of Object.entries(definition.parameters.properties)) {
    let field;
    if (spec.enum) field = z.enum(spec.enum);
    else if (spec.type === "integer") {
      field = z.number().int();
      if (spec.minimum !== undefined) field = field.min(spec.minimum);
      if (spec.maximum !== undefined) field = field.max(spec.maximum);
    } else {
      field = z.string().min(definition.parameters.required.includes(key) ? 1 : 0).max(spec.maxLength ?? 200);
    }
    field = field.describe(spec.description);
    shape[key] = definition.parameters.required.includes(key) ? field : field.optional();
  }
  return z.object(shape).strict();
}

export function createMcpServer() {
  const server = new McpServer({ name: "truckbuddy-mock-mcp-server", version: "0.1.0" });
  for (const definition of toolDefinitions) {
    server.registerTool(definition.name, {
      title: definition.name.replaceAll("_", " "),
      description: definition.description,
      inputSchema: inputSchema(definition),
      outputSchema: z.object({ data_source: z.literal("mock"), snapshot: z.record(z.string(), z.unknown()) }).passthrough(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async (args) => {
      const output = invoke(definition.name, args);
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output, ...(output.error ? { isError: true } : {}) };
    });
  }
  server.registerResource("demo-snapshot", "truckbuddy://demo/snapshot", {
    description: "Fictional date, capabilities and driver IDs.", mimeType: "application/json",
  }, async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(invoke("truckbuddy_demo_info")) }] }));
  return server;
}

function authenticated(header, token) {
  if (!token) return true;
  const expected = Buffer.from(`Bearer ${token}`);
  const supplied = Buffer.from(header ?? "");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

export function createHttpServer({ token = process.env.MOCK_MCP_TOKEN } = {}) {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (request.method === "GET" && url.pathname === "/health") {
      json(response, 200, { status: "ok", data_source: "mock", server: "truckbuddy-mock-mcp-server", tools: toolDefinitions.length });
      return;
    }
    if (url.pathname !== "/mcp") { json(response, 404, { error: "Use /mcp for MCP or /health for status." }); return; }
    if (!authenticated(request.headers.authorization, token)) { json(response, 401, { error: "A valid bearer token is required." }); return; }
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      json(response, 405, { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Stateless JSON MCP supports POST only." } });
      return;
    }
    const parts = [];
    let length = 0;
    try {
      for await (const part of request) {
        length += part.length;
        if (length > 256 * 1024) { json(response, 413, { error: "Request too large." }); return; }
        parts.push(part);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(parts).toString("utf8")); }
      catch { json(response, 400, { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Invalid JSON." } }); return; }
      const server = createMcpServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      response.on("close", () => { void server.close().catch(() => {}); });
      await server.connect(transport);
      await transport.handleRequest(request, response, body);
    } catch {
      if (!response.headersSent) json(response, 500, { jsonrpc: "2.0", id: null, error: { code: -32603, message: "The mock MCP request failed." } });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST ?? "127.0.0.1";
  createHttpServer().listen(port, host, () => console.log(`Truckbuddy mock MCP: http://${host}:${port}/mcp`));
}
