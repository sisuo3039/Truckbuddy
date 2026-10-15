import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createHttpServer } from "../src/server.mjs";
import assert from "node:assert/strict";
import { toolDefinitions } from "../src/all-tools.mjs";

const server = createHttpServer({ token: "integration-test-only" });
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const client = new Client({ name: "truckbuddy-integration-check", version: "0.1.0" });
try {
  assert.equal((await fetch(`${baseUrl}/health`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/mcp`, { method: "POST", body: "{}" })).status, 401);
  await client.connect(new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    requestInit: { headers: { Authorization: "Bearer integration-test-only" } },
  }));
  const listed = await client.listTools();
  assert.equal(listed.tools.length, toolDefinitions.length);
  const sampleCalls = [
    ["truckbuddy_demo_info", {}, (result) => assert.equal(result.rule_count, 8)],
    ["get_driver_day_briefing", { driver_id: "D-001" }, (result) => assert.equal(result.readiness.status, "ready_for_dispatch_review")],
    ["get_loading_plan", { driver_id: "D-002" }, (result) => assert.equal(result.totals.shortage_cases, 30)],
    ["get_driver_route", { driver_id: "D-003" }, (result) => assert.equal(result.cross_dock.meets_cutoff, false)],
    ["get_stock", { warehouse_id: "WH-03", sku: "CHL-200" }, (result) => assert.equal(result.stock[0].available_cases, 90)],
    ["get_transport_rule", { rule_id: "R-008" }, (result) => assert.equal(result.operationally_active, false)],
    ["prepare_rule_draft", { spoken_requirement: "Deliver before ten." }, (result) => assert.equal(result.validation.valid_for_admin_review, false)],
    ["vidhi_get_profile", { driver_name: "Vidhi" }, (result) => assert.equal(result.profile.name, "Vidhi")],
    ["vidhi_get_manifest", {}, (result) => assert.equal(result.manifest.total_pallets, 14)],
    ["vidhi_get_temperature", { scene: "temperature_alert" }, (result) => assert.equal(result.sensor.status, "outside_range")],
    ["vidhi_confirm_reroute", { route_choice: "B441", user_confirmed: true }, (result) => assert.equal(result.selected_route, "B441")],
  ];
  for (const [name, args, check] of sampleCalls) {
    const result = await client.callTool({ name, arguments: args });
    assert.ok(!result.isError, `${name} returned an MCP error`);
    assert.equal(result.structuredContent.data_source, "mock");
    check(result.structuredContent);
    console.log(`PASS ${name}`);
  }
  const invalid = await client.callTool({ name: "get_driver_day_briefing", arguments: { driver_id: "NO-SUCH-DRIVER" } });
  assert.equal(invalid.isError, true);
  const declined = await client.callTool({ name: "vidhi_confirm_reroute", arguments: { route_choice: "B441", user_confirmed: false } });
  assert.equal(declined.structuredContent.selected_route, null);
  const unsafe = await client.callTool({ name: "vidhi_confirm_reroute", arguments: { route_choice: "COMMON-DIVERSION", user_confirmed: true } });
  assert.equal(unsafe.isError, true);
  const invalidBoolean = await client.callTool({ name: "vidhi_confirm_reroute", arguments: { route_choice: "B441", user_confirmed: "yes" } });
  assert.equal(invalidBoolean.isError, true);
  console.log(`PASS HTTP MCP handshake, tools/list (${listed.tools.length}), structured tool results, authentication, confirmation and error checks.`);
} finally {
  await client.close();
  await new Promise((resolve) => server.close(resolve));
}
