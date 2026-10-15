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
- `src/server.mjs`: portable HTTP MCP transport.
- `elevenlabs/agent-prompt.md`: voice conversation instructions.
- `test/domain.test.mjs`: domain and hosted-bundle equivalence tests.
- `docs/evaluation.xml`: fixed-snapshot agent evaluation questions.

Keep demo data clearly fictional. Preserve the distinction between mandatory constraints and preferences. New driver scenarios should report shortages and blockers before proposed instructions. Rule-drafting tools return drafts for admin review and must not publish rules or authorize dispatch.

## ElevenLabs collaboration

The JavaScript bundle runs as an enterprise ElevenLabs Code tool. Build the project, then use `dist/elevenlabs-hosted-tool.json` and `elevenlabs/agent-prompt.md` to install a demo in your workspace. The optional `scripts/elevenlabs-command.py` helper uses an already-configured ElevenLabs MCP connector in Codex.

Copy `elevenlabs/deployment.example.json` to `elevenlabs/deployment.json` and keep your deployment IDs there. This local file, `.env`, runtime prompts, credentials and generated bundles are excluded from Git.

GitHub pull requests change the source. Applying a change to an existing ElevenLabs demo is a separate workspace update and requires access to that workspace. Do not alter another contributor's agent without their authorization.
