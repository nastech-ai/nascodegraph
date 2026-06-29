"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginBaseUrl = loginBaseUrl;
exports.startDeviceLogin = startDeviceLogin;
exports.pollForToken = pollForToken;
exports.openBrowser = openBrowser;
/**
 * Managed-login device flow for `nascodegraph login`.
 *
 * Opens the user's browser to the NasCodeGraph dashboard, where they authorize with
 * their account; the CLI meanwhile polls for the minted, org-scoped token and
 * stores it (see ./credentials + ./config) to turn on managed reasoning.
 *
 * This talks to the DASHBOARD (app.getnascodegraph.com), not the metered gateway —
 * it's a plain OAuth-style device handshake (RFC 8628 shape), nothing proprietary.
 * The resulting token is what authenticates the managed reasoning calls (./reasoner).
 */
const child_process_1 = require("child_process");
const DEFAULT_BASE = 'https://app.getnascodegraph.com';
/** Dashboard base for the device-login endpoints; override for testing via NASTECHGRAPH_LOGIN_URL. */
function loginBaseUrl() {
    const raw = process.env.NASTECHGRAPH_LOGIN_URL?.trim() || DEFAULT_BASE;
    return raw.replace(/\/+$/, '');
}
/** Begin a device-authorization request. */
async function startDeviceLogin() {
    const base = loginBaseUrl();
    const res = await fetch(`${base}/api/cli/device/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
    }).catch(() => null);
    if (!res)
        throw new Error(`couldn't reach ${base} — check your connection`);
    if (!res.ok)
        throw new Error(`couldn't start login (HTTP ${res.status})`);
    const j = (await res.json().catch(() => null));
    if (!j?.device_code || !j.user_code)
        throw new Error('login start returned an unexpected response');
    return j;
}
/** Poll until the user approves in the browser; resolves with the org token. */
async function pollForToken(deviceCode, intervalSec, expiresInSec) {
    const deadline = Date.now() + Math.max(30, expiresInSec || 600) * 1000;
    let waitMs = Math.max(2, intervalSec || 5) * 1000;
    const base = loginBaseUrl();
    while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, waitMs));
        const res = await fetch(`${base}/api/cli/device/token`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ device_code: deviceCode }),
        }).catch(() => null);
        if (!res)
            continue; // transient network blip — keep polling until the deadline
        if (res.status === 200) {
            const j = (await res.json().catch(() => null));
            if (j?.token)
                return j.token;
        }
        else if (res.status === 429) {
            waitMs += 2000; // server asked us to slow down
        }
        else if (res.status === 404 || res.status === 410) {
            throw new Error('the login request expired — run `nascodegraph login` again');
        }
        // 202 (authorization pending) → keep waiting
    }
    throw new Error('login timed out before you approved — run `nascodegraph login` again');
}
/** Best-effort: open a URL in the default browser. Never throws — the URL is also printed. */
async function openBrowser(url) {
    const [cmd, args] = process.platform === 'darwin' ? ['open', [url]]
        : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
            : ['xdg-open', [url]];
    try {
        const child = (0, child_process_1.spawn)(cmd, args, { stdio: 'ignore', detached: true });
        child.on('error', () => { });
        child.unref();
    }
    catch {
        /* the URL is printed for manual open */
    }
}
//# sourceMappingURL=login.js.map