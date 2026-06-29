---
title: Integrations
description: Supported agents, and manual MCP setup.
---

The interactive installer auto-detects and configures each supported agent — wiring the NasCodeGraph MCP server into each. For the agents that use an instructions file, it also writes a short marker-fenced NasCodeGraph section (`CLAUDE.md`, `AGENTS.md`, or `GEMINI.md`) so subagents and non-MCP harnesses learn the `nascodegraph explore` command; `nascodegraph uninstall` removes it.

## Supported agents

- **Claude Code**
- **Cursor**
- **Codex CLI**
- **opencode**
- **NasTech Agent**
- **Gemini CLI**
- **Antigravity IDE**
- **Kiro**

Run `npx @nastech-ai/nasnascodegraph` and pick your agent(s); see [Installation](/nascodegraph/getting-started/installation/) for the non-interactive flags.

## Manual setup

If you'd rather wire it up yourself, install globally:

```bash
npm install -g @nastech-ai/nasnascodegraph
```

Add the MCP server to `~/.claude.json`:

```json
{
  "mcpServers": {
    "nascodegraph": {
      "type": "stdio",
      "command": "nascodegraph",
      "args": ["serve", "--mcp"]
    }
  }
}
```

Optionally auto-allow NasCodeGraph's tools in `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "mcp__nascodegraph__*"
    ]
  }
}
```

One wildcard auto-approves every NasCodeGraph tool. The server lists a single tool by default — `nascodegraph_explore` — but if you re-enable others via the `NASTECHGRAPH_MCP_TOOLS` environment variable, they're already permitted with no prompt.

:::tip
Cursor launches MCP subprocesses with the wrong working directory. The installer handles this for you by injecting a `--path` argument; if you wire Cursor up by hand, pass the project path explicitly.
:::
