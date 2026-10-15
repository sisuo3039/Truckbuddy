import test from "node:test";
import assert from "node:assert/strict";
import { invoke } from "../src/domain.mjs";
import hostedTool from "../dist/code-tools/truckbuddy_transport_mock.mjs";

test("normal morning load has exact aggregated quantities and no dispatch authority", () => {
  const day = invoke("get_driver_day_briefing", { driver_id: "D-001" });
  assert.equal(day.readiness.status, "ready_for_dispatch_review");
  assert.deepEqual(day.loading_plan.totals, {
    requested_cases: 476, pickable_cases: 476, shortage_cases: 0,
    requested_weight_kg: 4928, pickable_weight_kg: 4928,
    requested_pallets: 10, pickable_pallets: 10,
  });
  assert.equal(day.route.delay_model.total_minutes, 25);
  assert.equal(day.route.stops[0].scenario_eta, "08:40");
  assert.equal(day.readiness.dispatch_authorized, false);
  assert.equal(day.route.backload.instruction_authorized, false);
});

test("stock accounts for reservations/quarantine and is not decremented by queries", () => {
  const args = { warehouse_id: "WH-03", sku: "CHL-200" };
  const before = invoke("get_stock", args);
  assert.equal(before.stock[0].available_cases, 90);
  const plan = invoke("get_loading_plan", { driver_id: "D-002" });
  assert.equal(plan.totals.shortage_cases, 30);
  assert.equal(plan.totals.pickable_cases, 234);
  assert.equal(plan.totals.pickable_weight_kg, 2448);
  assert.deepEqual(invoke("get_stock", args), before);
});

test("fog/congestion can block a contractual window; ambient backload is incompatible", () => {
  const day = invoke("get_driver_day_briefing", { driver_id: "D-002" });
  assert.equal(day.readiness.status, "blocked");
  assert.ok(day.readiness.blockers.some((item) => item.code === "STOCK_SHORTAGE"));
  assert.ok(day.readiness.blockers.some((item) => item.code === "DELIVERY_WINDOW" && item.late_minutes === 15));
  assert.equal(day.route.backload.temperature_compatible, false);
});

test("planning tolerance never permits overload; cross-dock uses its 20-minute buffer", () => {
  const day = invoke("get_driver_day_briefing", { driver_id: "D-003" });
  assert.ok(day.readiness.blockers.some((item) => item.code === "VEHICLE_OVERLOAD" && item.excess_kg === 75));
  assert.ok(day.readiness.blockers.some((item) => item.code === "CROSS_DOCK_CUTOFF" && item.late_minutes === 12));
  assert.equal(day.route.cross_dock.latest_arrival, "09:40");
  assert.equal(day.route.cross_dock.alternatives[0].status, "proposal_only");
});

test("source rule ambiguities and unpublished rules remain visible", () => {
  assert.equal(invoke("list_transport_rules").total, 8);
  assert.equal(invoke("list_transport_rules", { stage: "published" }).total, 7);
  assert.equal(invoke("get_transport_rule", { rule_id: "R-008" }).operationally_active, false);
  assert.match(invoke("get_transport_rule", { rule_id: "R-003" }).catalogue_issues[0].issue, /35/);
});

test("incomplete speech prompts clarifications and never invents an exception or rule type", () => {
  const result = invoke("prepare_rule_draft", { spoken_requirement: "We should get deliveries there before ten." });
  assert.equal(result.draft.type, null);
  assert.equal(result.draft.exceptions, null);
  assert.equal(result.validation.valid_for_admin_review, false);
  assert.ok(result.validation.clarification_questions.some((item) => item.field === "type"));
  assert.ok(result.validation.clarification_questions.some((item) => item.field === "window_binding"));
  assert.equal(result.draft.lifecycle.stage, "draft");
  assert.equal(result.validation.publication_allowed, false);
});

const confirmed = {
  name: "North Market morning cutoff", type: "hard-constraint", priority: "P1",
  scope: "North Market on Corridor-A, weekdays", conditions: "IF stop.customer = North Market AND stop.eta > 10:00",
  actions: "Block route confirmation and ask the planner to resequence or reschedule.",
  exceptions: "none", business_reason: "Confirmed retailer contract", parameters: [{ key: "cutoff", value: "10:00", unit: "local_time" }],
  window_binding: "contractual", timezone: "Europe/Berlin",
};

test("confirmed fields create a reviewable draft while publication stays disabled", () => {
  const result = invoke("prepare_rule_draft", {
    spoken_requirement: "North Market deliveries must arrive before ten on weekdays with no exceptions.",
    draft_fields_json: JSON.stringify(confirmed),
  });
  assert.equal(result.validation.valid_for_admin_review, true);
  assert.equal(result.validation.publication_allowed, false);
  assert.equal(result.draft.lifecycle.stage, "draft");
  assert.equal(invoke("list_transport_rules").total, 8);
});

test("unit, mandatory-window, lifecycle and malformed JSON checks fail clearly", () => {
  for (const draft of [
    { ...confirmed, type: "soft-constraint" },
    { ...confirmed, parameters: [{ key: "buffer", value: "20" }] },
    { ...confirmed, lifecycle: { stage: "published" } },
    { ...confirmed, timezone: "not_a_timezone" },
  ]) assert.equal(invoke("validate_rule_draft", { draft_json: JSON.stringify(draft) }).validation.valid_for_admin_review, false);
  assert.match(invoke("validate_rule_draft", { draft_json: "{" }).error, /invalid JSON/);
});

test("unknown IDs and unsupported dates do not return plausible operational data", () => {
  assert.match(invoke("get_driver_day_briefing", { driver_id: "D-999" }).error, /Unknown driver/);
  assert.match(invoke("get_weather", { region: "Hamburg", date: "2026-10-16" }).error, /Only the fictional/);
  assert.match(invoke("get_stock", { warehouse_id: "WH-01", sku: "CHL-200" }).error, /not found/);
  assert.match(invoke("get_driver_day_briefing").error, /requires driver_id/);
  assert.match(invoke("list_transport_rules", { limit: -1 }).error, /integer/);
});

test("the hosted no-dependency code bundle produces the same answers as the MCP domain", async () => {
  const calls = [
    ["truckbuddy_demo_info", {}], ["get_transport_rule", { rule_id: "R-006" }],
    ["get_driver_day_briefing", { driver_id: "D-001" }], ["get_driver_day_briefing", { driver_id: "D-002" }],
    ["get_loading_plan", { driver_id: "D-003" }], ["get_stock", { sku: "CHL-200" }],
    ["prepare_rule_draft", { spoken_requirement: "Deliver before ten." }],
    ["validate_rule_draft", { draft_json: JSON.stringify(confirmed) }],
    ["get_driver_day_briefing", {}],
  ];
  for (const [action, args] of calls) {
    assert.deepEqual(await hostedTool({ args: { action, ...args } }), invoke(action, args));
  }
});
