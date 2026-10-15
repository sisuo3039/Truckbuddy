# Truckbuddy: Vidhi's working day

Use this for a 4–5 minute driver walkthrough, with an optional 2–3 minute Talk-to-Rule segment.

Read the **Presenter** and **Vidhi** lines. Agent lines are sample responses; wording may vary. Let the agent finish each turn, then ask the next question. Setup and tool cues are backstage notes and are not read aloud.

## Before starting

- Open **Truckbuddy — Talk-to-Rule Demo** and start a fresh conversation.
- Use the configured `driver_name` default of **Vidhi**.
- Start at the loading-dock scene. The initial route is the planned route.
- Keep the traffic and reroute exchanges in the same conversation so the agent remembers the confirmed selection.
- Choose the optional branches before presenting; they add time to the main run.

## Opening — 20 seconds

**Presenter:** “Transportation teams deal with loads, delivery windows, road restrictions and exceptions throughout the day. Truckbuddy makes that information available through a short conversation. Today, Vidhi will prepare a chilled-dairy run and handle a route disruption.”

*Start the conversation. Allow the saved greeting to play.*

**Agent:** “Good morning, Vidhi. Would you like your morning briefing?”

## Scene 1 — Loading dock, 05:47

**Vidhi:** “Yes, give me my morning briefing.”

**Agent:** “You're taking fourteen dairy pallets on P-4418, with a planned arrival of 12:35. Would you like the loading details?”

**Vidhi:** “Yes. What's the breakdown?”

**Agent:** “Four milk pallets, four yogurt and six cheese. Want the loading order?”

**Vidhi:** “Do we have enough stock?”

**Agent:** “Yes, stock covers all 672 cases on your manifest. Want to check where to pick them?”

**Vidhi:** “Tell me the loading order.”

**Agent:** “Load the six cheese pallets first, then four yogurt, with four milk nearest the door. Want the temperature check?”

**Vidhi:** “Yes. What temperature should I keep?”

**Agent:** “The chilled range is two to six degrees, and the reading is 4.1. Want to check your delivery window?”

**Vidhi:** “Will I arrive in time?”

**Agent:** “Arrival is estimated at 12:35, twenty-five minutes before the dock opens at 13:00. Want the rest-stop details?”

**Vidhi:** “Does that include my rest?”

**Agent:** “Yes, the forty-five-minute rest at kilometre 180 is included. Want to check the road ahead?”

**Presenter:** “Vidhi gets the information she asks for, one step at a time. The agent knows her name and uses the load, stock and planning data without reading the whole day aloud.”

## Scene 2 — Highway, 06:15

**Vidhi:** “I'm on the highway now. What's on the road ahead?”

*Backstage: this request selects the 06:15 highway scene.*

**Agent:** “A low-emission zone is twelve kilometres ahead, with a sixty-kilometre-per-hour limit. Want me to check your permit?”

**Vidhi:** “Yes. Is my permit valid?”

**Agent:** “Your permit is valid for P-4418. Want to check the residential section?”

**Vidhi:** “Yes, what are the restrictions there?”

**Agent:** “The limit is thirty, with no engine braking between 22:00 and 06:00. That noise restriction isn't active at 06:15.”

**Vidhi:** “What's the weather like?”

**Agent:** “The highway scene has light drizzle, nine degrees and seven kilometres of visibility. Want to check the route?”

## Scene 3 — Traffic disruption, 09:40

**Vidhi:** “Any traffic updates?”

**Agent:** “An accident adds forty-five minutes to your planned route. Want me to compare the alternatives?”

**Vidhi:** “Will I miss my unloading window?”

**Agent:** “The planned route now arrives at 13:20, still within the 13:00–14:30 window. Want an option that preserves your early buffer?”

**Vidhi:** “Compare the alternatives for my truck.”

**Agent:** “The common diversion's 3.8-metre limit is too low for your 4.1-metre truck; B441 has enough clearance. Want its timing?”

**Vidhi:** “Yes. Would B441 preserve my rest and arrival time?”

**Agent:** “B441 is eight kilometres longer, with your rest preserved and arrival estimated at 12:35. Would you like to use B441?”

*Pause. Show that the agent waits for an explicit answer before selecting the route.*

**Vidhi:** “Confirm B441.”

*Backstage: the selection tool must succeed before the agent acknowledges the choice. This does not update navigation.*

**Agent:** “B441 is your chosen route, with the forty-five-minute rest kept in the plan. Want the updated rest-stop details?”

**Vidhi:** “Where is my rest now?”

**Agent:** “At kilometre 195, from 10:20 to 11:05. Want the delivery details?”

**Vidhi:** “Yes. Which dock do I use?”

**Agent:** “Dock F6 at North Distribution, with unloading from 13:00 to 14:30. Want the booking reference?”

## Closing — 15 seconds

**Presenter:** “Vidhi gets a clear morning briefing and the details she needs as she asks. When conditions change, Truckbuddy checks the proposed route against vehicle height, delivery time and rest before asking for her choice.”

## Optional branch — Temperature excursion

Run this after the traffic scene, or separately.

**Vidhi:** “The trailer seems warm. Check the temperature.”

*Backstage: the warm-trailer statement selects the temperature-alert branch.*

**Agent:** “The trailer reading is 7.3 degrees, above the six-degree limit. Would you like to review the next check with dispatch?”

**Presenter:** “The agent puts the temperature problem first. It doesn’t claim the refrigeration issue has been fixed or that dispatch has been contacted.”

## Optional branch — Stale sensor

**Vidhi:** “The sensor hasn't updated. Is the dairy still within range?”

**Agent:** “I can't confirm that: the last sensor update is twenty-five minutes old. Would you like to review the check with dispatch?”

**Presenter:** “An old reading becomes an unknown status, rather than reassurance that the cargo is safe.”

## Optional branch — Arrival

Use this after selecting B441, and omit the dock exchange at the end of Scene 3 if you want to show it here instead.

**Vidhi:** “I'm at the delivery site. Where do I unload?”

**Agent:** “At dock F6, with unloading starting at 13:00. Want the booking reference?”

**Vidhi:** “Yes.”

**Agent:** “It's BOOK-4418-1015. Want the paperwork checklist?”

## Optional segment — Talk-to-Rule, 2–3 minutes

**Presenter:** “The same assistant also helps an administrator turn a spoken requirement into a structured rule draft. It asks about ambiguous requirements and keeps the result ready for administrator review.”

**Vidhi:** “Help me draft a rule: North Market deliveries on Corridor-A must arrive before ten on weekdays.”

**Agent:** “Is ten a mandatory contractual cutoff or a preferred arrival time?”

**Vidhi:** “It's a mandatory contractual cutoff, at 10:00 Europe/Berlin time.”

**Agent:** “What should the planner do if a proposed route would arrive after that cutoff?”

**Vidhi:** “Block route confirmation and ask the planner to resequence or reschedule.”

**Agent:** “Are there any exceptions?”

**Vidhi:** “None. Use priority P1 and name it North Market morning cutoff. The business reason is our confirmed retailer contract.”

*If the agent asks another clarification, answer it before requesting the draft. For a source question, say “the retailer contract.”*

**Vidhi:** “Read back the draft for admin review.”

**Agent:** “This draft makes the weekday 10:00 cutoff a hard constraint for North Market on Corridor-A, with no exceptions. Would you like the proposed planner action repeated?”

**Vidhi:** “Yes, and can you publish it?”

**Agent:** “The proposed action blocks route confirmation and asks the planner to resequence or reschedule. Publication requires administrator validation and approval.”

**Presenter:** “The output is a structured draft with a clear constraint, scope, action and exception policy. The voice agent prepares it for review; it doesn't publish the rule.”

## Presenter cue card

| Spoken prompt | Expected fact to listen for |
| --- | --- |
| “Yes, give me my morning briefing.” | 14 dairy pallets on P-4418; planned arrival 12:35; one loading follow-up |
| “What's the breakdown?” | 4 milk pallets, 4 yogurt, 6 cheese |
| “Do we have enough stock?” | All 672 requested cases are available |
| “Tell me the loading order.” | Cheese first, yogurt next, milk nearest the door |
| “What temperature should I keep?” | 2–6°C; fresh reading 4.1°C |
| “Will I arrive in time?” | Baseline 12:35, 25 minutes before opening |
| “I'm on the highway now.” | 06:15 scene; zone 12 km ahead; limit 60 km/h |
| “Is my permit valid?” | Valid permit for P-4418 |
| “Any traffic updates?” | 45-minute delay; planned ETA 13:20 still within window |
| “Compare the alternatives for my truck.” | Reject 3.8 m diversion for 4.1 m truck; B441 is a proposal |
| “Confirm B441.” | Successful selection receipt, with no actual navigation change |
| “Where is my rest now?” | B441: km 195, 10:20–11:05 |
| “Which dock do I use?” | F6; window 13:00–14:30 |

## Recovery prompts

- **Too much detail:** “Give me just the answer to that question, then one short follow-up.”
- **Wrong scene:** “It's 09:40. Tell me the planned-route arrival after the accident.”
- **Route still treated as unselected:** “Confirm B441, then tell me its rest-stop location.”
- **Timing confused:** “Is the twenty-five-minute buffer before the window opens or before it closes?” The answer is **before it opens at 13:00**.
- **Missing or failed tool result:** Pause and retry the question. Do not read a sample answer as though it came from a successful live tool call.

## Tool cues for rehearsal

All personalized calls use `truckbuddy_vidhi_mock`, with `driver_name=Vidhi` and the current scripted scene.

Fixtures, event selection and receipts are internal to the walkthrough. No live provider, background monitoring, navigation update or dispatch notification is connected. These backstage notes must not be read as dialogue.

| Step | Operation |
| --- | --- |
| Load and stock | `vidhi_get_manifest` |
| Loading order | `vidhi_get_loading_checklist` |
| Cargo range and fresh reading | `vidhi_get_cargo_rules`, `vidhi_get_temperature` |
| Arrival and rest | `vidhi_get_trip_timeline`, `vidhi_get_rest_plan` |
| Explicit scene change | `vidhi_get_scene` |
| Zone and residential section | `vidhi_get_road_restrictions` |
| Permit and weather | `vidhi_get_permit`, `vidhi_get_weather` |
| Accident and alternatives | `vidhi_get_traffic_alert`, `vidhi_compare_routes` |
| Explicit B441 confirmation | `vidhi_confirm_reroute`, with `route_choice=B441`, `user_confirmed=true` |
| Subsequent B441 rest/delivery | Pass `route_choice=B441` to the relevant lookup |
| Dock and booking | `vidhi_get_delivery_details` |
| Optional rule draft | Original `truckbuddy_transport_mock`: `prepare_rule_draft` / `validate_rule_draft` |
