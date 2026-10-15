# Talk-to-Rule and driver morning briefing

The repository was empty. This demo implements the two workflows in the requested idea using a single fictional transportation snapshot dated 2026-10-15, in Europe/Berlin.

An administrator speaks a requirement. The agent collects scope, conditions, actions, numeric parameters with units, exceptions, and whether the requirement is mandatory or preferred. It returns a structured draft and validation report for admin review. Voice tools cannot approve, publish, dispatch, reassign stock, or change a route.

The personalized driver is already known through `{{driver_name}}`, defaulting to Vidhi. The agent asks what they want to check and retrieves only the relevant load, temperature, route, road restriction, weather or delivery data. Each short answer invites one follow-up. The original three driver scenarios remain available by explicit driver ID.

A shortage or blocked dispatch is reported before loading instructions. All operational data is fictional, not current information.

## Hosting decision

ElevenLabs MCP integrations register an external server URL. ElevenLabs enterprise Code tools execute JavaScript on their own infrastructure. Prefer hosted Code tools if this workspace supports them. Keep a standards-based HTTP MCP wrapper around the same functions so the demo is portable and can be connected externally if needed.

Sources:

- https://elevenlabs.io/docs/eleven-agents/customization/tools/mcp
- https://elevenlabs.io/docs/eleven-agents/customization/tools/code-tools

## Scope and alternatives considered

Putting fixture text in a knowledge base would be quick but would not reliably calculate reserved stock, pallet counts, capacities, or late arrivals. A real transportation platform integration is premature for a mock demo. Deterministic functions give the voice agent structured quantities and expose the reasons for a block.

The original eight rule definitions are preserved in `data/rule-definitions.ts`; the supplied `.js` file actually contains TypeScript interfaces. Preserve the source rather than silently correcting its ambiguities. Flag R-002 capacity tolerance, R-003 arithmetic, R-006 buffer wording, R-007 contractual windows, and the unpublished R-008 policy.

Draft generation and validation are deterministic helpers, not a natural-language understanding model or a transport optimizer. The voice agent extracts fields and asks questions. Drafts are returned for review and recorded in the conversation; they are not a durable admin workflow.

## Demo scenarios

- D-001 / Alex Morgan: normal ambient loading, traffic plus rain delay, and a backload opportunity that remains unapproved.
- D-002 / Jamie Chen: produce shortage after reserved/quarantined stock, chilled handling, and a contractual delivery window missed after fog/congestion.
- D-003 / Sam Rivera: vehicle overload and a missed cross-dock cutoff; rerouting is only a suggestion.
- Configured driver / Vidhi: 14 chilled-dairy pallets, 2–6°C range, a 25-minute buffer before dock opening, fictional road restrictions, and an accident that loses the buffer without missing the deadline. B441 requires explicit simulated confirmation and rejects the common low-bridge diversion.

The personalized scenario adds 17 operations alongside the original 12. Its temperature excursion, stale sensor and night-return scenes are scripted branches. No real geolocation, background monitoring, automatic alerts or navigation updates are connected. The selection receipt lives only in conversation context.

## Validation and next real-world exercise

Test the structured outputs through MCP, verify local hosted-code bundles produce identical answers, and verify the actual ElevenLabs resources after creation. Ask a transportation administrator to try an ambiguous delivery-window request and a driver to try the shortage scenario; confirm they understand the draft state and dispatch blocker without reading the screen.
