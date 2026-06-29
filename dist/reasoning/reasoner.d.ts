interface SynthArgs {
    query: string;
    context: string;
}
/** True when a reasoning offload endpoint is configured (env or `~/.nascodegraph/config.json`). */
export declare function isOffloadEnabled(): boolean;
export interface OffloadUsage {
    plan?: string;
    allowance?: number;
    used?: number;
    overage?: number;
    remaining?: number;
    periodEnd?: number;
    unlimited?: boolean;
    banned?: boolean;
    tokensLast30?: number;
    callsLast30?: number;
    creditsLast30?: number;
    models?: string[];
}
/**
 * GET `/v1/usage` from the configured (managed) endpoint → the org's credit
 * balance/usage, or null on any failure. Drives `nascodegraph offload status`.
 */
export declare function fetchUsage(): Promise<OffloadUsage | null>;
/**
 * Strip sections of the explore output addressed to the AGENT (not useful to a
 * reasoning model): the "Not shown above" pointer list, the completeness signal,
 * the explore-budget note, the trimmed/truncation notices, and the redundant
 * "## Exploration:/Found N symbols" header (the query is sent separately). Left
 * in, some models regurgitate them ("We have 2 explore calls. Let's explore…")
 * and they add noise. Source code, blast radius, relationships, and flow stay.
 * Opt-in (`NASTECHGRAPH_OFFLOAD_STRIP=1`) — default off (it also removes the "Not
 * shown above" pointers, which can be useful navigation).
 */
export declare function stripAgentDirectives(context: string): string;
/**
 * Offload reasoning over the retrieved `context` to the configured model and
 * return its synthesized answer, or null to signal "fall back to local source".
 */
export declare function synthesizeOffload({ query, context }: SynthArgs): Promise<string | null>;
export {};
//# sourceMappingURL=reasoner.d.ts.map