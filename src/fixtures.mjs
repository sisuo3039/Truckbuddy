// Immutable, fictional snapshot. No external stock, traffic, or weather providers.
export const snapshot = {
  date: "2026-10-15",
  timezone: "Europe/Berlin",
  as_of: "2026-10-15T06:00:00+02:00",
  source: "mock",
};

export const warehouses = [
  { id: "WH-01", name: "Hamburg Demo Distribution Centre", region: "Hamburg", loading_bay: "B-04" },
  { id: "WH-02", name: "Hanover Demo Cross-Dock", region: "Hanover", loading_bay: "C-02" },
  { id: "WH-03", name: "Bremen Demo Cold Store", region: "Bremen", loading_bay: "R-01" },
];

export const stock = [
  { warehouse_id: "WH-01", sku: "AMB-100", name: "Rice, 10 kg case", unit: "case", on_hand: 640, reserved: 100, quarantined: 0, unit_weight_kg: 10, cases_per_pallet: 40, bin: "A-01-02", temperature_class: "ambient", lot: "RICE-2610", best_before: "2027-06-30" },
  { warehouse_id: "WH-01", sku: "AMB-200", name: "Bottled water, 12 kg case", unit: "case", on_hand: 960, reserved: 200, quarantined: 0, unit_weight_kg: 12, cases_per_pallet: 60, bin: "A-03-01", temperature_class: "ambient", lot: "WATER-2610", best_before: "2027-09-30" },
  { warehouse_id: "WH-01", sku: "AMB-300", name: "Household supplies, 8 kg case", unit: "case", on_hand: 300, reserved: 40, quarantined: 0, unit_weight_kg: 8, cases_per_pallet: 48, bin: "B-02-04", temperature_class: "ambient", lot: "HOME-2610", best_before: null },
  { warehouse_id: "WH-03", sku: "CHL-100", name: "Chilled dairy, 12 kg case", unit: "case", on_hand: 300, reserved: 60, quarantined: 0, unit_weight_kg: 12, cases_per_pallet: 48, bin: "COLD-01", temperature_class: "chilled", lot: "DAIRY-1015", best_before: "2026-10-20", required_temperature_c: [2, 6] },
  { warehouse_id: "WH-03", sku: "CHL-200", name: "Fresh produce, 8 kg case", unit: "case", on_hand: 110, reserved: 10, quarantined: 10, unit_weight_kg: 8, cases_per_pallet: 50, bin: "COLD-03", temperature_class: "chilled", lot: "PRODUCE-1015", best_before: "2026-10-18", required_temperature_c: [2, 8] },
  { warehouse_id: "WH-02", sku: "AMB-400", name: "Cross-dock supplies, 15 kg case", unit: "case", on_hand: 200, reserved: 0, quarantined: 0, unit_weight_kg: 15, cases_per_pallet: 50, bin: "XD-02", temperature_class: "ambient", lot: "HUB-2610", best_before: null },
];

export const vehicles = [
  { id: "V-017", registration: "DEMO-HH-017", capacity_kg: 9000, pallet_capacity: 18, temperature_class: "ambient", height_m: 3.8, available: true, inspection: "passed", fuel_pct: 82 },
  { id: "V-022", registration: "DEMO-HB-022", capacity_kg: 6000, pallet_capacity: 12, temperature_class: "chilled", height_m: 3.5, available: true, inspection: "passed", fuel_pct: 71, temperature_setpoint_c: 4 },
  { id: "V-031", registration: "DEMO-HA-031", capacity_kg: 1800, pallet_capacity: 5, temperature_class: "ambient", height_m: 3.2, available: true, inspection: "passed", fuel_pct: 64 },
];

export const drivers = [
  { id: "D-001", name: "Alex Morgan", vehicle_id: "V-017", freight_order_id: "FO-001", warehouse_id: "WH-01", available: true, shift_start: "06:00", shift_end: "15:00", remaining_shift_minutes: 540, planned_break_minutes: 45 },
  { id: "D-002", name: "Jamie Chen", vehicle_id: "V-022", freight_order_id: "FO-002", warehouse_id: "WH-03", available: true, shift_start: "06:00", shift_end: "14:00", remaining_shift_minutes: 480, planned_break_minutes: 45 },
  { id: "D-003", name: "Sam Rivera", vehicle_id: "V-031", freight_order_id: "FO-041", warehouse_id: "WH-02", available: true, shift_start: "07:00", shift_end: "15:00", remaining_shift_minutes: 480, planned_break_minutes: 45 },
];

export const freightOrders = [
  {
    id: "FO-001", driver_id: "D-001", warehouse_id: "WH-01", corridor: "Corridor-A",
    region: "Hamburg", departure_time: "07:00", planned_duration_minutes: 315,
    destination_type: "STORE", carrier: "Northline Demo Logistics", carrier_tier: "Preferred",
    stops: [
      { id: "S-14", customer: "North Market Demo", city: "Hamburg", eta: "08:15", service_minutes: 20, delivery_window: ["08:00", "09:00"], window_binding: "contractual", shipment_count: 3, contract_priority: "HIGH", access: "Vehicle height must be at most 4.0 m; use rear loading dock.", lines: [{ sku: "AMB-100", quantity: 80 }, { sku: "AMB-200", quantity: 60 }] },
      { id: "S-18", customer: "Lakeside Retail Demo", city: "Lübeck", eta: "09:45", service_minutes: 25, delivery_window: ["09:00", "11:00"], window_binding: "preferred", shipment_count: 6, contract_priority: "NORMAL", access: "Delivery booking DEMO-1815. Pallet jack available.", lines: [{ sku: "AMB-100", quantity: 120 }, { sku: "AMB-300", quantity: 48 }] },
      { id: "S-21", customer: "East Depot Demo", city: "Kiel", eta: "11:30", service_minutes: 20, delivery_window: ["10:00", "13:00"], window_binding: "preferred", shipment_count: 4, contract_priority: "NORMAL", access: "Maximum vehicle height 4.0 m. Terminal stop.", lines: [{ sku: "AMB-200", quantity: 120 }, { sku: "AMB-300", quantity: 48 }] },
    ],
    backload: { hub: "Hub-3", available: true, weight_kg: 350, detour_minutes: 8, handling_minutes: 12, temperature_class: "ambient", approval: "pending", rule_id: "R-008" },
  },
  {
    id: "FO-002", driver_id: "D-002", warehouse_id: "WH-03", corridor: "Corridor-B",
    region: "Bremen", departure_time: "06:45", planned_duration_minutes: 245,
    destination_type: "STORE", carrier: "Coldline Demo Logistics", carrier_tier: "Standard",
    stops: [
      { id: "S-30", customer: "Fresh Market Demo", city: "Bremen", eta: "08:10", service_minutes: 20, delivery_window: ["07:30", "08:30"], window_binding: "contractual", shipment_count: 6, contract_priority: "HIGH", access: "Chilled goods only. Record temperature on arrival.", lines: [{ sku: "CHL-100", quantity: 96 }, { sku: "CHL-200", quantity: 120 }] },
      { id: "S-32", customer: "Cold Store Demo", city: "Oldenburg", eta: "10:00", service_minutes: 25, delivery_window: ["09:00", "11:00"], window_binding: "preferred", shipment_count: 5, contract_priority: "NORMAL", access: "Use refrigerated dock R2.", lines: [{ sku: "CHL-100", quantity: 48 }] },
    ],
    backload: { hub: "Hub-3", available: true, weight_kg: 350, detour_minutes: 8, handling_minutes: 12, temperature_class: "ambient", approval: "pending", rule_id: "R-008" },
  },
  {
    id: "FO-041", driver_id: "D-003", warehouse_id: "WH-02", corridor: "Corridor-D",
    region: "Hanover", departure_time: "07:30", planned_duration_minutes: 210,
    destination_type: "CROSS_DOCK", carrier: "Hubline Demo Logistics", carrier_tier: "Preferred",
    target_hub_departure: "10:00", eta_at_hub: "09:52",
    stops: [
      { id: "S-41", customer: "Hanover Cross-Dock Demo", city: "Hanover", eta: "09:52", service_minutes: 20, delivery_window: ["09:00", "09:40"], window_binding: "fixed_hub_cutoff", shipment_count: 6, contract_priority: "HIGH", access: "Arrive 20 minutes before the 10:00 hub departure.", lines: [{ sku: "AMB-400", quantity: 125 }] },
    ],
    alternative_corridor: { corridor: "Corridor-E", eta_at_hub: "09:28", approval: "pending" },
  },
];

export const traffic = [
  { corridor: "Corridor-A", region: "Hamburg", delay_minutes: 18, severity: "moderate", incidents: [{ road: "A1", type: "roadworks", detail: "One lane closed in this fictional morning scenario." }], alternative: "Planner may assess B75; no route change has been authorized." },
  { corridor: "Corridor-B", region: "Bremen", delay_minutes: 25, severity: "heavy", incidents: [{ road: "A28", type: "congestion", detail: "Fictional queuing at the eastbound junction." }], alternative: "Earlier dispatch or stop resequencing needs planner review." },
  { corridor: "Corridor-D", region: "Hanover", delay_minutes: 0, severity: "clear", incidents: [], alternative: "Corridor-E reaches the hub at 09:28 in this demo, subject to planner review." },
  { corridor: "Corridor-E", region: "Hanover", delay_minutes: 0, severity: "clear", incidents: [], alternative: null },
];

export const weather = [
  { region: "Hamburg", condition: "rain", temperature_c: 11, wind_kph: 28, gust_kph: 42, visibility_km: 6, extra_travel_minutes: 7, warnings: ["Wet loading bay: secure pallets and keep goods covered."] },
  { region: "Bremen", condition: "fog", temperature_c: 9, wind_kph: 12, gust_kph: 20, visibility_km: 0.8, extra_travel_minutes: 10, warnings: ["Reduced visibility in this demo. Ask dispatch to reassess the first delivery window."] },
  { region: "Hanover", condition: "overcast", temperature_c: 10, wind_kph: 15, gust_kph: 22, visibility_km: 10, extra_travel_minutes: 0, warnings: [] },
];

export const catalogueIssues = [
  { rule_id: "R-002", severity: "review", issue: "The planning tolerance wording must never authorize dispatch above physical vehicle capacity." },
  { rule_id: "R-003", severity: "review", issue: "The source example states 24 + 11 shipments equals 28; the actual sum is 35, which exceeds the 30-shipment cap." },
  { rule_id: "R-006", severity: "review", issue: "The condition text omits the 20-minute arrival buffer described in its parameters and policy. Driver readiness uses the buffered cutoff." },
  { rule_id: "R-007", severity: "clarification", issue: "Catalogue type is soft-constraint while the source describes committed windows. Ask whether each new window is contractual or preferred." },
  { rule_id: "R-008", severity: "draft", issue: "Backload policy is a draft. Opportunities are informational and must not be treated as approved instructions." },
];
