export interface CommandSupervision {
    /** Tear down both watchdogs. Idempotent; call when the command finishes. */
    stop(): void;
}
/**
 * Install the liveness + PPID watchdogs for the duration of a CLI command.
 * `label` is used in the shutdown notice (e.g. `"index"`). Returns a handle
 * whose `stop()` must be called when the command completes so neither watchdog
 * outlives it.
 */
export declare function installCommandSupervision(label: string): CommandSupervision;
//# sourceMappingURL=command-supervision.d.ts.map