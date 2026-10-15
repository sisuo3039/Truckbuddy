import test from "node:test";
import assert from "node:assert/strict";
import { invokeVidhi } from "../src/vidhi-demo.mjs";
import hostedTool from "../dist/code-tools/truckbuddy_vidhi_mock.mjs";

test("the known driver's name defaults to Vidhi and follows a session override", () => {
  assert.equal(invokeVidhi("vidhi_get_profile").profile.name, "Vidhi");
  const override = { driver_name: "  Priya  " };
  assert.equal(invokeVidhi("vidhi_get_profile", override).profile.name, "Priya");
  assert.match(invokeVidhi("vidhi_get_shift_briefing", override).spoken_hint, /^Priya,/);
  assert.equal(invokeVidhi("vidhi_get_manifest", override).driver_name, "Priya");
  assert.match(invokeVidhi("vidhi_get_profile", { driver_name: " " }).error, /nonempty/);
  assert.match(invokeVidhi("vidhi_get_profile", { driver_name: "a".repeat(81) }).error, /80/);
});

test("the dairy manifest accounts for stock, packaging and exact loading quantities", () => {
  const { manifest } = invokeVidhi("vidhi_get_manifest");
  assert.equal(manifest.total_pallets, 14);
  assert.equal(manifest.total_cases, 672);
  assert.equal(manifest.cargo_weight_kg, 8064);
  assert.equal(manifest.total_load_weight_kg, 8414);
  assert.equal(manifest.spare_capacity_kg, 3586);
  assert.equal(manifest.all_stock_available, true);
  assert.deepEqual(manifest.items.map((item) => item.requested_cases), [192, 192, 288]);
  assert.deepEqual(manifest.items.map((item) => item.available_cases), [216, 228, 328]);
  assert.equal(manifest.stock_reserved_or_picked, false);
  assert.equal(manifest.dispatch_authorized, false);
  const checklist = invokeVidhi("vidhi_get_loading_checklist");
  assert.match(checklist.load_order[0], /stop 3/);
  assert.match(checklist.load_order[2], /stop 1/);
});

test("the baseline time includes service and rest; the buffer precedes window opening", () => {
  const timeline = invokeVidhi("vidhi_get_trip_timeline");
  assert.equal(timeline.baseline_driving_minutes + timeline.baseline_service_minutes + timeline.rest_minutes, 380);
  assert.equal(timeline.active_total_minutes, 380);
  assert.equal(timeline.timing.arrival, "12:35");
  assert.equal(timeline.timing.unloading_start, "13:00");
  assert.equal(timeline.timing.early_arrival_buffer_minutes, 25);
  assert.equal(timeline.timing.window_deadline_margin_minutes, 115);
  assert.equal(timeline.rest.duration_minutes, 45);
});

test("the accident loses the early buffer without missing the unloading window", () => {
  const incident = invokeVidhi("vidhi_get_traffic_alert").incident;
  assert.equal(incident.delay_minutes, 45);
  assert.equal(incident.delayed_arrival, "13:20");
  assert.equal(incident.early_arrival_buffer_minutes, 0);
  assert.equal(incident.within_latest_arrival, true);
  assert.equal(incident.window_deadline_margin_minutes, 70);
  const timeline = invokeVidhi("vidhi_get_trip_timeline", { scene: "traffic_alert" });
  assert.equal(timeline.active_total_minutes, 425);
  assert.equal(timeline.timing.arrival, "13:20");
  assert.equal(invokeVidhi("vidhi_get_delivery_details", { scene: "traffic_alert" }).arrival, "13:20");
});

test("route comparison rejects the low bridge and keeps B441 as a proposal", () => {
  const result = invokeVidhi("vidhi_compare_routes");
  const common = result.routes.find((route) => route.id === "COMMON-DIVERSION");
  const b441 = result.routes.find((route) => route.id === "B441");
  assert.equal(common.height_limit_m, 3.8);
  assert.equal(common.required_clearance_m, 4.2);
  assert.equal(common.height_safe, false);
  assert.equal(common.viable, false);
  assert.equal(b441.viable, true);
  assert.equal(b441.extra_distance_vs_baseline_km, 8);
  assert.equal(b441.arrival, "12:35");
  assert.equal(b441.rest.kilometre, 195);
  assert.equal(b441.rest.duration_minutes, 45);
  assert.equal(result.route_selected, false);
  assert.ok(result.routes.every((route) => route.selected === false));
});

test("simulated selection needs an explicit boolean and never changes navigation", () => {
  assert.match(invokeVidhi("vidhi_confirm_reroute", { route_choice: "B441" }).error, /requires user_confirmed/);
  assert.match(invokeVidhi("vidhi_confirm_reroute", { route_choice: "B441", user_confirmed: "yes" }).error, /boolean/);
  const declined = invokeVidhi("vidhi_confirm_reroute", { route_choice: "B441", user_confirmed: false });
  assert.equal(declined.status, "not_confirmed");
  assert.equal(declined.selected_route, null);
  const unsafe = invokeVidhi("vidhi_confirm_reroute", { route_choice: "COMMON-DIVERSION", user_confirmed: true });
  assert.ok(unsafe.error);
  assert.equal(unsafe.selected_route, null);
  const confirmed = invokeVidhi("vidhi_confirm_reroute", { route_choice: "B441", user_confirmed: true });
  assert.equal(confirmed.selected_route, "B441");
  assert.equal(confirmed.rest.finish, "11:05");
  assert.equal(confirmed.timing.arrival, "12:35");
  assert.equal(confirmed.navigation_updated, false);
  assert.equal(confirmed.persisted, false);
  assert.equal(confirmed.dispatch_authorized, false);
  // Subsequent tool calls use the selection carried by the conversation.
  assert.equal(invokeVidhi("vidhi_get_rest_plan", { route_choice: confirmed.conversation_context.selected_route }).rest.kilometre, 195);
  assert.equal(invokeVidhi("vidhi_get_delivery_details", { scene: "traffic_alert", route_choice: "B441" }).arrival, "12:35");
  assert.equal(invokeVidhi("vidhi_get_delivery_details", { scene: "traffic_alert" }).arrival, "13:20");
});

test("temperature excursions and stale readings cannot masquerade as fresh safe data", () => {
  const fresh = invokeVidhi("vidhi_get_temperature").sensor;
  assert.equal(fresh.reading_c, 4.1);
  assert.equal(fresh.status, "within_range");
  const excursion = invokeVidhi("vidhi_get_temperature", { scene: "temperature_alert" }).sensor;
  assert.equal(excursion.reading_c, 7.3);
  assert.equal(excursion.status, "outside_range");
  const stale = invokeVidhi("vidhi_get_temperature", { scene: "sensor_stale" }).sensor;
  assert.equal(stale.reading_c, null);
  assert.equal(stale.status, "unknown_stale_sensor");
  assert.equal(stale.age_minutes, 25);
  assert.equal(fresh.live_sensor_connected, false);
  assert.equal(excursion.background_monitoring_active, false);
});

test("restriction activity follows the scripted time and permits stay fictional", () => {
  const highway = invokeVidhi("vidhi_get_road_restrictions", { scene: "on_highway" }).restriction;
  assert.equal(highway.distance_ahead_km, 12);
  assert.equal(highway.speed_limit_kph, 60);
  const residential = invokeVidhi("vidhi_get_road_restrictions", { scene: "on_highway", zone: "residential" }).restriction;
  assert.equal(residential.speed_limit_kph, 30);
  assert.equal(residential.noise_restriction_active_at_scene_time, false);
  assert.equal(invokeVidhi("vidhi_get_road_restrictions", { scene: "night_return" }).restriction.noise_restriction_active_at_scene_time, true);
  assert.equal(invokeVidhi("vidhi_get_permit").permit.status, "valid");
  assert.equal(invokeVidhi("vidhi_get_permit").live_registry_connected, false);
});

test("scene events are explicit fixtures rather than background subscriptions", () => {
  const event = invokeVidhi("vidhi_get_scene", { scene: "traffic_alert" }).event;
  assert.equal(event.time, "09:40");
  assert.equal(event.automatic_trigger_connected, false);
  assert.equal(event.continuous_gps_connected, false);
  assert.match(invokeVidhi("vidhi_get_scene", { scene: "unknown" }).error, /must be one of/);
  assert.match(invokeVidhi("vidhi_get_scene").error, /requires scene/);
});

test("the hosted personalized bundle matches portable mock behavior", async () => {
  const calls = [
    ["vidhi_get_profile", {}],
    ["vidhi_get_shift_briefing", { driver_name: "Priya" }],
    ["vidhi_get_manifest", {}],
    ["vidhi_get_trip_timeline", { scene: "traffic_alert" }],
    ["vidhi_compare_routes", {}],
    ["vidhi_get_temperature", { scene: "sensor_stale" }],
    ["vidhi_confirm_reroute", { route_choice: "B441", user_confirmed: false }],
    ["vidhi_confirm_reroute", { route_choice: "COMMON-DIVERSION", user_confirmed: true }],
    ["vidhi_confirm_reroute", { route_choice: "B441", user_confirmed: true }],
    ["vidhi_get_scene", { scene: "night_return" }],
  ];
  for (const [action, args] of calls) {
    assert.deepEqual(await hostedTool({ args: { action, ...args } }), invokeVidhi(action, args));
  }
});
