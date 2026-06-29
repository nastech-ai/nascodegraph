#!/usr/bin/env node
/**
 * NasCodeGraph preuninstall cleanup script
 *
 * Runs automatically when `npm uninstall -g @nastech-ai/nascodegraph`
 * is called. Loops over every known agent target's `uninstall(loc)`
 * for the global location only — local-location entries live inside
 * project working trees and aren't ours to nuke at npm-uninstall
 * time.
 *
 * This script must never throw — a failed cleanup must not block
 * uninstall.
 */
//# sourceMappingURL=uninstall.d.ts.map