import defaults from "../elevenlabs/dynamic-variables.json" with { type: "json" };

export const defaultDriverName = defaults.dynamic_variable_placeholders.driver_name;

export function resolveDriverName(value) {
  const name = typeof value === "string" ? value.trim() : "";
  return name && !name.includes("{{") && !name.includes("}}") ? name : defaultDriverName;
}

// Render the configured demo greeting before installation. The current entry
// point has not reliably substituted native variables in the first message.
export function renderFirstMessage(name = defaultDriverName) {
  return `Good morning, ${resolveDriverName(name)}. Would you like your morning briefing?`;
}
