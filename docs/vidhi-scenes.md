# Ask-first driving demo

The driver's greeting uses `{{driver_name}}`, defaulting to Vidhi. Replace the name at conversation start without creating another agent. All events and readings below are fictional.

## Scene 1 — Loading dock, 05:47

**Agent:** Good morning, Vidhi. What would you like to check first for your demo run?

**Vidhi:** What's my load?

**Agent:** Fourteen dairy pallets for P-4418: four milk, four yogurt and six cheese. Want the loading order?

**Vidhi:** What should I watch with the dairy?

**Agent:** The chilled range is two to six degrees, and the mock reading is 4.1. Want to check the delivery time next?

**Vidhi:** Will I arrive in time?

**Agent:** The baseline arrival is 12:35, twenty-five minutes before the dock opens at one. Want to check the planned rest?

**Vidhi:** Yes.

**Agent:** The forty-five-minute rest at kilometre 180 is included in the estimate. Want the stop details?

## Scene 2 — Highway event, 06:15

An operator says “show the road ahead,” or a future client injects this mock event. The current agent does not run continuous GPS.

**Agent:** A restricted zone is twelve kilometres ahead. Want the short version?

**Vidhi:** Yes. Do I need a permit?

**Agent:** Your permit is confirmed in the fictional profile, and the zone limit is sixty. Want to check the residential section too?

**Vidhi:** Yes.

**Agent:** That section is thirty, with no engine braking from ten at night to six in the morning. The noise restriction isn't active now.

## Scene 3 — Traffic event, 09:40

**Agent:** A mock accident adds forty-five minutes. Want me to compare the alternatives?

**Vidhi:** Will I miss the unloading window?

**Agent:** The original route now arrives at 13:20, inside the window but without your early buffer. Want to hear the B441 option?

**Vidhi:** Is it suitable for my truck?

**Agent:** B441 has enough clearance; the common diversion's 3.8-metre limit is too low for your 4.1-metre truck. Would you like to use B441 in this demo?

**Vidhi:** Confirm.

The agent calls `vidhi_confirm_reroute` with explicit confirmation. Only a successful response permits the following line.

**Agent:** B441 is selected for this demo, with your forty-five-minute rest preserved. Want the updated arrival time?

**Vidhi:** Where is my rest now?

**Agent:** At kilometre 195 from 10:20 to 11:05, with arrival still estimated at 12:35. Want the delivery booking?

## Extra mock branches

- **Temperature excursion:** ask “simulate a temperature alert.” The reading becomes 7.3°C. The agent states the problem immediately and offers the next dispatch check.
- **Stale sensor:** ask “simulate a stale sensor.” No fresh reading is available. The agent must not reassure the user that the load is within range.
- **Arrival:** ask for dock F6, booking DEMO-BOOK-4418, temperature record or unloading window.
- **Return leg:** ask about residential restrictions. The daytime scene has no active noise restriction; the separate hypothetical 22:30 scene does.

## Variable configuration

`elevenlabs/dynamic-variables.json` defines the dashboard placeholder:

```json
{"dynamic_variable_placeholders":{"driver_name":"Vidhi"}}
```

`elevenlabs/first-message.txt` and the agent prompt both use `{{driver_name}}`. At SDK conversation initiation, pass:

```json
{"dynamic_variables":{"driver_name":"Vidhi"}}
```

Pass the same resolved value as `driver_name` to the personalized mock tool so the greeting and profile agree.

## Timing and capability boundaries

Departure 06:15 + 280 driving minutes + 55 service minutes + 45 rest minutes = 12:35. The 25-minute buffer is before the 13:00 opening. The 45-minute incident yields 13:20, which is still before 14:30. B441's seeded estimate preserves 12:35 despite 8 extra kilometres; this is a fixture, not a live routing calculation.

Every operation is a deterministic mock. “Confirmed load” describes a fixture manifest, not actual loading or dispatch approval. The reroute receipt changes only conversation context; no navigation is changed and no route is saved. Road limits and rest policy are fictional scenario data, not legal guidance.
