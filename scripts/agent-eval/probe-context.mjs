#!/usr/bin/env node
// Probe nascodegraph_context (with call-paths) against an index using the built dist.
// Usage: node probe-context.mjs <repo-with-.nascodegraph> <task words...>
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [, , repo, ...taskParts] = process.argv;
const task = taskParts.join(' ');
if (!repo || !task) { console.error('usage: probe-context.mjs <repo> <task...>'); process.exit(1); }

const load = async (rel) => import(pathToFileURL(resolve(rel)).href);
const idx = await load('dist/index.js');
const tools = await load('dist/mcp/tools.js');
const ___NASNASTECHGRAPH___ = idx.default?.default ?? idx.default ?? idx.___NASNASTECHGRAPH___;
const ToolHandler = tools.ToolHandler ?? tools.default?.ToolHandler;

const cg = ___NASNASTECHGRAPH___.openSync(repo);
const h = new ToolHandler(cg);
const res = await h.execute('nascodegraph_context', { task });
console.log(res.content?.[0]?.text ?? '(no text)');
try { cg.close?.(); } catch {}
