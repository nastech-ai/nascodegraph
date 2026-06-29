"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installCommandSupervision = installCommandSupervision;
/**
 * Process supervision for long-running CLI commands (`index` / `init --index`).
 *
 * Indexing a large repo can run for a while on the main thread, and #999
 * surfaced two ways that goes wrong when nothing is watching it:
 *
 *   1. **Orphaned worker.** `index` runs in a child re-exec'd with
 *      `--liftoff-only` (the WASM-flag relaunch). Its parent blocks in
 *      `spawnSync`, so when the parent shim is killed it cannot forward the
 *      signal — the child keeps running, now orphaned, pinning a core. The PPID
 *      watchdog (#277) notices the parent/host went away and exits the child.
 *   2. **Wedged indexer.** The `#850` main-thread liveness watchdog — which
 *      SIGKILLs a process whose event loop stops turning — was wired only into
 *      the MCP `serve` path, so a wedged `index`/`init` was never auto-killed.
 *
 * Both reuse the exact mechanisms `serve` already uses; this just makes them
 * available to a one-shot command. Best-effort and self-disabling: a missing
 * watchdog never blocks the command from running. Both honour the same env
 * switches as `serve` (`NASTECHGRAPH_NO_WATCHDOG`, `NASTECHGRAPH_PPID_POLL_MS=0`).
 */
const liveness_watchdog_1 = require("../mcp/liveness-watchdog");
const ppid_watchdog_1 = require("../mcp/ppid-watchdog");
const daemon_registry_1 = require("../mcp/daemon-registry");
const wasm_runtime_flags_1 = require("../extraction/wasm-runtime-flags");
/**
 * Install the liveness + PPID watchdogs for the duration of a CLI command.
 * `label` is used in the shutdown notice (e.g. `"index"`). Returns a handle
 * whose `stop()` must be called when the command completes so neither watchdog
 * outlives it.
 */
function installCommandSupervision(label) {
    // Liveness watchdog: a separate process that SIGKILLs us if our event loop
    // stops turning for too long (a wedged synchronous loop). Self-disables on
    // NASTECHGRAPH_NO_WATCHDOG.
    const liveness = (0, liveness_watchdog_1.installMainThreadWatchdog)();
    // PPID watchdog: detect that the parent (or the host threaded past the
    // relaunch shim) died and we've been orphaned, then exit instead of leaking.
    const originalPpid = process.ppid;
    const hostPpid = (0, ppid_watchdog_1.parseHostPpid)(process.env[wasm_runtime_flags_1.HOST_PPID_ENV]);
    const pollMs = (0, ppid_watchdog_1.parsePpidPollMs)(process.env.NASTECHGRAPH_PPID_POLL_MS);
    let ppidTimer = null;
    if (pollMs > 0) {
        ppidTimer = setInterval(() => {
            const reason = (0, ppid_watchdog_1.supervisionLostReason)({
                originalPpid,
                currentPpid: process.ppid,
                hostPpid,
                isAlive: daemon_registry_1.isProcessAlive,
            });
            if (reason) {
                try {
                    process.stderr.write(`[NasCodeGraph ${label}] Parent process exited (${reason}); aborting.\n`);
                }
                catch { /* stderr gone with the parent — exit anyway */ }
                process.exit(1);
            }
        }, pollMs);
        // Never let the watchdog itself keep the process alive past its real work.
        ppidTimer.unref();
    }
    let stopped = false;
    return {
        stop() {
            if (stopped)
                return;
            stopped = true;
            if (ppidTimer)
                clearInterval(ppidTimer);
            liveness?.stop();
        },
    };
}
//# sourceMappingURL=command-supervision.js.map