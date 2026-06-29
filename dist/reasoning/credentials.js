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
exports.readOffloadToken = readOffloadToken;
exports.writeOffloadToken = writeOffloadToken;
/**
 * Managed-offload credentials: the NasCodeGraph org token that authenticates the
 * managed reasoning tier against `nascodegraph-ai` (the metered gateway).
 *
 * Unlike a BYO provider key (which is never persisted — the config stores only the
 * NAME of an env var), the org token IS a revocable, org-scoped auth token issued
 * to this machine — like the token `gh auth` or `npm login` stores. So it lives in
 * its own file, `~/.nascodegraph/credentials.json`, written `0600`, kept out of the
 * shareable `config.json`.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
function credentialsPath() {
    return path.join(os.homedir(), '.nascodegraph', 'credentials.json');
}
function read() {
    try {
        return JSON.parse(fs.readFileSync(credentialsPath(), 'utf8'));
    }
    catch {
        return {};
    }
}
/** The stored managed-offload org token, if the machine is logged in. */
function readOffloadToken() {
    const t = read().offloadToken;
    return typeof t === 'string' && t.trim() ? t.trim() : undefined;
}
/** Persist (or, with `null`, clear) the managed-offload org token at `0600`. */
function writeOffloadToken(token) {
    const p = credentialsPath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const creds = read();
    if (token === null)
        delete creds.offloadToken;
    else
        creds.offloadToken = token;
    // Write restrictively: create at 0600, and tighten an existing file too.
    fs.writeFileSync(p, JSON.stringify(creds, null, 2) + '\n', { mode: 0o600 });
    try {
        fs.chmodSync(p, 0o600);
    }
    catch { /* best-effort on platforms without POSIX modes */ }
}
//# sourceMappingURL=credentials.js.map