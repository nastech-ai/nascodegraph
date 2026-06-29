---
title: Get Started
description: Get up and running with NasCodeGraph in seconds.
---

Get up and running with NasCodeGraph in seconds.

## 1. Install the CLI

No Node.js required — one command grabs the right build for your OS:

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/nastech-ai/nascodegraph/main/install.sh | sh

# Windows (PowerShell)
irm https://raw.githubusercontent.com/nastech-ai/nascodegraph/main/install.ps1 | iex
```

Already have Node? `npm i -g @nastech-ai/nascodegraph` works on any version. NasCodeGraph bundles its own runtime — nothing to compile, no native build, works the same everywhere. The installer puts `nascodegraph` on your `PATH` but doesn't change your current shell — open a new terminal before the next step.

## 2. Wire up your agent(s)

```bash
nascodegraph install
```

Auto-detects and configures Claude Code, Cursor, Codex CLI, opencode, NasTech Agent, Gemini CLI, Antigravity IDE, and Kiro — wiring the NasCodeGraph MCP server into each. This step connects your agents only; it does **not** index any code. (Shortcut: `npx @nastech-ai/nascodegraph` downloads and runs the installer in one go.)

## 3. Initialize each project

```bash
cd your-project
nascodegraph init
```

`nascodegraph init` creates the local `.nascodegraph/` directory and builds the full graph in the same step — one command, done. Your agent will use NasCodeGraph tools automatically when a `.nascodegraph/` directory exists.

Next: build [Your First Graph](/nascodegraph/getting-started/your-first-graph/), or see the full [Installation](/nascodegraph/getting-started/installation/) options.
