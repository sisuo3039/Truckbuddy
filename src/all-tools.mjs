import { invoke as invokeTransport } from "./domain.mjs";
import { toolDefinitions as transportDefinitions } from "./tool-definitions.mjs";
import { invokeVidhi } from "./vidhi-demo.mjs";
import { vidhiToolDefinitions } from "./vidhi-tool-definitions.mjs";

export const toolDefinitions = [...transportDefinitions, ...vidhiToolDefinitions];
export const invoke = (name, args = {}) => name.startsWith("vidhi_") ? invokeVidhi(name, args) : invokeTransport(name, args);
