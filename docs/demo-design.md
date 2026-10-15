# Talk-to-Rule and driver morning briefing

The repository was empty. This demo implements the two workflows in the requested idea using a single fictional transportation snapshot dated 2026-10-15, in Europe/Berlin.

An administrator speaks a requirement. The agent collects scope, conditions, actions, numeric parameters with units, exceptions, and whether the requirement is mandatory or preferred. It returns a structured draft and validation report for admin review. Voice tools cannot approve, publish, dispatch, reassign stock, or change a route.

A driver identifies their demo driver ID. The agent combines assigned vehicle and route, warehouse availability after reservations and quarantine, quantities to pick and load, delivery windows, traffic, weather, and readiness blockers. A shortage or blocked dispatch is reported before loading instructions. All operational data is fictional, not current information.

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

## Validation and next real-world exercise

Test the structured outputs through MCP, verify local hosted-code bundles produce identical answers, and verify the actual ElevenLabs resources after creation. Ask a transportation administrator to try an ambiguous delivery-window request and a driver to try the shortage scenario; confirm they understand the draft state and dispatch blocker without reading the screen.
