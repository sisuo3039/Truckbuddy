import { vidhiToolDefinitions, sceneIds } from "./vidhi-tool-definitions.mjs";
import { resolveDriverName } from "./personalization.mjs";

const copy = (value) => JSON.parse(JSON.stringify(value));
const clocks = { shift_start: "05:47", on_highway: "06:15", traffic_alert: "09:40", rest_stop: "10:20", temperature_alert: "11:15", sensor_stale: "11:20", arrival: "12:35", return_trip: "15:10", night_return: "22:30" };
const positions = { shift_start: 0, on_highway: 0, traffic_alert: 165, rest_stop: 195, temperature_alert: 245, sensor_stale: 250, arrival: 340, return_trip: 365, night_return: 365 };
const toMinutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
const formatTime = (value) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

const vehicle = { id: "P-4418", type: "refrigerated truck", height_m: 4.1, required_clearance_margin_m: 0.1, capacity_kg: 12000, pallet_capacity: 18, temperature_setpoint_c: 4 };
const manifest = [
  { sku: "DAIRY-MILK", name: "Chilled milk", pallets: 4, cases_per_pallet: 48, case_weight_kg: 12, on_hand_cases: 240, reserved_cases: 24, quarantined_cases: 0, bin: "CHILL-A01", lot: "MILK-1015", stop: 1, customer: "West Market" },
  { sku: "DAIRY-YOGURT", name: "Chilled yogurt", pallets: 4, cases_per_pallet: 48, case_weight_kg: 12, on_hand_cases: 260, reserved_cases: 32, quarantined_cases: 0, bin: "CHILL-A02", lot: "YOGURT-1015", stop: 2, customer: "Central Store" },
  { sku: "DAIRY-CHEESE", name: "Chilled cheese", pallets: 6, cases_per_pallet: 48, case_weight_kg: 12, on_hand_cases: 380, reserved_cases: 40, quarantined_cases: 12, bin: "CHILL-A03", lot: "CHEESE-1015", stop: 3, customer: "North Distribution" },
];
const routes = [
  { id: "planned", label: "Planned route with accident delay", distance_km: 340, arrival: "13:20", height_limit_m: 4.6, rest_km: 180, rest_start: "10:15", delay_minutes: 45 },
  { id: "COMMON-DIVERSION", label: "Common diversion", distance_km: 344, arrival: "12:40", height_limit_m: 3.8, rest_km: 180, rest_start: "10:15", delay_minutes: 0 },
  { id: "B441", label: "B441 proposal", distance_km: 348, arrival: "12:35", height_limit_m: 4.6, rest_km: 195, rest_start: "10:20", delay_minutes: 0 },
];

function profile(name) {
  return { driver_id: "DRV-VIDHI-01", name, vehicle: copy(vehicle), depot: "Hanover Cold Store", loading_dock: "Cold Dock 3", experience: "Configured driver", permit: { id: "LEZ-4418-2026", zone: "Low-Emission Zone", vehicle_class: "Euro VI", status: "valid", valid_until: "2026-12-31", verified_source: "fictional profile fixture" } };
}

function load() {
  const items = manifest.map((item) => ({
    ...item, requested_cases: item.pallets * item.cases_per_pallet,
    available_cases: item.on_hand_cases - item.reserved_cases - item.quarantined_cases,
    cargo_weight_kg: item.pallets * item.cases_per_pallet * item.case_weight_kg,
  }));
  const cargo = items.reduce((sum, item) => sum + item.cargo_weight_kg, 0);
  const pallets = items.reduce((sum, item) => sum + item.pallets, 0);
  const packaging = pallets * 25;
  return {
    items, total_pallets: pallets, total_cases: items.reduce((sum, item) => sum + item.requested_cases, 0),
    cargo_weight_kg: cargo, mock_pallet_packaging_weight_kg: packaging, total_load_weight_kg: cargo + packaging,
    vehicle_capacity_kg: vehicle.capacity_kg, spare_capacity_kg: vehicle.capacity_kg - cargo - packaging,
    all_stock_available: items.every((item) => item.available_cases >= item.requested_cases),
    manifest_status: "confirmed_in_demo_fixture", stock_reserved_or_picked: false, dispatch_authorized: false,
  };
}

function timing(arrival) {
  const eta = toMinutes(arrival);
  return {
    arrival, unloading_window: ["13:00", "14:30"],
    early_arrival_buffer_minutes: Math.max(0, 780 - eta),
    window_deadline_margin_minutes: 870 - eta,
    within_latest_arrival: eta <= 870,
    unloading_start: formatTime(Math.max(780, eta)),
    meaning: "The 25-minute buffer is before the 13:00 opening, not before the 14:30 deadline. Early vehicles wait for the dock.",
  };
}

function rest(routeChoice = "planned") {
  const route = routes.find((item) => item.id === routeChoice);
  return { route_choice: route.id, kilometre: route.rest_km, start: route.rest_start, duration_minutes: 45, finish: formatTime(toMinutes(route.rest_start) + 45), configured_latest_start: "10:45", meets_configured_demo_policy: toMinutes(route.rest_start) <= 645, policy_source: "Fictional dispatch rest schedule; not a legal driving-hours determination." };
}

function comparison() {
  return routes.map((item) => {
    const clearanceRequired = Math.round((vehicle.height_m + vehicle.required_clearance_margin_m) * 100) / 100;
    const breakPlan = rest(item.id);
    return {
      ...copy(item), ...timing(item.arrival), required_clearance_m: clearanceRequired,
      height_safe: item.height_limit_m >= clearanceRequired,
      rest: breakPlan, viable: item.height_limit_m >= clearanceRequired && breakPlan.meets_configured_demo_policy && timing(item.arrival).within_latest_arrival,
      selected: false, extra_distance_vs_baseline_km: item.distance_km - 340,
    };
  });
}

function validate(name, args) {
  const definition = vidhiToolDefinitions.find((item) => item.name === name);
  if (!definition) throw new Error(`Unknown personalized demo operation ${name}.`);
  if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("Arguments must be an object.");
  for (const field of definition.parameters.required) if (!(field in args) || args[field] === "" || args[field] == null) throw new Error(`${name} requires ${field}.`);
  for (const [field, value] of Object.entries(args)) {
    const spec = definition.parameters.properties[field];
    if (!spec) throw new Error(`Argument ${field} is not used by ${name}.`);
    if (spec.type === "string" && (typeof value !== "string" || !value.trim() || value.length > (spec.maxLength ?? 200))) throw new Error(`${field} must be a nonempty string of at most ${spec.maxLength ?? 200} characters.`);
    if (spec.type === "boolean" && typeof value !== "boolean") throw new Error(`${field} must be a boolean.`);
    if (spec.enum && !spec.enum.includes(value)) throw new Error(`${field} must be one of ${spec.enum.join(", ")}.`);
  }
}

function temperature(scene) {
  const stale = scene === "sensor_stale";
  const value = stale ? null : scene === "temperature_alert" ? 7.3 : 4.1;
  return {
    vehicle_id: vehicle.id, reading_c: value, allowed_range_c: [2, 6],
    sampled_at: stale ? "10:55" : clocks[scene], age_minutes: stale ? 25 : 0,
    status: stale ? "unknown_stale_sensor" : value > 6 || value < 2 ? "outside_range" : "within_range",
    live_sensor_connected: false, background_monitoring_active: false,
    action: stale ? "No fresh reading is available; ask dispatch to check the sensor rather than assuming the load is safe." : value > 6 ? "When safely stopped, review the refrigeration checklist with dispatch. Do not claim the excursion is resolved." : "The reading is within the configured band.",
    suggested_question: value > 6 || stale ? "Would you like the dispatch checklist?" : "Want to check the delivery time next?",
  };
}

function sceneEvent(scene) {
  const events = {
    shift_start: ["vidhi_get_shift_briefing", "Would you like your morning briefing?"],
    on_highway: ["vidhi_get_road_restrictions", "There's a restricted zone ahead. Want the short version?"],
    traffic_alert: ["vidhi_compare_routes", "An accident adds 45 minutes to the planned route. Want me to compare the alternatives?"],
    rest_stop: ["vidhi_get_rest_plan", "Your planned rest is coming up. Want the stop details?"],
    temperature_alert: ["vidhi_get_temperature", "The trailer reading is above the chilled range. Want the next check?"],
    sensor_stale: ["vidhi_get_temperature", "The sensor hasn't updated. Want to review the check with dispatch?"],
    arrival: ["vidhi_get_delivery_details", "Need the dock or booking details for your delivery?"],
    return_trip: ["vidhi_get_road_restrictions", "Want to check restrictions on the return leg?"],
    night_return: ["vidhi_get_road_restrictions", "The night-time noise restriction applies here. Want the details?"],
  };
  const [action, cue] = events[scene];
  const index = sceneIds.indexOf(scene);
  return { scene, time: clocks[scene], suggested_action: action, short_cue: cue, next_scene: sceneIds[index + 1] ?? null, trigger: "user request or explicit external demo event", automatic_trigger_connected: false, continuous_gps_connected: false, alternate_branch: ["temperature_alert", "sensor_stale", "night_return"].includes(scene) };
}

export function invokeVidhi(name, args = {}) {
  const scene = args.scene ?? (["vidhi_get_traffic_alert", "vidhi_compare_routes", "vidhi_confirm_reroute"].includes(name) ? "traffic_alert" : "shift_start");
  const response = (value) => ({
    data_source: "mock",
    snapshot: { date: "2026-10-15", timezone: "Europe/Berlin", as_of: `2026-10-15T${clocks[scene] ?? "05:47"}:00+02:00`, source: "scripted_mock_scene" },
    ...value,
  });
  try {
    validate(name, args);
    const driverName = resolveDriverName(args.driver_name);
    const choice = args.route_choice ?? "planned";
    const incidentActive = !["shift_start", "on_highway"].includes(scene);
    const selectedArrival = choice === "planned" ? (incidentActive ? "13:20" : "12:35") : routes.find((item) => item.id === choice).arrival;
    switch (name) {
      case "vidhi_get_profile":
        return response({ profile: profile(driverName), user_already_known: true });
      case "vidhi_get_shift_briefing":
        return response({
          driver_name: driverName, vehicle_id: vehicle.id, load: "14 pallets of chilled dairy",
          departure: "06:15", distance_km: 340, estimated_total_minutes: 380,
          arrival: selectedArrival,
          spoken_hint: `${driverName}, today's manifest is 14 dairy pallets for P-4418, with a planned arrival of ${selectedArrival}.`,
          suggested_question: "Would you like the loading details?",
          dispatch_authorized: false,
        });
      case "vidhi_get_manifest":
        return response({ driver_name: driverName, manifest: load(), suggested_question: "Want the loading order?" });
      case "vidhi_get_loading_checklist":
        return response({ driver_name: driverName, dock: "Cold Dock 3", load_order: ["6 cheese pallets for stop 3, at the front", "4 yogurt pallets for stop 2, in the middle", "4 milk pallets for stop 1, nearest the door"], checklist: ["Verify 14 pallets and 672 cases against the actual manifest.", "Verify actual temperature and trailer pre-cooling.", "Check load restraint and packaging-inclusive weight.", "Confirm seal SEAL-4418-1015 and dispatch release."], seal: "SEAL-4418-1015", dispatch_authorized: false, suggested_question: "Would you like the temperature check?" });
      case "vidhi_get_cargo_rules":
        return response({ rules: [{ id: "DEMO-COLD-01", kind: "hard-constraint", range_c: [2, 6], instruction: "Keep chilled dairy within 2–6°C; this mock does not monitor a real trailer." }, { id: "DEMO-WINDOW-01", kind: "hard-constraint", unloading_window: ["13:00", "14:30"], instruction: "Use the confirmed fictional unloading window; early arrival means waiting for the dock." }], suggested_question: "Which rule would you like to go through?" });
      case "vidhi_get_temperature":
        return response({ sensor: temperature(scene) });
      case "vidhi_get_trip_timeline": {
        const arrival = selectedArrival;
        return response({ driver_name: driverName, departure: "06:15", distance_km: choice === "planned" ? 340 : routes.find((item) => item.id === choice).distance_km, baseline_driving_minutes: 280, baseline_service_minutes: 55, rest_minutes: 45, baseline_total_minutes: 380, active_total_minutes: toMinutes(arrival) - 375, timing: timing(arrival), rest: rest(choice), route_status: choice === "planned" ? (incidentActive ? "planned_with_incident" : "baseline_before_incident") : "proposal_unless_confirmed_in_conversation", suggested_question: "Want the rest-stop details?" });
      }
      case "vidhi_get_position":
        return response({ position: { scene, local_time: clocks[scene], route_km: positions[scene], next_low_emission_zone_in_km: scene === "on_highway" ? 12 : null, live_gps_connected: false } });
      case "vidhi_get_road_restrictions": {
        const residential = args.zone === "residential" || ["return_trip", "night_return"].includes(scene);
        const hour = toMinutes(clocks[scene]);
        return response({ restriction: residential
          ? { zone: "Residential Area", speed_limit_kph: 30, engine_braking_prohibited_between: ["22:00", "06:00"], noise_restriction_active_at_scene_time: hour >= 1320 || hour < 360, policy_source: "fictional scenario policy" }
          : { zone: "Low-Emission Zone", distance_ahead_km: 12, speed_limit_kph: 60, permit_required: true, permit_status: "confirmed_in_fictional_profile", vehicle_class: "Euro VI", policy_source: "fictional scenario policy" },
        suggested_question: residential ? "Need the return-route details?" : "Want me to check your permit?" });
      }
      case "vidhi_get_permit":
        return response({ driver_name: driverName, permit: profile(driverName).permit, live_registry_connected: false, suggested_question: "Want to check the next road restriction?" });
      case "vidhi_get_traffic_alert":
        return response({ incident: { time: "09:40", cause: "fictional accident", delay_minutes: 45, original_arrival: "12:35", delayed_arrival: "13:20", ...timing("13:20"), live_traffic_connected: false }, suggested_question: "Want me to compare the alternatives?" });
      case "vidhi_compare_routes":
        return response({ vehicle: copy(vehicle), routes: comparison(), recommended_proposal: "B441", route_selected: false, estimate_explanation: "B441 is 8 km longer but bypasses the accident; the fixed mock travel estimate preserves the 12:35 arrival, including the rest. This is not live routing.", suggested_question: "Would you like to use B441?" });
      case "vidhi_get_rest_plan":
        return response({ rest: rest(choice), route_status: choice === "planned" ? "baseline" : "proposal_unless_confirmed_in_conversation", suggested_question: "Want the updated delivery estimate?" });
      case "vidhi_confirm_reroute": {
        const candidate = comparison().find((item) => item.id === choice);
        if (!args.user_confirmed) return response({ status: "not_confirmed", selected_route: null, navigation_updated: false, suggested_question: "Would you like to select B441?" });
        if (!candidate.viable) return response({ error: "This route fails a demo height, rest or delivery-window check. Do not select it.", selected_route: null, navigation_updated: false });
        return response({
          status: "selected_in_demo_conversation", selected_route: choice,
          receipt: `DEMO-SELECTION-${choice}`, timing: timing(candidate.arrival), rest: candidate.rest,
          navigation_updated: false, persisted: false, dispatch_authorized: false,
          conversation_context: { selected_route: choice, user_confirmed: true, receipt: `DEMO-SELECTION-${choice}` },
          spoken_hint: `${choice} is your chosen route, with the 45-minute rest kept in the plan.`,
          suggested_question: "Want the updated arrival time?",
        });
      }
      case "vidhi_get_delivery_details":
        return response({ customer: "North Distribution", stop: 3, pallets: 6, cargo: "chilled cheese", booking: "BOOK-4418-1015", dock: "F6", ...timing(selectedArrival), paperwork: ["Delivery note", "Temperature record", "Seal check"], suggested_question: "Would you like the booking details repeated?" });
      case "vidhi_get_weather":
        return response({ weather: { region: "Hanover corridor", condition: scene === "on_highway" ? "light drizzle" : "overcast", temperature_c: 9, visibility_km: 7, live_provider_connected: false }, suggested_question: "Want to check the road ahead?" });
      case "vidhi_get_scene":
        return response({ event: sceneEvent(scene), driver_name: driverName });
      default:
        throw new Error("Unsupported personalized demo operation.");
    }
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "The personalized mock operation failed." });
  }
}
