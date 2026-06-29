---
title: CLI
description: Every NasCodeGraph command and the flags it accepts.
---

```bash
nascodegraph                         # Run interactive installer
nascodegraph install                 # Run installer (explicit)
nascodegraph uninstall               # Remove NasCodeGraph from your agents (inverse of install)
nascodegraph init [path]             # Initialize a project + build its graph (one step)
nascodegraph uninit [path]           # Remove NasCodeGraph from a project (--force to skip prompt)
nascodegraph index [path]            # Full re-index from scratch (--force, --quiet, --verbose)
nascodegraph sync [path]             # Incremental update (--quiet)
nascodegraph status [path]           # Show statistics (--json)
nascodegraph unlock [path]           # Remove a stale lock file that's blocking indexing
nascodegraph query <search>          # Search symbols (--kind, --limit, --json)
nascodegraph explore <query>         # Relevant symbols' source + call paths in one shot (same output as the nascodegraph_explore MCP tool)
nascodegraph node <symbol|file>      # One symbol's source + callers, or read a file with line numbers (same output as nascodegraph_node)
nascodegraph files [path]            # Show file structure (--format, --filter, --pattern, --max-depth, --json)
nascodegraph callers <symbol>        # Find what calls a function/method (--limit, --json)
nascodegraph callees <symbol>        # Find what a function/method calls (--limit, --json)
nascodegraph impact <symbol>         # Analyze what code is affected by changing a symbol (--depth, --json)
nascodegraph affected [files...]     # Find test files affected by changes (see below)
nascodegraph daemon                  # Manage background daemons — pick one to stop (alias: daemons)
nascodegraph telemetry [on|off]      # Show or change anonymous usage telemetry
nascodegraph upgrade [version]       # Update to the latest release (--check, --force)
nascodegraph version                 # Print the installed version (also -v, --version)
nascodegraph help [command]          # Show help, optionally for one command
```

The MCP server (`nascodegraph serve --mcp`) is launched automatically by your agent — you don't run it by hand. See [MCP Server](/nascodegraph/reference/mcp-server/).

## init, index, and sync

`nascodegraph init` creates the local `.nascodegraph/` directory **and** builds the full graph in one step. (The old `-i`/`--index` flag is now a no-op, accepted only so existing scripts don't break.) After that the file watcher keeps the graph current automatically — `index` (a full rebuild from scratch) and `sync` (an incremental update) are only needed when the watcher is disabled or you're scripting against the index outside an agent session.

## Query commands

`query`, `callers`, `callees`, and `impact` all accept `--json` for machine-readable output.

```bash
nascodegraph query UserService --kind class --limit 10
nascodegraph callers handleRequest --json
nascodegraph impact AuthMiddleware --depth 3
```

`explore` and `node` are the CLI faces of the `nascodegraph_explore` and `nascodegraph_node` MCP tools — same output — so subagents and non-MCP harnesses can reach the graph from a shell.

## affected

Traces import dependencies transitively to find which test files are affected by changed source files. See [Affected Tests in CI](/nascodegraph/guides/affected-tests/) for options and a CI example.
