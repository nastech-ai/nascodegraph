/**
 * NASTECHGRAPH_MCP_TOOLS allowlist — lets an operator (or an A/B harness) trim the
 * exposed MCP tool surface without touching the client config. Inert when unset.
 * Filtering happens in ListTools (getTools) and is enforced again on execute().
 */
import { describe, it, expect, afterEach } from 'vitest';
import { ToolHandler } from '../src/mcp/tools';

const ENV = 'NASTECHGRAPH_MCP_TOOLS';

describe('NASTECHGRAPH_MCP_TOOLS allowlist', () => {
  const original = process.env[ENV];
  afterEach(() => {
    if (original === undefined) delete process.env[ENV];
    else process.env[ENV] = original;
  });

  const listed = () => new ToolHandler(null).getTools().map(t => t.name).sort();

  it('exposes ONLY nascodegraph_explore by default when unset', () => {
    delete process.env[ENV];
    // The default set (see DEFAULT_MCP_TOOLS) is pared to explore alone — the one
    // tool that earns its place (verbatim source grouped by file).
    // node/search/callers/callees/impact/files/status stay defined and executable
    // but unlisted; NASTECHGRAPH_MCP_TOOLS re-enables them.
    expect(listed()).toEqual(['nascodegraph_explore']);
  });

  it('re-enables an unlisted tool via the allowlist (impact)', () => {
    process.env[ENV] = 'explore,impact';
    expect(listed()).toEqual(['nascodegraph_explore', 'nascodegraph_impact']);
  });

  it('filters ListTools to the allowlisted short names', () => {
    process.env[ENV] = 'explore,search,node';
    expect(listed()).toEqual(['nascodegraph_explore', 'nascodegraph_node', 'nascodegraph_search']);
  });

  it('accepts fully-qualified nascodegraph_ names and ignores whitespace', () => {
    process.env[ENV] = ' nascodegraph_explore , search ';
    expect(listed()).toEqual(['nascodegraph_explore', 'nascodegraph_search']);
  });

  it('treats an empty/whitespace value as unset (default surface)', () => {
    process.env[ENV] = '   ';
    expect(listed()).toEqual(['nascodegraph_explore']);
  });

  it('rejects a disabled tool on execute (defense in depth)', async () => {
    process.env[ENV] = 'node';
    const res = await new ToolHandler(null).execute('nascodegraph_explore', {});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/disabled via NASTECHGRAPH_MCP_TOOLS/);
  });

  it('lets an allowlisted tool past the guard', async () => {
    process.env[ENV] = 'search';
    // No NasCodeGraph attached, so it fails *after* the allowlist guard — the
    // "disabled" message must NOT appear, proving the guard passed it through.
    const res = await new ToolHandler(null).execute('nascodegraph_search', { query: 'x' });
    expect(res.content[0].text).not.toMatch(/disabled via NASTECHGRAPH_MCP_TOOLS/);
  });
});
