import { build, transform } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { renderFirstMessage } from "../src/personalization.mjs";

await mkdir("dist/code-tools", { recursive: true });
await writeFile("elevenlabs/first-message.txt", `${renderFirstMessage()}\n`);
const source = await readFile("data/rule-definitions.ts", "utf8");
const transpiled = await transform(source, { loader: "ts", format: "esm", target: "es2022" });
await writeFile("dist/rule-definitions.mjs", transpiled.code);
const { DEMO_RULE_DEFINITIONS } = await import(pathToFileURL(resolve("dist/rule-definitions.mjs")).href);
await writeFile("data/rules.json", `${JSON.stringify(DEMO_RULE_DEFINITIONS, null, 2)}\n`);
const { toolDefinitions } = await import("../src/tool-definitions.mjs");
const configs = [];
for (const definition of toolDefinitions) {
  const bundled = await build({
    stdin: {
      contents: `import { invoke } from "./src/domain.mjs"; export default async (ctx) => invoke(${JSON.stringify(definition.name)}, ctx.args ?? {});`,
      resolveDir: process.cwd(),
      sourcefile: `${definition.name}.mjs`,
    },
    bundle: true, write: false, format: "esm", platform: "neutral", target: "es2022", minify: true,
  });
  const sourceCode = bundled.outputFiles[0].text;
  await writeFile(`dist/code-tools/${definition.name}.mjs`, sourceCode);
  configs.push({
    type: "code", name: definition.name, description: definition.description,
    source_code: sourceCode, parameters: definition.parameters, response_timeout_secs: 10,
  });
}
await writeFile("dist/elevenlabs-code-tools.json", `${JSON.stringify(configs, null, 2)}\n`);
const combined = await build({
  stdin: {
    contents: 'import { invoke } from "./src/domain.mjs"; export default async (ctx) => { const { action, ...args } = ctx.args ?? {}; return invoke(action, args); };',
    resolveDir: process.cwd(), sourcefile: "truckbuddy_transport_mock.mjs",
  },
  bundle: true, write: false, format: "esm", platform: "neutral", target: "es2022", minify: true,
});
await writeFile("dist/code-tools/truckbuddy_transport_mock.mjs", combined.outputFiles[0].text);
const hostedConfig = {
  type: "code", name: "truckbuddy_transport_mock",
  description: `Deterministic fictional transportation demo, snapshot 2026-10-15. Choose action: ${toolDefinitions.map((definition) => `${definition.name}: ${definition.description}`).join(" | ")} Never publishes, reserves stock, authorizes dispatch, or changes routes.`,
  parameters: {
    // ElevenLabs' parameter schema rejects the MCP JSON Schema keyword additionalProperties.
    type: "object", required: ["action"],
    properties: {
      action: { type: "string", enum: toolDefinitions.map((definition) => definition.name), description: "Which transportation operation to run. Use get_driver_day_briefing to start a driver's day; prepare_rule_draft for spoken requirements." },
      ...Object.assign({}, ...toolDefinitions.map((definition) => definition.parameters.properties)),
    },
  },
  source_code: combined.outputFiles[0].text, response_timeout_secs: 10,
};
await writeFile("dist/elevenlabs-hosted-tool.json", `${JSON.stringify(hostedConfig, null, 2)}\n`);
const { vidhiToolDefinitions } = await import("../src/vidhi-tool-definitions.mjs");
const vidhiBundle = await build({
  stdin: {
    contents: 'import { invokeVidhi } from "./src/vidhi-demo.mjs"; export default async (ctx) => { const { action, ...args } = ctx.args ?? {}; return invokeVidhi(action, args); };',
    resolveDir: process.cwd(), sourcefile: "truckbuddy_vidhi_mock.mjs",
  },
  bundle: true, write: false, format: "esm", platform: "neutral", target: "es2022", minify: true,
});
await writeFile("dist/code-tools/truckbuddy_vidhi_mock.mjs", vidhiBundle.outputFiles[0].text);
const vidhiConfig = {
  type: "code", name: "truckbuddy_vidhi_mock",
  description: `Personalized fictional driving demo. driver_name defaults to Vidhi. Return short answers to the user's chosen question. Operations: ${vidhiToolDefinitions.map((definition) => `${definition.name}: ${definition.description}`).join(" | ")} GPS/sensors/events are scripted. Route confirmation selects only a hypothetical demo route; no navigation or dispatch is changed.`,
  parameters: {
    type: "object", required: ["action"],
    properties: {
      action: { type: "string", enum: vidhiToolDefinitions.map((definition) => definition.name), description: "Run only the operation needed for the user's current question or explicit scene event." },
      ...Object.assign({}, ...vidhiToolDefinitions.map((definition) => definition.parameters.properties)),
    },
  },
  source_code: vidhiBundle.outputFiles[0].text, response_timeout_secs: 10,
};
await writeFile("dist/elevenlabs-vidhi-tool.json", `${JSON.stringify(vidhiConfig, null, 2)}\n`);
console.log(`Built ${configs.length} transport tools and ${vidhiToolDefinitions.length} personalized operations in two hosted dispatchers.`);
