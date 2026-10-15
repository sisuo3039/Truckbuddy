// ─── Demo Rule Definitions — Transportation Planning Refinement Assistant ──────
// Fully fictional rule catalogue for hackathon / demo use.
// Each rule follows the same structure used in the Rule Maintenance view:
//   rule        — machine-readable definition (conditions, actions, parameters)
//   plannerInput — business context written by the human planner / rule creator
//   source      — where the rule originates (SOP, policy doc, contract clause)
//   lifecycle   — submission, approval, audit trail

export interface RuleParameter {
  key: string;
  value: string;
  description?: string;
}

export interface RuleValidationCheck {
  check: string;
  passed: boolean;
}

export interface RuleAuditEntry {
  action: 'created' | 'edited' | 'submitted' | 'approved' | 'published' | 'retired' | 'rejected';
  by: string;
  date: string;
  note?: string;
}

export interface DemoRule {
  id: string;
  candidateId: string;
  name: string;
  type: 'hard-constraint' | 'soft-constraint' | 'recommendation';
  priority: 'P1' | 'P2' | 'P3';
  scope: string;
  conditions: string;
  actions: string;
  parameters: RuleParameter[];
  exceptions: string;
  plannerInput: {
    description: string;
    businessReason: string;
    exampleScenario: string;
    counterExample: string;
    attachedDocs: string[];
    tags: string[];
  };
  source: {
    doc: string;
    citation: string;
    clause: string;
  };
  lifecycle: {
    submittedBy: string;
    submittedDate: string;
    approvedBy?: string;
    approvedDate?: string;
    stage: 'draft' | 'in-review' | 'published' | 'retired';
    firedLast7d: number;
    auditLog: RuleAuditEntry[];
  };
}

export const DEMO_RULE_DEFINITIONS: DemoRule[] = [
  // ── R-001 ─────────────────────────────────────────────────────────────────
  {
    id: 'R-001',
    candidateId: 'RC-201',
    name: 'Minimum shipments per stop',
    type: 'soft-constraint',
    priority: 'P2',
    scope: 'All non-terminal stops in daily planning sessions',
    conditions:
      'IF stop.shipment_count < min_shipments\n' +
      'AND stop.position ≠ LAST_STOP(fo)',
    actions:
      'Flag stop for consolidation. Propose moving its shipments to the highest-utilisation admissible FO on the same corridor and planning date.',
    parameters: [
      { key: 'min_shipments', value: '5', description: 'Minimum number of shipments a stop must carry to justify a dedicated vehicle visit' },
      { key: 'corridor_match_required', value: 'true', description: 'Candidate target FO must share the same corridor as the origin FO' },
    ],
    exceptions:
      'Terminal stops (last stop on an FO) are exempt — removing them would create an empty FO.\n' +
      'Stops with perishable goods marked urgent are also exempt.',
    plannerInput: {
      description:
        'Any stop carrying fewer than 5 shipments should be consolidated into a compatible route on the same corridor. ' +
        'The system identifies the best-fit target FO automatically and presents it for planner approval before making any changes.',
      businessReason:
        'Low-volume stops are disproportionately expensive: fixed vehicle overheads (driver time, fuel, toll) are spread across fewer shipments. ' +
        'The 5-shipment threshold was agreed with Operations in Q4 2025 as the point at which a stop becomes cost-negative on standard routes.',
      exampleScenario:
        'Stop S-14 on FO-001 has 3 shipments. FO-006 (same corridor, same day) has capacity for 4 more. ' +
        'The system proposes: remove S-14 from FO-001 and append it to FO-006. ' +
        'After consolidation: FO-001 drops from 8 to 7 stops; FO-006 grows from 5 to 6 stops. ' +
        'Both remain within their vehicle capacity limits.',
      counterExample:
        'S-31 is the last stop on FO-013 and has only 2 shipments. This rule does NOT fire: ' +
        'removing the terminal stop would leave FO-013 with no end point, which is invalid. ' +
        'A separate rule (R-004) handles single-stop FO cancellation in that scenario.',
      attachedDocs: ['Planning_Efficiency_Guidelines_v3.pdf', 'Q4_2025_Stop_Threshold_Review.xlsx'],
      tags: ['consolidation', 'utilisation', 'cost-per-shipment'],
    },
    source: {
      doc: 'Planning Efficiency Guidelines v3',
      citation: '§3.2 Minimum stop volume',
      clause:
        'Stops carrying fewer than 5 shipments shall be consolidated into an admissible route on the same corridor where operationally feasible. ' +
        'Terminal stops and urgent-perishable stops are excluded from this requirement.',
    },
    lifecycle: {
      submittedBy: 'T. Morgan',
      submittedDate: '2026-05-02',
      approvedBy: 'L. Torres',
      approvedDate: '2026-05-08',
      stage: 'published',
      firedLast7d: 22,
      auditLog: [
        { action: 'created',   by: 'T. Morgan', date: '2026-05-02' },
        { action: 'edited',    by: 'T. Morgan', date: '2026-05-05', note: 'Raised threshold from 4 to 5 following Ops feedback' },
        { action: 'submitted', by: 'T. Morgan', date: '2026-05-06' },
        { action: 'approved',  by: 'L. Torres', date: '2026-05-08' },
        { action: 'published', by: 'L. Torres', date: '2026-05-08' },
      ],
    },
  },

  // ── R-002 ─────────────────────────────────────────────────────────────────
  {
    id: 'R-002',
    candidateId: 'RC-202',
    name: 'Vehicle capacity utilisation ±5%',
    type: 'soft-constraint',
    priority: 'P2',
    scope: 'Freight orders where at least one shipment unit is over- or under-capacity',
    conditions:
      'IF fo.load_weight > fo.vehicle.capacity_kg * (1 + tolerance_pct / 100)\n' +
      'OR fo.load_weight < fo.vehicle.capacity_kg * (1 - tolerance_pct / 100)',
    actions:
      'Over-capacity: propose reassigning the lowest-priority shipment units until the FO is within tolerance.\n' +
      'Under-capacity: flag for optional consolidation — do not auto-cancel.',
    parameters: [
      { key: 'tolerance_pct', value: '5', description: 'Allowed deviation from nominal vehicle capacity in each direction (%)' },
      { key: 'priority_field', value: 'shipment.priority_rank', description: 'Field used to rank shipments when selecting which to move first' },
    ],
    exceptions:
      'FOs with a "locked" status (edited by another planner) are skipped — the system cannot move shipments from a locked FO.\n' +
      'Express-lane FOs are exempt from under-capacity consolidation: they are always dispatched as-is.',
    plannerInput: {
      description:
        'This rule monitors freight order load against the assigned vehicle capacity. ' +
        'If an FO is more than 5% over capacity, the system proposes moving low-priority shipments to an admissible target. ' +
        'If an FO is more than 5% under capacity, it flags the gap as a consolidation opportunity but does not force a change.',
      businessReason:
        'Over-capacity FOs create safety and compliance risk (overloaded vehicles). ' +
        'Under-capacity FOs waste vehicle capacity that could absorb shipments from other routes. ' +
        'The 5% tolerance buffer acknowledges that exact-fill loading is operationally impractical and avoids excessive churn.',
      exampleScenario:
        'FO-014 is assigned a 1,000 kg vehicle and currently carries 1,080 kg (8% over). ' +
        'The two lowest-priority shipments total 120 kg. ' +
        'The system finds FO-015 (same corridor, 160 kg headroom) as the admissible target. ' +
        'Proposed action: reassign SU-2401 and SU-2402 from FO-014 to FO-015. ' +
        'Post-move: FO-014 at 960 kg (4% under, within tolerance), FO-015 at 990 kg (1% under).',
      counterExample:
        'FO-031 is assigned to a locked planner session (C. Park is actively editing it). ' +
        'Even though FO-031 is 9% over capacity, this rule skips it. ' +
        'The system surfaces a warning to C. Park instead and leaves the recommendation for the next planning cycle.',
      attachedDocs: ['Vehicle_Capacity_Policy_v2.pdf'],
      tags: ['capacity', 'load-balancing', 'compliance'],
    },
    source: {
      doc: 'Vehicle Capacity Policy v2',
      citation: '§2.1 Load limits and tolerance',
      clause:
        'Freight orders must not exceed their assigned vehicle gross weight capacity. ' +
        'A planning tolerance of ±5% is permitted to accommodate last-minute weight variations. ' +
        'Persistent over-capacity must be resolved before dispatch authorisation.',
    },
    lifecycle: {
      submittedBy: 'R. Patel (Consultant)',
      submittedDate: '2026-03-12',
      approvedBy: 'S. Kim',
      approvedDate: '2026-03-18',
      stage: 'published',
      firedLast7d: 9,
      auditLog: [
        { action: 'created',   by: 'R. Patel (Consultant)', date: '2026-03-12' },
        { action: 'published', by: 'S. Kim',                date: '2026-03-18' },
      ],
    },
  },

  // ── R-003 ─────────────────────────────────────────────────────────────────
  {
    id: 'R-003',
    candidateId: 'RC-203',
    name: 'Order consolidation — same corridor',
    type: 'recommendation',
    priority: 'P3',
    scope: 'Pairs of FOs on the same planning date that share a corridor',
    conditions:
      'IF fo_a.corridor = fo_b.corridor\n' +
      'AND fo_a.date = fo_b.date\n' +
      'AND (fo_a.shipment_count + fo_b.shipment_count) ≤ max_consolidated_shipments',
    actions:
      'Propose merging the smaller FO (by shipment count) into the larger one. ' +
      'Resequence stops by geographic proximity after merge. Present as a recommendation — do not auto-apply.',
    parameters: [
      { key: 'max_consolidated_shipments', value: '30', description: 'Maximum combined shipment count allowed after consolidation' },
      { key: 'sequence_method', value: 'geo_proximity', description: 'Algorithm used to re-order stops after merge (geo_proximity or original_order)' },
    ],
    exceptions:
      'Do not consolidate if either FO has a "time-critical" shipment with a tight delivery window that would be violated by the merged route. ' +
      'Do not consolidate across different vehicle types (e.g., refrigerated and ambient cannot share a vehicle).',
    plannerInput: {
      description:
        'When two freight orders on the same day serve the same corridor and their combined load fits within a single FO, ' +
        'the system suggests merging them. This eliminates one vehicle dispatch entirely. ' +
        'The planner sees a before/after comparison and approves or dismisses the consolidation.',
      businessReason:
        'Running two partial loads on the same corridor on the same day doubles fixed vehicle costs for that lane. ' +
        'Consolidation is the highest-value optimisation in daily planning — a single accepted consolidation typically saves €80–€150 in direct vehicle costs.',
      exampleScenario:
        'FO-001 (Corridor-A → Zone-12, 17 stops, 24 shipments) and FO-002 (same corridor, 3 stops, 11 shipments) are both planned for Monday. ' +
        'Combined: 28 shipments — within the 30-shipment cap. ' +
        'The system proposes merging FO-002 into FO-001, resequencing stops by proximity. ' +
        'Net saving: 1 vehicle dispatch eliminated, 3 stops absorbed into an existing optimised route.',
      counterExample:
        'FO-008 and FO-009 share Corridor-B. Combined they would have 34 shipments — above the 30-shipment cap. ' +
        'This rule does not fire. A partial consolidation (moving only some stops) is out of scope for this rule ' +
        'and would be handled by R-001 (minimum stop volume) instead.',
      attachedDocs: ['Corridor_Planning_Standard_v4.pdf'],
      tags: ['consolidation', 'corridor', 'vehicle-elimination'],
    },
    source: {
      doc: 'Corridor Planning Standard v4',
      citation: '§5.3 Same-day corridor consolidation',
      clause:
        'Where two or more freight orders on the same planning date serve the same primary corridor and their combined shipment count does not exceed 30, ' +
        'the planning system shall propose consolidation. Acceptance is at planner discretion.',
    },
    lifecycle: {
      submittedBy: 'T. Morgan',
      submittedDate: '2026-04-18',
      approvedBy: 'L. Torres',
      approvedDate: '2026-04-22',
      stage: 'published',
      firedLast7d: 6,
      auditLog: [
        { action: 'created',   by: 'T. Morgan', date: '2026-04-18' },
        { action: 'edited',    by: 'T. Morgan', date: '2026-04-20', note: 'Added vehicle-type incompatibility exception after refrigerated-ambient incident in WH-02' },
        { action: 'published', by: 'L. Torres', date: '2026-04-22' },
      ],
    },
  },

  // ── R-004 ─────────────────────────────────────────────────────────────────
  {
    id: 'R-004',
    candidateId: 'RC-204',
    name: 'Cancel low-volume single-stop freight orders',
    type: 'soft-constraint',
    priority: 'P2',
    scope: 'Freight orders with exactly one stop and fewer than the minimum shipments threshold',
    conditions:
      'IF fo.stop_count = 1\n' +
      'AND fo.shipment_count < min_shipments_single_stop\n' +
      'AND admissible_target_fo EXISTS',
    actions:
      'Propose reassigning all shipments to the admissible target FO, then cancel the single-stop FO. ' +
      'Requires explicit planner confirmation before cancellation.',
    parameters: [
      { key: 'min_shipments_single_stop', value: '5', description: 'Minimum shipment count to justify a standalone single-stop FO' },
      { key: 'require_confirmation', value: 'true', description: 'Planner must explicitly confirm cancellation — system will not auto-cancel' },
    ],
    exceptions:
      'Do not cancel if no admissible target FO exists on the same day and corridor. ' +
      'Do not cancel if the shipments are marked urgent or time-critical. ' +
      'Do not cancel if the stop is a contractually obligated delivery (contract_priority = HIGH).',
    plannerInput: {
      description:
        'A freight order with a single stop and fewer than 5 shipments is almost always cheaper to absorb into a nearby route. ' +
        'This rule identifies those FOs and proposes cancellation — but only when a safe receiving FO exists. ' +
        'The system never auto-cancels; the planner must confirm.',
      businessReason:
        'Single-stop FOs with low volume have the worst cost-per-shipment ratio: an entire vehicle is dispatched for a handful of units. ' +
        'In high-volume planning windows (Monday mornings, pre-holiday days) these accumulate quickly. ' +
        'Eliminating them frees up vehicle capacity for higher-density routes.',
      exampleScenario:
        'FO-005 has 1 stop (S-21) with 4 shipments. FO-009 (same corridor, same day) has capacity for 4 more shipments. ' +
        'The system proposes: reassign SU-2301..2304 from FO-005 to FO-009 → append Stop S-21 to FO-009 → cancel FO-005. ' +
        'After the change: FO-009 grows from 22 to 26 shipments across 7 stops. FO-005 is cancelled.',
      counterExample:
        'FO-023 also has 1 stop and only 3 shipments — but those shipments are flagged urgent and time-critical (delivery window 08:00–09:00). ' +
        'The only available receiving FO is FO-019, which would arrive at 09:45 — outside the window. ' +
        'This rule does not fire. FO-023 runs as a standalone order.',
      attachedDocs: ['Single_Stop_FO_Policy_2026.pdf'],
      tags: ['cancellation', 'single-stop', 'low-volume'],
    },
    source: {
      doc: 'Single-Stop FO Policy 2026',
      citation: '§4.1 Low-volume single-stop orders',
      clause:
        'Freight orders with exactly one stop and fewer than 5 shipments shall be reviewed for cancellation at each daily planning session. ' +
        'Cancellation requires an admissible receiving FO and explicit planner authorisation.',
    },
    lifecycle: {
      submittedBy: 'C. Park',
      submittedDate: '2026-02-28',
      approvedBy: 'L. Torres',
      approvedDate: '2026-03-04',
      stage: 'published',
      firedLast7d: 4,
      auditLog: [
        { action: 'created',   by: 'C. Park',   date: '2026-02-28' },
        { action: 'edited',    by: 'C. Park',   date: '2026-03-01', note: 'Added contract_priority exception after WH-01 issue' },
        { action: 'published', by: 'L. Torres', date: '2026-03-04' },
      ],
    },
  },

  // ── R-005 ─────────────────────────────────────────────────────────────────
  {
    id: 'R-005',
    candidateId: 'RC-205',
    name: 'Carrier preference ranking',
    type: 'recommendation',
    priority: 'P3',
    scope: 'FOs where vehicle assignment has not yet been confirmed',
    conditions:
      'IF fo.vehicle_status = UNASSIGNED\n' +
      'AND carrier_preference_list EXISTS FOR fo.corridor',
    actions:
      'Rank available carriers by preference tier (Preferred → Standard → Spot) and propose the highest-ranked carrier with available capacity on the FO date.',
    parameters: [
      { key: 'preference_tiers', value: 'Preferred,Standard,Spot', description: 'Ordered list of carrier tiers; system assigns from left to right' },
      { key: 'fallback_to_spot', value: 'true', description: 'Allow spot carriers when no Preferred or Standard carrier is available' },
    ],
    exceptions:
      'If a planner has manually pinned a carrier to the FO, do not override. ' +
      'Hazmat-classified FOs must only be assigned to carriers with a current hazmat licence — tier preference applies within that subset.',
    plannerInput: {
      description:
        'When an FO has no vehicle assigned yet, the system checks the corridor carrier preference list and recommends the best-available carrier. ' +
        'The recommendation shows the carrier tier, current utilisation, and estimated cost differential versus a spot carrier. ' +
        'The planner accepts or picks an alternative.',
      businessReason:
        'Preferred and Standard carriers have negotiated rates and established service reliability on their corridors. ' +
        'Using them instead of spot carriers reduces cost and service variability. ' +
        'The system automates the lookup that planners currently do manually in a separate spreadsheet.',
      exampleScenario:
        'FO-028 covers Corridor-C → Zone-34, vehicle not yet assigned. ' +
        'Preference list for Corridor-C: Carrier A (Preferred), Carrier B (Standard), Carrier C (Spot). ' +
        'Carrier A has no available vehicles on Monday. ' +
        'System recommends Carrier B — estimated rate €240, compared to €310 for the cheapest spot option. ' +
        'Planner accepts.',
      counterExample:
        'FO-030 carries a hazmat-classified shipment. Carrier A (Preferred) does not have a current hazmat licence. ' +
        'The system skips Carrier A and recommends Carrier D — the highest-tier carrier with a valid hazmat licence for that corridor.',
      attachedDocs: ['Carrier_Preference_Matrix_2026.xlsx'],
      tags: ['carrier-selection', 'cost', 'preferred-carrier'],
    },
    source: {
      doc: 'Carrier Preference Matrix 2026',
      citation: '§1.2 Carrier assignment priority',
      clause:
        'Freight orders must be assigned to the highest-tier available carrier on the relevant corridor. ' +
        'Spot carriers may only be used when no Preferred or Standard carrier has available capacity.',
    },
    lifecycle: {
      submittedBy: 'D. Santos',
      submittedDate: '2026-05-10',
      approvedBy: 'S. Kim',
      approvedDate: '2026-05-16',
      stage: 'published',
      firedLast7d: 11,
      auditLog: [
        { action: 'created',   by: 'D. Santos', date: '2026-05-10' },
        { action: 'edited',    by: 'D. Santos', date: '2026-05-13', note: 'Added hazmat-licence constraint after compliance review' },
        { action: 'published', by: 'S. Kim',    date: '2026-05-16' },
      ],
    },
  },

  // ── R-006 ─────────────────────────────────────────────────────────────────
  {
    id: 'R-006',
    candidateId: 'RC-206',
    name: 'Cross-dock departure window alignment',
    type: 'hard-constraint',
    priority: 'P1',
    scope: 'Inbound FOs that feed a cross-dock hub departure',
    conditions:
      'IF fo.destination_type = CROSS_DOCK\n' +
      'AND fo.eta > hub.departure_window_end',
    actions:
      'Block the FO from being confirmed in its current form. Propose either (a) re-routing through a faster corridor or (b) deferring to the next hub departure window.',
    parameters: [
      { key: 'hub_departure_windows', value: '06:00,10:00,14:00,18:00', description: 'Fixed departure slots at the cross-dock hub (local time)' },
      { key: 'eta_buffer_minutes', value: '20', description: 'Minimum buffer (minutes) required between FO arrival and hub departure' },
    ],
    exceptions: 'No exceptions — cross-dock windows are fixed by hub operations and cannot be negotiated at the FO level.',
    plannerInput: {
      description:
        'FOs delivering to the cross-dock hub must arrive at least 20 minutes before a scheduled hub departure. ' +
        'If the current route ETA would miss a window, the system blocks confirmation and offers two resolutions: ' +
        'reroute via a faster corridor (if one exists) or defer to the next hub departure.',
      businessReason:
        'The cross-dock hub runs on four fixed departure slots per day. Missing a slot means the outbound shipments wait up to 4 hours for the next one — ' +
        'turning a 1-hour delay into a half-day delay for end customers. ' +
        'This rule prevents late-arriving FOs from silently missing their slot during planning.',
      exampleScenario:
        'FO-041 is routed via Corridor-D with an ETA of 09:52 at the hub. ' +
        'The 10:00 departure requires arrival by 09:40 (20-minute buffer). ETA 09:52 fails the check. ' +
        'Options offered: (a) reroute via Corridor-E — ETA improves to 09:28, within buffer; ' +
        '(b) defer to the 14:00 departure — adds 4 hours but guarantees the slot. ' +
        'Planner chooses option (a).',
      counterExample:
        'FO-044 is a direct delivery (destination_type = STORE), not a cross-dock feeder. ' +
        'This rule does not apply. Delivery time-window compliance is handled by R-007 instead.',
      attachedDocs: ['Cross_Dock_Hub_Operations_Manual.pdf', 'Hub_Departure_Schedule_2026.xlsx'],
      tags: ['cross-dock', 'time-window', 'hard-block'],
    },
    source: {
      doc: 'Cross-Dock Hub Operations Manual',
      citation: '§7.4 Inbound FO arrival requirements',
      clause:
        'All inbound freight orders must arrive at the cross-dock hub no later than 20 minutes before their target departure window. ' +
        'FOs that cannot meet this requirement must either be rerouted or deferred to a later departure.',
    },
    lifecycle: {
      submittedBy: 'R. Patel (Consultant)',
      submittedDate: '2026-01-20',
      approvedBy: 'L. Torres',
      approvedDate: '2026-01-27',
      stage: 'published',
      firedLast7d: 3,
      auditLog: [
        { action: 'created',   by: 'R. Patel (Consultant)', date: '2026-01-20' },
        { action: 'edited',    by: 'R. Patel (Consultant)', date: '2026-01-23', note: 'Increased ETA buffer from 15 to 20 min based on hub manager feedback' },
        { action: 'published', by: 'L. Torres',             date: '2026-01-27' },
      ],
    },
  },

  // ── R-007 ─────────────────────────────────────────────────────────────────
  {
    id: 'R-007',
    candidateId: 'RC-207',
    name: 'Delivery time-window compliance',
    type: 'soft-constraint',
    priority: 'P2',
    scope: 'Stops with a committed delivery time window',
    conditions:
      'IF stop.has_delivery_window = true\n' +
      'AND stop.eta > stop.window_end',
    actions:
      'Propose re-sequencing the stop to an earlier position in the FO route. ' +
      'If re-sequencing is insufficient, propose splitting the FO to create a dedicated early run for the time-critical stop.',
    parameters: [
      { key: 'max_sequence_shift', value: '3', description: 'Maximum number of positions a stop may be moved earlier in the sequence' },
      { key: 'split_threshold_minutes', value: '30', description: 'If re-sequencing would save fewer than this many minutes, propose an FO split instead' },
    ],
    exceptions:
      'Stops that are already in position 1 cannot be moved earlier — the system flags them for manual review. ' +
      'If re-sequencing would cause a different stop to miss its own window, the re-sequence is not proposed.',
    plannerInput: {
      description:
        'When a stop has a committed delivery window and the current route ETA would arrive late, ' +
        'the system proposes moving the stop earlier in the sequence. ' +
        'If moving the stop would cause a cascade of window violations elsewhere in the FO, the system instead proposes splitting the FO.',
      businessReason:
        'Missed delivery windows trigger penalties under retailer service-level agreements. ' +
        'They also damage the relationship with store managers who rely on predictable replenishment times. ' +
        'Re-sequencing is almost always cheaper and faster to execute than an unplanned split.',
      exampleScenario:
        'FO-013 has 5 stops. Stop S-31 (position 4) has a delivery window of 10:00–12:00. ' +
        'Current ETA for S-31: 12:18 — 18 minutes late. ' +
        'Re-sequence option: move S-31 to position 2. New ETA: 11:24 — within window. ' +
        'Check: do stops at positions 2 and 3 (S-30 and S-32) still hit their windows? ' +
        'Yes — S-30 shifts to position 3 (ETA 11:52, window 10:00–14:00 ✓) and S-32 stays within range. ' +
        'Proposal is valid.',
      counterExample:
        'FO-019 has Stop S-44 at position 1 with a window of 07:30–08:30. Current ETA is 08:45. ' +
        'S-44 is already first — it cannot be moved earlier. The rule flags this for manual planner review ' +
        'with a note: "Consider earlier vehicle dispatch or FO split."',
      attachedDocs: ['SLA_Delivery_Windows_Register.xlsx'],
      tags: ['time-window', 'sla', 'resequence'],
    },
    source: {
      doc: 'SLA Delivery Windows Register',
      citation: 'Master SLA §2.4 On-time delivery',
      clause:
        'Deliveries to locations with a committed time window must arrive within the agreed window. ' +
        'Planning systems must detect and resolve time-window violations before route confirmation.',
    },
    lifecycle: {
      submittedBy: 'T. Morgan',
      submittedDate: '2026-04-01',
      approvedBy: 'S. Kim',
      approvedDate: '2026-04-07',
      stage: 'published',
      firedLast7d: 7,
      auditLog: [
        { action: 'created',   by: 'T. Morgan', date: '2026-04-01' },
        { action: 'edited',    by: 'T. Morgan', date: '2026-04-04', note: 'Added cascade-violation guard after false positive in WH-02 test session' },
        { action: 'published', by: 'S. Kim',    date: '2026-04-07' },
      ],
    },
  },

  // ── R-008 — draft, not yet published ──────────────────────────────────────
  {
    id: 'R-008',
    candidateId: 'RC-208',
    name: 'Return trip backload utilisation',
    type: 'recommendation',
    priority: 'P3',
    scope: 'Vehicles completing a delivery run that pass a distribution hub on their return route',
    conditions:
      'IF vehicle.return_route PASSES_THROUGH hub\n' +
      'AND hub.outbound_pickup_available = true\n' +
      'AND vehicle.remaining_capacity_kg ≥ min_backload_kg',
    actions:
      'Propose adding a backload pickup at the hub to the return leg. ' +
      'Show estimated additional cost vs. revenue/cost-saving from the pickup.',
    parameters: [
      { key: 'min_backload_kg', value: '200', description: 'Minimum backload weight worth diverting for (kg)' },
      { key: 'max_detour_minutes', value: '15', description: 'Maximum additional time (minutes) permitted for the backload detour' },
    ],
    exceptions:
      'Do not propose backloads if driver working-time limit would be exceeded. ' +
      'Refrigerated vehicles may only backload compatible temperature class.',
    plannerInput: {
      description:
        'Vehicles returning empty (or near-empty) after a delivery run pass the distribution hub. ' +
        'This rule checks whether a hub pickup is available that fits within the vehicle\'s remaining capacity and driver time. ' +
        'If so, it flags a backload opportunity — the planner decides whether to activate it.',
      businessReason:
        'Empty return legs are pure cost with no revenue or service contribution. ' +
        'Even a partial backload significantly improves the economics of that vehicle\'s day. ' +
        'This rule was requested by the Operations Director to surface opportunities that planners miss when managing high volumes.',
      exampleScenario:
        'Vehicle V-017 completes its morning delivery run and begins returning. ' +
        'Its return route passes Hub-3. Hub-3 has 350 kg of outbound goods ready for same-day collection. ' +
        'V-017 has 600 kg remaining capacity and 45 minutes of driver time left. Detour: 8 minutes. ' +
        'Backload meets all thresholds. Proposal surfaced to planner.',
      counterExample:
        'Vehicle V-022 also passes Hub-3 on its return, but the driver is 12 minutes from the legal working-time limit. ' +
        'Adding even an 8-minute detour would breach the limit. ' +
        'This rule does not propose the backload for V-022.',
      attachedDocs: ['Return_Leg_Policy_DRAFT.docx'],
      tags: ['backload', 'return-trip', 'utilisation', 'draft'],
    },
    source: {
      doc: 'Return Leg Policy (draft)',
      citation: '§3 Backload opportunities',
      clause:
        'Where operationally feasible, vehicles completing a delivery run should be considered for backload pickups on their return route. ' +
        'This policy is pending final approval by Fleet Operations.',
    },
    lifecycle: {
      submittedBy: 'D. Santos',
      submittedDate: '2026-06-20',
      stage: 'draft',
      firedLast7d: 0,
      auditLog: [
        { action: 'created', by: 'D. Santos', date: '2026-06-20' },
        { action: 'edited',  by: 'D. Santos', date: '2026-07-02', note: 'Added temperature-class exception after refrigerated-ambient conflict in WH-03 pilot' },
      ],
    },
  },
];
