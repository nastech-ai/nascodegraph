import { Language } from './types';
/** Filename of the project-scoped config, resolved relative to the project root. */
export declare const PROJECT_CONFIG_FILENAME = "nascodegraph.json";
export interface ProjectConfig {
    /** Map of custom file extension (`.foo`) to a supported language id. */
    extensions?: Record<string, string>;
    /**
     * Gitignore-style patterns naming gitignored directories whose embedded git
     * repositories should be indexed anyway — the explicit opt-in to override
     * `.gitignore` for nested-repo discovery (#622, #699). Absent/empty (the
     * default) means `.gitignore` is fully respected: gitignored embedded repos
     * are never discovered or indexed (#970, #976).
     */
    includeIgnored?: string[];
    /**
     * Gitignore-style patterns for paths to keep OUT of the index — even when
     * they are git-TRACKED, which `.gitignore` cannot do (#999). The escape hatch
     * for a committed vendor/theme/SDK directory (e.g. a checked-in Metronic theme
     * under `static/`) that bloats the graph and slows indexing but isn't really
     * your code. Matched against project-root-relative paths, so a directory like
     * `"static/"`, a double-star vendor glob, or `"assets/theme"` all work.
     * Absent/empty (the default) excludes nothing beyond the built-in defaults
     * and your `.gitignore`.
     */
    exclude?: string[];
}
/**
 * Load the validated extension overrides for a project, mtime-cached.
 *
 * Returns a map of `.ext` → supported language id. The result merges on top of
 * the built-in extension map at the point of use (see `detectLanguage` /
 * `isSourceFile`), with these user mappings taking precedence. Returns an empty
 * map when there is no `nascodegraph.json` (the zero-config default).
 */
export declare function loadExtensionOverrides(rootDir: string): Record<string, Language>;
/**
 * Load the validated `includeIgnored` patterns for a project, mtime-cached.
 *
 * These name gitignored directories whose embedded git repositories should be
 * indexed despite `.gitignore` (#622, #699). An empty result — the zero-config
 * default — means `.gitignore` is fully respected: gitignored embedded repos
 * are never discovered or indexed (#970, #976).
 */
export declare function loadIncludeIgnoredPatterns(rootDir: string): string[];
/**
 * Load the validated `exclude` patterns for a project, mtime-cached.
 *
 * These name paths to keep OUT of the index even when git-tracked — the escape
 * hatch for a committed vendor/theme/SDK directory `.gitignore` can't drop
 * (#999). An empty result — the zero-config default — excludes nothing beyond
 * the built-in defaults and the project's `.gitignore`.
 */
export declare function loadExcludePatterns(rootDir: string): string[];
/** Test/maintenance hook: forget cached config (e.g. after rewriting it in a test). */
export declare function clearProjectConfigCache(): void;
//# sourceMappingURL=project-config.d.ts.map