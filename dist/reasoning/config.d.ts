/** Managed tier ("NasCodeGraph AI") — the metered gateway used when logged in. */
export declare const MANAGED_DEFAULT_URL = "https://ai.getnascodegraph.com/v1";
/** The gateway's public model id (it translates this to the upstream provider id). */
export declare const MANAGED_DEFAULT_MODEL = "openai/gpt-oss-120b";
export interface OffloadConfig {
    /** Managed tier: route through NasCodeGraph AI (metered) with the logged-in org token. */
    managed?: boolean;
    /** OpenAI-compatible base URL ending in `/v1` (e.g. https://api.cerebras.ai/v1). */
    url?: string;
    /** Model id to request (default `gpt-oss-120b` BYO, `openai/gpt-oss-120b` managed). */
    model?: string;
    /** Name of the env var holding the provider API key (never persisted). BYO only. */
    keyEnv?: string;
    /** reasoning_effort: low | medium | high (default `low`). */
    effort?: string;
    /** Output style: plain | report (default `plain`). */
    style?: string;
}
export interface ResolvedOffload {
    /** True when the offload is usable (endpoint present; for managed, a token too). */
    enabled: boolean;
    /** Managed tier (NasCodeGraph AI, metered) vs BYO endpoint. */
    managed: boolean;
    url?: string;
    model: string;
    /** Resolved API key / org token (from env, the configured `keyEnv`, or login), if any. */
    apiKey?: string;
    /** Where the key/token came from (for `status` display) — never the secret itself. */
    keySource?: string;
    effort: string;
    style: string;
    timeoutMs: number;
    maxTokens: number;
    strip: boolean;
    debug: boolean;
    /** Where the endpoint came from — drives `nascodegraph offload status`. */
    origin: 'env' | 'config' | 'none';
}
/** The persisted offload block (empty object if none). */
export declare function readOffloadConfig(): OffloadConfig;
/** Persist (or, with `null`, clear) the offload block, leaving other config keys intact. */
export declare function writeOffloadConfig(offload: OffloadConfig | null): void;
/** Merge the persisted config with `NASTECHGRAPH_OFFLOAD_*` env overrides (env wins). */
export declare function resolveOffload(env?: NodeJS.ProcessEnv): ResolvedOffload;
//# sourceMappingURL=config.d.ts.map