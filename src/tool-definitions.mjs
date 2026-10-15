const string = (description, extra = {}) => ({ type: "string", description, ...extra });
const driverId = string("Fictional driver ID: D-001 (normal), D-002 (stock/window issues), or D-003 (overload/cross-dock issues).");
const date = string("Optional mock date, YYYY-MM-DD. Only 2026-10-15 is available; omit for the fixed snapshot.");
const driverParams = { driver_id: driverId, date };
const tool = (name, description, properties, required = []) => ({
  name, description,
  parameters: { type: "object", properties, required, additionalProperties: false },
});

export const toolDefinitions = [
  tool("truckbuddy_demo_info", "Discover the Talk-to-Rule demo, supported mock date and driver IDs. All operational responses are fictional.", {}),
  tool("list_transport_rules", "Search the eight supplied transportation rules, including lifecycle and source inconsistencies. Draft policies are not active instructions.", {
    query: string("Optional name, scope, or tag search."),
    stage: string("Optional rule lifecycle filter.", { enum: ["draft", "in-review", "published", "retired"] }),
    limit: { type: "integer", description: "Page size from 1 to 8.", minimum: 1, maximum: 8 },
    offset: { type: "integer", description: "Zero-based pagination offset.", minimum: 0 },
  }),
  tool("get_transport_rule", "Return the full original rule, parameters, exceptions, source, audit history, and known catalogue issues.", {
    rule_id: string("Original rule ID R-001 through R-008."),
  }, ["rule_id"]),
  tool("prepare_rule_draft", "Prepare a structured rule DRAFT from confirmed fields. Returns clarification questions and admin-review validation. Never saves, approves or publishes a rule. Do not guess mandatory versus preference or exceptions.", {
    spoken_requirement: string("Exact words the user spoke, up to 8000 characters.", { maxLength: 8000 }),
    draft_fields_json: string("Optional serialized JSON object with confirmed name, type (hard-constraint/soft-constraint/recommendation), priority (P1/P2/P3), scope, conditions, actions, exceptions ('none' if confirmed), business_reason, parameters (array of key/value/unit), window_binding (contractual/preferred/fixed_operations/not_applicable), timezone, source, related_rule_ids. Leave unconfirmed fields out.", { maxLength: 24000 }),
  }, ["spoken_requirement"]),
  tool("validate_rule_draft", "Read-only completeness/ambiguity/unit checks on a serialized draft. Returns issues for admin review, not publication approval or a full planning simulation.", {
    draft_json: string("Serialized JSON draft returned by prepare_rule_draft.", { maxLength: 24000 }),
  }, ["draft_json"]),
  tool("get_stock", "Fictional warehouse SKU stock with reservations, quarantine, available cases, bin, weight and temperature class. Does not reserve or change inventory.", {
    warehouse_id: string("Optional warehouse WH-01, WH-02 or WH-03."),
    sku: string("Optional SKU filter; omit to discover the available stock."),
    date,
  }),
  tool("get_resource_availability", "List fictional available drivers, assigned vehicles, capacities, temperature class, configured shifts and warehouse loading bays.", { date }),
  tool("get_loading_plan", "Return exact fictional per-stop SKU cases to pick, shortages, weight, pallet positions, bins and load order. Shows readiness blockers and never authorizes dispatch.", driverParams, ["driver_id"]),
  tool("get_driver_route", "Return the driver's fictional route, delivery windows, access restrictions and scenario ETAs after traffic/weather. Include cross-dock/shift blockers and unapproved backload opportunities.", driverParams, ["driver_id"]),
  tool("get_traffic", "Return mock corridor delays and road incidents for the fixed demo date. This is not live traffic or an approved route change.", { corridor: string("Corridor-A, Corridor-B, Corridor-D or Corridor-E."), date }, ["corridor"]),
  tool("get_weather", "Return fictional weather, visibility, loading precautions and demo travel delay for Hamburg, Bremen or Hanover. This is not a current forecast.", { region: string("Hamburg, Bremen or Hanover."), date }, ["region"]),
  tool("get_driver_day_briefing", "Start a driver's day with one fictional combined briefing: assigned load, stock, quantities, route, vehicle, availability, traffic and weather. Tell the user any dispatch blockers FIRST. No operational approval is granted.", driverParams, ["driver_id"]),
];
