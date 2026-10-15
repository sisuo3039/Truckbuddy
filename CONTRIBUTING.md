# Contributing to Truckbuddy

Contributions are welcome for the transportation mock data, rule-drafting workflow, driver briefings, MCP tools, ElevenLabs prompt and tests.

## Local setup

Use Node.js 22 or newer.

```sh
npm ci
npm run build
npm test
npm run check:mcp
npm start
```

The MCP endpoint is `http://127.0.0.1:8787/mcp`. The automated MCP check starts its own temporary server; it does not require ElevenLabs or API credentials.

## Making a change

1. Fork the repository and create a branch for your change.
2. Edit source files, fixtures, tool definitions or the voice prompt.
3. Run the build and both checks above.
4. Open a pull request describing the behavior changed and the validation performed.

The build generates `data/rules.json` from the original TypeScript catalogue and sandbox-compatible Code tools in `dist/`. Edit source, not generated bundles. If you edit the catalogue, include the regenerated JSON in your pull request.

Useful starting points:

- `src/fixtures.mjs`: fictional stock, drivers, vehicles, routes, traffic and weather.
- `src/domain.mjs`: quantities, readiness, draft validation and operation handling.
- `src/tool-definitions.mjs`: discoverable tool names and argument schemas.
- `src/vidhi-demo.mjs`: personalized driver fixtures, clearance, timing and simulated confirmation.
- `src/vidhi-tool-definitions.mjs`: the 17 personalized operation schemas.
- `src/personalization.mjs`: configured-name fallback and rendered morning greeting.
- `src/all-tools.mjs`: all 29 portable MCP operations.
- `src/server.mjs`: portable HTTP MCP transport.
- `elevenlabs/agent-prompt.md`: voice conversation instructions.
- `test/domain.test.mjs`: domain and hosted-bundle equivalence tests.
- `test/vidhi.test.mjs`: names, dairy stock, incident timing, sensors and route selection.
- `docs/vidhi-scenes.md`: ask-first voice script and dynamic-variable setup.
- `docs/evaluation.xml`: fixed-snapshot agent evaluation questions.

Keep demo data clearly fictional. Preserve the distinction between mandatory constraints and preferences. New driver scenarios should report shortages and blockers before proposed instructions. Rule-drafting tools return drafts for admin review and must not publish rules or authorize dispatch.

## ElevenLabs collaboration

The JavaScript bundles run as enterprise ElevenLabs Code tools. Build the project, then install both `dist/elevenlabs-hosted-tool.json` and `dist/elevenlabs-vidhi-tool.json` in your workspace. Attach them to your demo agent and apply `elevenlabs/agent-prompt.md`, `elevenlabs/first-message.txt`, and the defaults in `elevenlabs/dynamic-variables.json`. The optional `scripts/elevenlabs-command.py` helper uses an already-configured ElevenLabs MCP connector in Codex.

The build generates `elevenlabs/first-message.txt` from the configured `driver_name`. Edit the name in `elevenlabs/dynamic-variables.json` or the greeting in `src/personalization.mjs`, then rebuild. The native prompt retains runtime personalization; the first greeting uses the rendered configured name.

Copy `elevenlabs/deployment.example.json` to `elevenlabs/deployment.json` and keep your deployment IDs there. This local file, `.env`, runtime prompts, credentials and generated bundles are excluded from Git.

GitHub pull requests change the source. Applying a change to an existing ElevenLabs demo is a separate workspace update and requires access to that workspace. Do not alter another contributor's agent without their authorization.
