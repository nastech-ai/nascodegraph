#!/usr/bin/env node
// One-shot probe: run handleExplore against an existing index using the built
// dist, print the output + a few stats. Lets us verify explore's coverage fix
// without a full agent run. Usage: node probe-explore.mjs <repo-with-.nascodegraph> "<query>"
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [, , repo, query] = process.argv;
if (!repo || !query) {
  console.error('usage: probe-explore.mjs <repo> "<query>"');
  process.exit(1);
}

const load = async (rel) => import(pathToFileURL(resolve(rel)).href);
const idx = await load('dist/index.js');
const tools = await load('dist/mcp/tools.js');

// esModuleInterop: dynamic import of CJS yields { default: module.exports, ...named }
const ___NASNASTECHGRAPH___ = idx.default?.default ?? idx.default ?? idx.___NASNASTECHGRAPH___;
const ToolHandler = tools.ToolHandler ?? tools.default?.ToolHandler;

if (typeof ___NASNASTECHGRAPH___?.openSync !== 'function') {
  console.error('could not resolve ___NASNASTECHGRAPH___.openSync; index keys:', Object.keys(idx), 'default keys:', idx.default && Object.keys(idx.default));
  process.exit(2);
}
if (typeof ToolHandler !== 'function') {
  console.error('could not resolve ToolHandler; tools keys:', Object.keys(tools));
  process.exit(2);
}

const cg = ___NASNASTECHGRAPH___.openSync(repo);
const h = new ToolHandler(cg);
const res = await h.execute('nascodegraph_explore', { query });
const text = res.content?.[0]?.text ?? '(no text)';
console.log(text);
console.error('\n--- PROBE STATS ---');
console.error('output chars:', text.length);
console.error('triggerRender body present (-> setState({})):', /triggerRender[\s\S]{0,400}setState\(\{\}\)/.test(text));
console.error('App.tsx in source section:', /\*\*`.*App\.tsx`\*\* —/.test(text));
try { cg.close?.(); } catch {}
