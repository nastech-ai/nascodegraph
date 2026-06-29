"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MANAGED_DEFAULT_MODEL = exports.MANAGED_DEFAULT_URL = void 0;
exports.readOffloadConfig = readOffloadConfig;
exports.writeOffloadConfig = writeOffloadConfig;
exports.resolveOffload = resolveOffload;
/**
 * Reasoning-offload configuration: the persistent, machine-level settings the
 * `nascodegraph offload` CLI writes, merged with `NASTECHGRAPH_OFFLOAD_*` env overrides.
 *
 * Stored in `~/.nascodegraph/config.json` under the `offload` key — the same global
 * home NasCodeGraph already uses for the daemon registry — because the reasoning
 * endpoint is a per-machine choice (the model you bring), not per-project state.
 * Every nascodegraph MCP server on the machine picks it up, so a user configures it
 * once. Env vars override the file (CI / ephemeral / advanced use).
 *
 * For a BYO endpoint, the API key is NEVER written to disk: the CLI stores the
 * NAME of an env var (`keyEnv`) and reads the key from it at call time. The
 * MANAGED tier ("NasCodeGraph AI") instead authenticates with a revocable, org-scoped
 * token from `nascodegraph offload login`, stored separately in `credentials.json`
 * (see ./credentials) — so `config.json` itself never carries a secret either way.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const credentials_1 = require("./credentials");
/** Managed tier ("NasCodeGraph AI") — the metered gateway used when logged in. */
exports.MANAGED_DEFAULT_URL = 'https://ai.getnascodegraph.com/v1';
/** The gateway's public model id (it translates this to the upstream provider id). */
exports.MANAGED_DEFAULT_MODEL = 'openai/gpt-oss-120b';
function configDir() {
    return path.join(os.homedir(), '.nascodegraph');
}
function configPath() {
    return path.join(configDir(), 'config.json');
}
function readUserConfig() {
    try {
        return JSON.parse(fs.readFileSync(configPath(), 'utf8'));
    }
    catch {
        return {};
    }
}
function writeUserConfig(cfg) {
    fs.mkdirSync(configDir(), { recursive: true });
    fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2) + '\n');
}
/** The persisted offload block (empty object if none). */
function readOffloadConfig() {
    const cfg = readUserConfig();
    const o = cfg.offload;
    return o && typeof o === 'object' ? o : {};
}
/** Persist (or, with `null`, clear) the offload block, leaving other config keys intact. */
function writeOffloadConfig(offload) {
    const cfg = readUserConfig();
    if (offload === null)
        delete cfg.offload;
    else
        cfg.offload = offload;
    writeUserConfig(cfg);
}
const trimmed = (v) => {
    const t = v?.trim();
    return t ? t : undefined;
};
/** Merge the persisted config with `NASTECHGRAPH_OFFLOAD_*` env overrides (env wins). */
function resolveOffload(env = process.env) {
    // Hard kill-switch: disable the offload for this process/session without touching
    // the persisted config or the stored login — e.g. one A/B arm, or a user who wants
    // nascodegraph_explore to return raw source for a session. Env-only by design.
    if (env.NASTECHGRAPH_OFFLOAD_DISABLE === '1') {
        return {
            enabled: false, managed: false, url: undefined, model: exports.MANAGED_DEFAULT_MODEL,
            apiKey: undefined, keySource: undefined, effort: 'low', style: 'plain',
            timeoutMs: 20000, maxTokens: 12000, strip: false,
            debug: env.NASTECHGRAPH_OFFLOAD_DEBUG === '1', origin: 'none',
        };
    }
    const c = readOffloadConfig();
    const managed = !!c.managed;
    const envUrl = trimmed(env.NASTECHGRAPH_OFFLOAD_URL);
    const envKey = trimmed(env.NASTECHGRAPH_OFFLOAD_KEY);
    let url;
    let apiKey;
    let keySource;
    let model;
    if (managed) {
        // Managed tier: default to the NasCodeGraph AI gateway + its public model id; the
        // bearer is the org token from `nascodegraph offload login` (or an env override).
        url = envUrl ?? trimmed(c.url) ?? exports.MANAGED_DEFAULT_URL;
        model = trimmed(env.NASTECHGRAPH_OFFLOAD_MODEL) ?? trimmed(c.model) ?? exports.MANAGED_DEFAULT_MODEL;
        if (envKey) {
            apiKey = envKey;
            keySource = 'NASTECHGRAPH_OFFLOAD_KEY';
        }
        else {
            const t = (0, credentials_1.readOffloadToken)();
            if (t) {
                apiKey = t;
                keySource = 'nascodegraph login';
            }
        }
    }
    else {
        // BYO: endpoint + (optional) provider key resolved from env or the named env var.
        url = envUrl ?? trimmed(c.url);
        model = trimmed(env.NASTECHGRAPH_OFFLOAD_MODEL) ?? trimmed(c.model) ?? 'gpt-oss-120b';
        if (envKey) {
            apiKey = envKey;
            keySource = 'NASTECHGRAPH_OFFLOAD_KEY';
        }
        else if (c.keyEnv && trimmed(env[c.keyEnv])) {
            apiKey = trimmed(env[c.keyEnv]);
            keySource = c.keyEnv;
        }
    }
    const origin = envUrl ? 'env' : (managed || trimmed(c.url)) ? 'config' : 'none';
    return {
        // Managed needs both an endpoint AND a token (no token → effectively logged out);
        // BYO needs only an endpoint (some endpoints require no auth).
        enabled: managed ? (!!url && !!apiKey) : !!url,
        managed,
        url,
        model,
        apiKey,
        keySource,
        effort: trimmed(env.NASTECHGRAPH_OFFLOAD_EFFORT) ?? trimmed(c.effort) ?? 'low',
        style: trimmed(env.NASTECHGRAPH_OFFLOAD_STYLE) ?? trimmed(c.style) ?? 'plain',
        timeoutMs: Number(env.NASTECHGRAPH_OFFLOAD_TIMEOUT_MS) || 20000,
        maxTokens: Number(env.NASTECHGRAPH_OFFLOAD_MAXTOKENS) || 12000,
        strip: env.NASTECHGRAPH_OFFLOAD_STRIP === '1',
        debug: env.NASTECHGRAPH_OFFLOAD_DEBUG === '1',
        origin,
    };
}
//# sourceMappingURL=config.js.map