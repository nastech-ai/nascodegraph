/**
 * NasTech Agent target.
 *
 * NasTech reads MCP servers from `$NASTECH_HOME/config.yaml` under the
 * top-level `mcp_servers` key, and exposes discovered MCP tools through
 * dynamic toolsets named `mcp-<server>`. We add:
 *
 *   mcp_servers.nascodegraph -> `nascodegraph serve --mcp`
 *   platform_toolsets.cli -> `mcp-nascodegraph`
 *
 * The second entry matters because NasTech CLI profiles often enable an
 * explicit `platform_toolsets.cli` list. Without `mcp-nascodegraph` in that
 * list, the MCP server can be configured and connected but its tools may
 * still be filtered out of normal CLI sessions.
 */
import { AgentTarget } from './types';
export declare const nastechTarget: AgentTarget;
//# sourceMappingURL=nastech.d.ts.map