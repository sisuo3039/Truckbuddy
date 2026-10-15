#!/usr/bin/env python3
"""Run a narrowly scoped ElevenLabs MCP task through the user's existing Codex login.

No API keys are read, copied or saved. MCP request/response bodies stay in memory.
Print only tool-call status and the task's final message, not complete tool payloads.
"""
import argparse
import json
import pathlib
import subprocess
import tomllib


parser = argparse.ArgumentParser()
parser.add_argument("prompt_file", type=pathlib.Path)
parser.add_argument("--timeout", type=int, default=300)
parser.add_argument("--auto-review", action="store_true", help="Use the CLI's automatic approval review for an explicitly authorized update.")
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[1]
config = tomllib.loads((pathlib.Path.home() / ".codex/config.toml").read_text())
endpoint = config["mcp_servers"]["ElevenLabs"]["url"]
command = [
    "codex", "exec", "--ephemeral", "--skip-git-repo-check",
    "--ignore-user-config", "--json", "--cd", str(root),
    "-c", "mcp_servers.ElevenLabs.url=" + json.dumps(endpoint),
]
command += ["--approve-for-me"] if args.auto_review else ["--sandbox", "read-only"]
process = subprocess.Popen(
    command + ["-"], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
    stderr=subprocess.PIPE, text=True,
)
try:
    output, diagnostic = process.communicate(args.prompt_file.read_text(), timeout=args.timeout)
except subprocess.TimeoutExpired:
    process.terminate()
    output, diagnostic = process.communicate(timeout=10)
    print("MCP task timed out; inspect existing resources before retrying creation.")
print("EXIT_CODE:", process.returncode)
for line in output.splitlines():
    try:
        event = json.loads(line)
    except json.JSONDecodeError:
        continue
    item = event.get("item", {})
    if item.get("type") == "agent_message":
        print(item.get("text", ""))
    elif item.get("type") == "mcp_tool_call":
        print("MCP_CALL:", json.dumps({
            key: item.get(key) for key in ["server", "tool", "status", "error"]
        }))
    elif event.get("type") in ["error", "turn.failed"]:
        print("MCP_TASK_ERROR:", json.dumps(event))
for line in diagnostic.splitlines():
    if "error" in line.lower() or "ElevenLabs" in line:
        print("DIAGNOSTIC:", line[:1000])
raise SystemExit(process.returncode or 0)
