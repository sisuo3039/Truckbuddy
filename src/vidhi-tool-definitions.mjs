const text = (description, extra = {}) => ({ type: "string", description, ...extra });
export const sceneIds = ["shift_start", "on_highway", "traffic_alert", "rest_stop", "temperature_alert", "sensor_stale", "arrival", "return_trip", "night_return"];
const scene = text("Scripted demo scene; not live GPS or sensor data.", { enum: sceneIds });
const persona = {
  driver_name: text("Current driver_name session variable. Default Vidhi; a configurable fictional display name.", { maxLength: 80 }),
  scene,
};
const routeChoice = text("Route to inspect. B441 is only selected after an explicit simulated confirmation; otherwise it is a proposal.", { enum: ["planned", "B441", "COMMON-DIVERSION"] });
const tool = (name, description, properties = {}, required = []) => ({
  name, description,
  parameters: { type: "object", properties: { ...persona, ...properties }, required, additionalProperties: false },
});

export const vidhiToolDefinitions = [
  tool("vidhi_get_profile", "Get the known fictional driver profile and vehicle. Do not ask the user for their name; driver_name is already configured."),
  tool("vidhi_get_shift_briefing", "Get only a short start-of-shift summary and one suggested follow-up. Do not read the whole day's data aloud."),
  tool("vidhi_get_manifest", "On request, show the exact 14 dairy pallets, SKU cases, stock, weights and delivery allocation."),
  tool("vidhi_get_loading_checklist", "On request, return load order, dock, seal and chilled-trailer checks. These are mock checks, not dispatch authorization."),
  tool("vidhi_get_cargo_rules", "On request, explain the 2–6°C cargo rule and final delivery window, one rule at a time."),
  tool("vidhi_get_temperature", "Get a scripted trailer sensor sample, including excursions and stale readings. No real sensor or automatic background monitor is connected.", { scene }),
  tool("vidhi_get_trip_timeline", "Get departure, driving/service/rest durations, final ETA and the 25-minute buffer before the window opens.", { route_choice: routeChoice }),
  tool("vidhi_get_position", "Get the scripted vehicle position for a scene. This does not subscribe to GPS or track the user.", { scene }),
  tool("vidhi_get_road_restrictions", "Get only the next low-emission zone or residential restrictions. All speed/permit/noise rules are fictional demo policy.", { scene, zone: text("next or residential; omit for the next restriction.", { enum: ["next", "residential"] }) }),
  tool("vidhi_get_permit", "Check the fictional low-emission permit already stored in the driver profile."),
  tool("vidhi_get_traffic_alert", "Get the 09:40 mock accident and its 45-minute delay. The original route still meets the window, but loses the early buffer."),
  tool("vidhi_compare_routes", "Compare the planned route, unsafe 3.8 m diversion and B441. Validate 4.1 m vehicle height and preserve a 45-minute rest; do not select a route."),
  tool("vidhi_get_rest_plan", "On request, get the configured 45-minute demo rest at km 180 or the B441 proposal at km 195. Not a real legal-hours calculation.", { route_choice: routeChoice }),
  tool("vidhi_confirm_reroute", "Return a simulated B441 selection receipt ONLY after explicit user confirmation and all demo checks pass. Does not update navigation or persist a route.", {
    route_choice: routeChoice,
    user_confirmed: { type: "boolean", description: "True only after the user explicitly accepts this route. Silence is not confirmation." },
  }, ["route_choice", "user_confirmed"]),
  tool("vidhi_get_delivery_details", "On request, show final unloading window, booking, dock, paperwork and ETA.", { route_choice: routeChoice }),
  tool("vidhi_get_weather", "Get a short fictional weather summary for the chosen scene, not a live forecast.", { scene }),
  tool("vidhi_get_scene", "Select one scripted event and a short cue. Advance only when the user asks or an external demo client injects an event. Does not trigger background alerts.", { scene }, ["scene"]),
];
