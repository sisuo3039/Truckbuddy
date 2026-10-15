import rules from "../data/rules.json" with { type: "json" };
import {
  snapshot, warehouses, stock, vehicles, drivers, freightOrders, traffic, weather, catalogueIssues,
} from "./fixtures.mjs";
import { toolDefinitions } from "./tool-definitions.mjs";

const copy = (value) => JSON.parse(JSON.stringify(value));
const success = (value) => ({ data_source: "mock", snapshot: copy(snapshot), ...value });
const fail = (message, details = {}) => success({ error: message, ...details });
const find = (items, id, kind) => {
  const item = items.find((value) => value.id === id);
  if (!item) throw new Error(`Unknown ${kind} ${id}. Available IDs: ${items.map((value) => value.id).join(", ")}.`);
  return item;
};
const minutes = (value) => {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error(`Invalid local time ${value}; use HH:mm.`);
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
};
const time = (value) => `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
const round = (value) => Math.round(value * 100) / 100;

function checkDate(date) {
  if (date && date !== snapshot.date) {
    throw new Error(`Only the fictional ${snapshot.date} snapshot is available. No current or historical data provider is connected.`);
  }
}

function context(driverId, date) {
  checkDate(date);
  const driver = find(drivers, driverId, "driver");
  const vehicle = find(vehicles, driver.vehicle_id, "vehicle");
  const freightOrder = find(freightOrders, driver.freight_order_id, "freight order");
  const warehouse = find(warehouses, driver.warehouse_id, "warehouse");
  const trafficReport = traffic.find((value) => value.corridor === freightOrder.corridor);
  const weatherReport = weather.find((value) => value.region === freightOrder.region);
  if (!trafficReport || !weatherReport) throw new Error("The mock route has no matching traffic/weather fixture.");
  return { driver, vehicle, freightOrder, warehouse, trafficReport, weatherReport };
}

function available(item) {
  return Math.max(0, item.on_hand - item.reserved - item.quarantined);
}

function loading(driverId, date) {
  const ctx = context(driverId, date);
  const inventory = stock.filter((item) => item.warehouse_id === ctx.warehouse.id);
  const remaining = new Map(inventory.map((item) => [item.sku, available(item)]));
  const issues = [];
  const lines = [];
  for (const [stopIndex, stop] of ctx.freightOrder.stops.entries()) {
    for (const request of stop.lines) {
      const item = inventory.find((value) => value.sku === request.sku);
      if (!item) {
        issues.push({ severity: "blocker", code: "UNKNOWN_SKU", stop_id: stop.id, sku: request.sku, message: "This item is not present in this warehouse snapshot." });
        continue;
      }
      const loadable = Math.min(request.quantity, remaining.get(item.sku));
      remaining.set(item.sku, remaining.get(item.sku) - loadable);
      const shortage = request.quantity - loadable;
      const compatible = item.temperature_class === ctx.vehicle.temperature_class;
      if (shortage) issues.push({ severity: "blocker", code: "STOCK_SHORTAGE", sku: item.sku, stop_id: stop.id, shortage_cases: shortage, message: `${item.name}: ${shortage} cases short. Ask dispatch to approve replenishment or a revised order; do not claim a full load.` });
      if (!compatible) issues.push({ severity: "blocker", code: "TEMPERATURE_MISMATCH", sku: item.sku, message: `${item.temperature_class} goods do not match the ${ctx.vehicle.temperature_class} vehicle.` });
      lines.push({
        stop_id: stop.id, delivery_sequence: stopIndex + 1, customer: stop.customer,
        sku: item.sku, item: item.name, unit: item.unit, requested_cases: request.quantity,
        available_cases_at_start: available(item), pickable_cases: loadable, shortage_cases: shortage,
        requested_weight_kg: request.quantity * item.unit_weight_kg,
        pickable_weight_kg: loadable * item.unit_weight_kg,
        requested_pallets: Math.ceil(request.quantity / item.cases_per_pallet),
        pickable_pallets: Math.ceil(loadable / item.cases_per_pallet),
        cases_per_pallet: item.cases_per_pallet, warehouse_bin: item.bin, lot: item.lot,
        best_before: item.best_before, temperature_class: item.temperature_class,
        required_temperature_c: item.required_temperature_c ?? null, temperature_compatible: compatible,
      });
    }
  }
  const totals = {
    requested_cases: lines.reduce((sum, item) => sum + item.requested_cases, 0),
    pickable_cases: lines.reduce((sum, item) => sum + item.pickable_cases, 0),
    shortage_cases: lines.reduce((sum, item) => sum + item.shortage_cases, 0),
    requested_weight_kg: lines.reduce((sum, item) => sum + item.requested_weight_kg, 0),
    pickable_weight_kg: lines.reduce((sum, item) => sum + item.pickable_weight_kg, 0),
    requested_pallets: lines.reduce((sum, item) => sum + item.requested_pallets, 0),
    pickable_pallets: lines.reduce((sum, item) => sum + item.pickable_pallets, 0),
  };
  if (totals.requested_weight_kg > ctx.vehicle.capacity_kg) {
    issues.push({ severity: "blocker", code: "VEHICLE_OVERLOAD", excess_kg: totals.requested_weight_kg - ctx.vehicle.capacity_kg, message: `Planned weight exceeds the vehicle capacity by ${totals.requested_weight_kg - ctx.vehicle.capacity_kg} kg. The R-002 planning tolerance does not authorize overload.` });
  }
  if (totals.requested_pallets > ctx.vehicle.pallet_capacity) {
    issues.push({ severity: "blocker", code: "PALLET_CAPACITY", excess_pallets: totals.requested_pallets - ctx.vehicle.pallet_capacity, message: "The requested pallet positions exceed this vehicle's capacity." });
  }
  return {
    driver_id: ctx.driver.id, freight_order_id: ctx.freightOrder.id, warehouse: ctx.warehouse,
    vehicle: ctx.vehicle, lines, totals, issues,
    can_prepare_full_load: !issues.some((item) => item.severity === "blocker"),
    loading_order: [...ctx.freightOrder.stops].reverse().map((stop) => ({ stop_id: stop.id, customer: stop.customer })),
    instructions: [
      "Fictional pick list only. These quantities have not been reserved, picked, or loaded by this tool.",
      "Reserved quantities belong to other mock orders; quarantine is unavailable for picking.",
      "Keep each stop's pallets separate. Load last delivery first, and first delivery nearest the door.",
      "Confirm actual stock, weight including packaging, pallet positions, axle limits, and vehicle suitability with dispatch.",
      ...(ctx.vehicle.temperature_class === "chilled" ? [`Check the chilled unit at ${ctx.vehicle.temperature_setpoint_c}°C and record actual temperature.`] : []),
    ],
    dispatch_authorized: false,
  };
}

function route(driverId, date) {
  const ctx = context(driverId, date);
  const totalDelay = ctx.trafficReport.delay_minutes + ctx.weatherReport.extra_travel_minutes;
  const stops = ctx.freightOrder.stops.map((stop, index) => {
    const etaMinutes = minutes(stop.eta) + totalDelay;
    return {
      ...copy(stop), sequence: index + 1, baseline_eta: stop.eta,
      scenario_eta: time(etaMinutes),
      early_minutes: Math.max(0, minutes(stop.delivery_window[0]) - etaMinutes),
      late_minutes: Math.max(0, etaMinutes - minutes(stop.delivery_window[1])),
      arrival_day_offset: Math.floor(etaMinutes / 1440),
    };
  });
  const issues = [];
  for (const stop of stops) {
    if (stop.late_minutes && stop.window_binding !== "fixed_hub_cutoff") issues.push({
      severity: ["contractual", "fixed_hub_cutoff"].includes(stop.window_binding) ? "blocker" : "warning",
      code: "DELIVERY_WINDOW", stop_id: stop.id, rule_id: "R-007", late_minutes: stop.late_minutes,
      message: `${stop.customer} is ${stop.late_minutes} minutes after its ${stop.delivery_window[1]} ${stop.window_binding} deadline.`,
    });
  }
  let crossDock = null;
  if (ctx.freightOrder.destination_type === "CROSS_DOCK") {
    const buffer = Number(rules.find((rule) => rule.id === "R-006").parameters.find((item) => item.key === "eta_buffer_minutes").value);
    const cutoff = minutes(ctx.freightOrder.target_hub_departure) - buffer;
    const eta = minutes(ctx.freightOrder.eta_at_hub) + totalDelay;
    crossDock = {
      rule_id: "R-006", target_departure: ctx.freightOrder.target_hub_departure,
      buffer_minutes: buffer, latest_arrival: time(cutoff), scenario_eta: time(eta),
      meets_cutoff: eta <= cutoff,
      alternatives: [{ ...ctx.freightOrder.alternative_corridor, status: "proposal_only" }, { target_departure: "14:00", status: "proposal_only" }],
    };
    if (!crossDock.meets_cutoff) issues.push({ severity: "blocker", code: "CROSS_DOCK_CUTOFF", rule_id: "R-006", late_minutes: eta - cutoff, message: `Hub arrival ${time(eta)} misses the buffered ${time(cutoff)} cutoff. Ask the planner to review a reroute or later departure.` });
  }
  const elapsed = ctx.freightOrder.planned_duration_minutes + totalDelay + ctx.driver.planned_break_minutes;
  const finish = minutes(ctx.freightOrder.departure_time) + elapsed;
  const withinShift = elapsed <= ctx.driver.remaining_shift_minutes && finish <= minutes(ctx.driver.shift_end);
  if (!withinShift) issues.push({ severity: "blocker", code: "SHIFT_AVAILABILITY", message: "The demo route and planned break exceed the driver's configured shift availability." });
  const backload = ctx.freightOrder.backload ? {
    ...copy(ctx.freightOrder.backload),
    temperature_compatible: ctx.freightOrder.backload.temperature_class === ctx.vehicle.temperature_class,
    fits_empty_return_vehicle: ctx.freightOrder.backload.weight_kg <= ctx.vehicle.capacity_kg,
    fits_shift: finish + ctx.freightOrder.backload.detour_minutes + ctx.freightOrder.backload.handling_minutes <= minutes(ctx.driver.shift_end),
    active_policy: false, instruction_authorized: false,
    note: "R-008 is unpublished. This is an opportunity for admin review, not a pickup instruction. Fit assumes the outbound cargo has been delivered.",
  } : null;
  return {
    driver_id: ctx.driver.id, freight_order_id: ctx.freightOrder.id, corridor: ctx.freightOrder.corridor,
    departure_time: ctx.freightOrder.departure_time, stops, cross_dock: crossDock, backload,
    delay_model: { traffic_minutes: ctx.trafficReport.delay_minutes, weather_minutes: ctx.weatherReport.extra_travel_minutes, total_minutes: totalDelay, assumption: "Simple demo: add the corridor delay once to every baseline stop ETA; not a live routing engine." },
    shift: { ...copy(ctx.driver), planned_elapsed_minutes: elapsed, estimated_finish: time(finish), finish_day_offset: Math.floor(finish / 1440), within_configured_shift: withinShift, note: "Configured fictional shift availability; not a jurisdiction-specific working-time compliance calculation." },
    issues, route_change_authorized: false,
  };
}

function briefing(driverId, date) {
  const ctx = context(driverId, date);
  const plan = loading(driverId, date);
  const trip = route(driverId, date);
  const issues = [...plan.issues, ...trip.issues];
  if (!ctx.driver.available || !ctx.vehicle.available || ctx.vehicle.inspection !== "passed") {
    issues.push({ severity: "blocker", code: "RESOURCE_AVAILABILITY", message: "The driver or vehicle is unavailable or the vehicle inspection has not passed." });
  }
  const blockers = issues.filter((item) => item.severity === "blocker");
  const label = blockers.length ? "blocked" : "ready_for_dispatch_review";
  return {
    driver: copy(ctx.driver), vehicle: copy(ctx.vehicle), warehouse: copy(ctx.warehouse),
    freight_order_id: ctx.freightOrder.id, carrier: ctx.freightOrder.carrier,
    readiness: { status: label, blockers, warnings: issues.filter((item) => item.severity !== "blocker"), dispatch_authorized: false },
    loading_plan: plan, route: trip, traffic: copy(ctx.trafficReport), weather: copy(ctx.weatherReport),
    voice_summary: blockers.length
      ? `${ctx.driver.name}, this is a fictional demo briefing. Dispatch is blocked by ${blockers.length} issue${blockers.length === 1 ? "" : "s"}. ${blockers.map((item) => item.message).join(" ")} Do not start the planned run until dispatch resolves them.`
      : `${ctx.driver.name}, this is a fictional demo briefing for ${ctx.freightOrder.id}. Pick ${plan.totals.requested_cases} cases, ${plan.totals.requested_pallets} separate pallet positions, weighing ${plan.totals.requested_weight_kg} kg before packaging. There are ${trip.stops.length} deliveries. Traffic and weather add ${trip.delay_model.total_minutes} minutes. No demo readiness blockers were found; dispatch still needs to confirm the actual load and route.`,
    checklist: ["Confirm actual dispatch approval.", "Check assigned vehicle and inspection.", "Verify exact SKU quantities and shortages.", "Secure the load and confirm temperature requirements.", "Confirm delivery windows and access restrictions.", "Review traffic and weather using operational sources.", "Plan breaks with dispatch."],
  };
}

const types = ["hard-constraint", "soft-constraint", "recommendation"];
const priorities = ["P1", "P2", "P3"];
const fields = ["name", "type", "priority", "scope", "conditions", "actions", "exceptions", "business_reason"];

function parseObject(text, field) {
  if (typeof text !== "string" || text.length > 24000) throw new Error(`${field} must be a JSON object string of at most 24,000 characters.`);
  let value;
  try { value = JSON.parse(text); } catch { throw new Error(`${field} contains invalid JSON. Send a serialized JSON object.`); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must describe a JSON object.`);
  return value;
}

function validateDraft(draft) {
  const errors = [];
  const questions = [];
  const warnings = [];
  for (const field of fields) {
    if (typeof draft[field] !== "string" || !draft[field].trim()) {
      errors.push({ field, message: `Missing ${field}.` });
      questions.push({
        field,
        question: ({
          name: "What short name should this rule have?",
          type: "Is this mandatory, a preference, or a recommendation? What happens if it cannot be met?",
          priority: "Should this have priority P1, P2, or P3?",
          scope: "Which customers, corridors, planning dates, goods, and vehicles does this apply to?",
          conditions: "Under exactly what circumstances should this rule apply?",
          actions: "What should the planner propose or block when it applies?",
          exceptions: "Are there exceptions? Say 'none' explicitly if there are none.",
          business_reason: "Which policy or business goal is behind this requirement?",
        })[field],
      });
    }
  }
  if (draft.type && !types.includes(draft.type)) errors.push({ field: "type", message: `Choose one of ${types.join(", ")}; the tool does not infer mandatory status from wording.` });
  if (draft.priority && !priorities.includes(draft.priority)) errors.push({ field: "priority", message: "Choose P1, P2, or P3." });
  if (draft.type === "hard-constraint" && draft.priority !== "P1") warnings.push({ field: "priority", message: "Confirm the selected priority for a hard constraint with the admin." });
  if (!Array.isArray(draft.parameters)) {
    errors.push({ field: "parameters", message: "Supply parameters as an array, or [] if the rule has no numeric/configured parameters." });
    questions.push({ field: "parameters", question: "What thresholds, units, time windows, and buffer values apply? Confirm [] if no parameters are needed." });
  } else {
    const keys = new Set();
    for (const item of draft.parameters) {
      if (!item || typeof item !== "object" || typeof item.key !== "string" || !item.key.trim() || typeof item.value !== "string" || !item.value.trim()) {
        errors.push({ field: "parameters", message: "Every parameter needs a nonempty string key and value." });
        continue;
      }
      if (keys.has(item.key)) errors.push({ field: "parameters", message: `Duplicate parameter ${item.key}.` });
      keys.add(item.key);
      if (/^\d+(\.\d+)?$/.test(item.value) && (!item.unit || typeof item.unit !== "string")) {
        errors.push({ field: `parameters.${item.key}`, message: "Numeric parameters require an explicit unit, including count or percent." });
        questions.push({ field: `parameters.${item.key}`, question: `What unit does ${item.key}=${item.value} use?` });
      }
    }
  }
  if (draft.lifecycle?.stage && !["draft", "in-review"].includes(draft.lifecycle.stage)) {
    errors.push({ field: "lifecycle", message: "Voice-created rule drafts cannot be published, approved, or retired by these tools." });
  }
  const wording = [draft.spoken_requirement, draft.conditions, draft.actions].filter((item) => typeof item === "string").join(" ").toLowerCase();
  if (/deliver|arrival|arrive|window/.test(wording) && !["contractual", "preferred", "fixed_operations", "not_applicable"].includes(draft.window_binding)) {
    errors.push({ field: "window_binding", message: "Delivery-window requirements need explicit binding status." });
    questions.push({ field: "window_binding", question: "Is the delivery window contractual/fixed, or a preferred time? What timezone applies?" });
  }
  if (/window|cutoff|departure|arrival/.test(wording) && (typeof draft.timezone !== "string" || !draft.timezone.trim())) {
    errors.push({ field: "timezone", message: "Time-based requirements need an explicit timezone." });
  } else if (draft.timezone) {
    try { new Intl.DateTimeFormat("en", { timeZone: draft.timezone }); } catch { errors.push({ field: "timezone", message: "Use an IANA timezone such as Europe/Berlin." }); }
  }
  if (["contractual", "fixed_operations"].includes(draft.window_binding) && draft.type !== "hard-constraint") {
    errors.push({ field: "type", message: "A contractual/fixed window cannot be silently treated as optional. Ask the admin to resolve the conflict." });
  }
  if (/over.?load|exceed.{0,30}capacity|above.{0,30}capacity/.test(wording)) {
    errors.push({ field: "actions", message: "Capacity wording requires admin review; no planning tolerance can authorize exceeding physical vehicle capacity." });
  }
  const compared = rules.filter((rule) => (Array.isArray(draft.related_rule_ids) ? draft.related_rule_ids : []).includes(rule.id));
  if (compared.some((rule) => rule.lifecycle.stage !== "published")) warnings.push({ field: "related_rule_ids", message: "At least one referenced policy is not published; it cannot grant operational authority." });
  return {
    valid_for_admin_review: errors.length === 0, errors, warnings, clarification_questions: questions,
    validation_scope: "Schema completeness, mandatory/preference ambiguity, units, and selected demo safeguards only. No optimizer simulation or comprehensive policy conflict analysis.",
    human_admin_review_required: true, publication_allowed: false,
  };
}

function prepareDraft(args) {
  if (typeof args.spoken_requirement !== "string" || !args.spoken_requirement.trim()) throw new Error("Provide the exact spoken requirement before preparing a rule draft.");
  const supplied = args.draft_fields_json ? parseObject(args.draft_fields_json, "draft_fields_json") : {};
  const draft = {
    spoken_requirement: args.spoken_requirement,
    ...Object.fromEntries(fields.map((field) => [field, supplied[field] ?? null])),
    parameters: supplied.parameters ?? null, window_binding: supplied.window_binding ?? null,
    timezone: supplied.timezone ?? null, source: supplied.source ?? { doc: "Spoken requirement", citation: "Demo voice conversation; policy reference unverified" },
    related_rule_ids: supplied.related_rule_ids ?? [],
    lifecycle: { stage: "draft", admin_review_required: true, approved_by: null, published_at: null },
  };
  const validation = validateDraft(draft);
  return {
    draft, validation, next_step: validation.valid_for_admin_review ? "Return this draft to an administrator for validation and approval; it is not published." : "Ask one clarification question at a time, then call prepare_rule_draft again with confirmed fields.",
    persistence: "Returned in the conversation only. No rule was saved to an admin system.",
  };
}

function checkOperationArgs(name, args) {
  const definition = toolDefinitions.find((tool) => tool.name === name);
  if (!definition) throw new Error(`Unknown tool ${name}. Use the registered transportation tools.`);
  if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("Tool arguments must be an object.");
  for (const key of definition.parameters.required) {
    if (!(key in args) || args[key] === "" || args[key] == null) throw new Error(`Action ${name} requires ${key}; ask the user to confirm it.`);
  }
  for (const [key, value] of Object.entries(args)) {
    const spec = definition.parameters.properties[key];
    if (!spec) throw new Error(`Argument ${key} is not used by action ${name}.`);
    if (spec.type === "string" && (typeof value !== "string" || value.length > (spec.maxLength ?? 200))) throw new Error(`Argument ${key} must be a string of at most ${spec.maxLength ?? 200} characters.`);
    if (spec.type === "integer" && (!Number.isInteger(value) || value < (spec.minimum ?? -Infinity) || value > (spec.maximum ?? Infinity))) throw new Error(`Argument ${key} must be an integer from ${spec.minimum ?? "unbounded"} to ${spec.maximum ?? "unbounded"}.`);
    if (spec.enum && !spec.enum.includes(value)) throw new Error(`Argument ${key} must be one of ${spec.enum.join(", ")}.`);
  }
}

export function invoke(name, args = {}) {
  try {
    checkOperationArgs(name, args);
    switch (name) {
      case "truckbuddy_demo_info":
        return success({
          project: "Talk-to-Rule for Transportation Management", rule_count: rules.length,
          capabilities: ["rule catalogue", "rule drafts", "stock", "pick/load quantities", "resource availability", "routes", "traffic", "weather", "driver morning briefing"],
          drivers: drivers.map(({ id, name: driverName, freight_order_id }) => ({ id, name: driverName, freight_order_id })),
          real_time_data: false, publishes_rules: false, mock_date_only: snapshot.date,
        });
      case "list_transport_rules": {
        const query = (args.query ?? "").toLowerCase();
        const matches = rules.filter((rule) => (!args.stage || rule.lifecycle.stage === args.stage) && (!query || [rule.name, rule.scope, ...rule.plannerInput.tags].join(" ").toLowerCase().includes(query)));
        const offset = args.offset ?? 0;
        const limit = args.limit ?? 8;
        return success({ total: matches.length, offset, rules: matches.slice(offset, offset + limit).map((rule) => ({ id: rule.id, name: rule.name, type: rule.type, priority: rule.priority, scope: rule.scope, stage: rule.lifecycle.stage, parameters: rule.parameters, issues: catalogueIssues.filter((item) => item.rule_id === rule.id) })), has_more: offset + limit < matches.length });
      }
      case "get_transport_rule": {
        const rule = find(rules, args.rule_id, "rule");
        return success({ rule: copy(rule), catalogue_issues: catalogueIssues.filter((item) => item.rule_id === rule.id), operationally_active: rule.lifecycle.stage === "published" });
      }
      case "prepare_rule_draft":
        return success(prepareDraft(args));
      case "validate_rule_draft":
        return success({ validation: validateDraft(parseObject(args.draft_json, "draft_json")) });
      case "get_stock": {
        checkDate(args.date);
        if (args.warehouse_id) find(warehouses, args.warehouse_id, "warehouse");
        const matches = stock.filter((item) => (!args.warehouse_id || item.warehouse_id === args.warehouse_id) && (!args.sku || item.sku === args.sku));
        if (args.sku && !matches.length) return fail(`SKU ${args.sku} was not found at the selected warehouse. Call get_stock without sku to discover stock IDs.`);
        return success({ stock: matches.map((item) => ({ ...copy(item), available_cases: available(item) })), stock_reserved_or_changed: false });
      }
      case "get_resource_availability": {
        checkDate(args.date);
        return success({ drivers: copy(drivers), vehicles: copy(vehicles), warehouses: copy(warehouses), resources_assigned_or_changed: false });
      }
      case "get_loading_plan":
        return success(loading(args.driver_id, args.date));
      case "get_driver_route":
        return success(route(args.driver_id, args.date));
      case "get_traffic": {
        checkDate(args.date);
        const report = traffic.find((item) => item.corridor === args.corridor);
        if (!report) return fail(`Unknown corridor ${args.corridor}. Available: ${traffic.map((item) => item.corridor).join(", ")}.`);
        return success({ report: copy(report), live_provider_connected: false });
      }
      case "get_weather": {
        checkDate(args.date);
        const report = weather.find((item) => item.region.toLowerCase() === String(args.region).toLowerCase());
        if (!report) return fail(`Unknown region ${args.region}. Available: ${weather.map((item) => item.region).join(", ")}.`);
        return success({ report: copy(report), live_provider_connected: false });
      }
      case "get_driver_day_briefing":
        return success(briefing(args.driver_id, args.date));
      default:
        return fail(`Unknown tool ${name}. Use the registered transportation tools.`);
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "The mock tool failed.");
  }
}
