/**
 * NasCodeGraph
 *
 * A local-first code intelligence system that builds a semantic
 * knowledge graph from any codebase.
 */
import { Node, Edge, FileRecord, ExtractionResult, Subgraph, TraversalOptions, SearchOptions, SearchResult, Context, GraphStats, TaskInput, TaskContext, BuildContextOptions, FindRelevantContextOptions } from './types';
import { IndexProgress, IndexResult, SyncResult } from './extraction';
import { ResolutionResult } from './resolution';
import { WatchOptions, PendingFile } from './sync';
export * from './types';
export { getDatabasePath, DatabaseConnection } from './db';
export { QueryBuilder } from './db/queries';
export { getNasCodeGraphDir, isInitialized, findNearestNasCodeGraphRoot, NASTECHGRAPH_DIR, } from './directory';
export { IndexProgress, IndexResult, SyncResult } from './extraction';
export { detectLanguage, isLanguageSupported, isGrammarLoaded, getSupportedLanguages, initGrammars, loadGrammarsForLanguages, loadAllGrammars } from './extraction';
export { ResolutionResult } from './resolution';
export { NasCodeGraphError, FileError, ParseError, DatabaseError, SearchError, VectorError, ConfigError, Logger, setLogger, getLogger, silentLogger, defaultLogger, } from './errors';
export { Mutex, FileLock, processInBatches, debounce, throttle, MemoryMonitor } from './utils';
export { FileWatcher, WatchOptions, PendingFile, LockUnavailableError } from './sync';
export { MCPServer } from './mcp';
/**
 * Options for initializing a new NasCodeGraph project
 */
export interface InitOptions {
    /** Whether to run initial indexing after init */
    index?: boolean;
    /** Progress callback for indexing */
    onProgress?: (progress: IndexProgress) => void;
}
/**
 * Options for opening an existing NasCodeGraph project
 */
export interface OpenOptions {
    /** Whether to run sync if files have changed */
    sync?: boolean;
    /** Whether to run in read-only mode */
    readOnly?: boolean;
}
/**
 * Options for indexing
 */
export interface IndexOptions {
    /** Progress callback */
    onProgress?: (progress: IndexProgress) => void;
    /** Abort signal for cancellation */
    signal?: AbortSignal;
    /** Enable verbose logging (worker lifecycle, memory, timeouts) */
    verbose?: boolean;
}
/**
 * Main NasCodeGraph class
 *
 * Provides the primary interface for interacting with the code knowledge graph.
 */
export declare class NasCodeGraph {
    private db;
    private queries;
    private projectRoot;
    private orchestrator;
    private resolver;
    private graphManager;
    private traverser;
    private contextBuilder;
    private indexMutex;
    private fileLock;
    private watcher;
    private constructor();
    /**
     * (Re)build the query/extraction/graph layers over the current `this.queries`
     * (which wraps `this.db`). Factored out of the constructor so `reopenIfReplaced`
     * can rebuild them against a fresh connection without duplicating the wiring.
     * The path-based `fileLock` is independent of the DB handle, so it stays put.
     */
    private wireLayers;
    /**
     * Heal a stale database handle in place. If `.nascodegraph/` was removed and
     * recreated at the SAME path while this instance held the DB open — a git
     * worktree removed and re-added, or `rm -rf .nascodegraph` + `nascodegraph init` —
     * our open fd points at the now-unlinked inode and can never see the new
     * index, so every query returns the pre-removal snapshot until the process
     * restarts (#925). When that's detected, open the live file at the same path,
     * rebuild the query layers, and swap them IN PLACE, so every holder of this
     * instance (the MCP daemon's default project, cached projectPath connections)
     * heals without a restart. Returns true iff it reopened.
     *
     * POSIX-only in practice: `isReplacedOnDisk` never fires on Windows (an open
     * file can't be unlinked there, and st_ino is unreliable).
     */
    reopenIfReplaced(): boolean;
    /**
     * Initialize a new NasCodeGraph project
     *
     * Creates the .NasCodeGraph directory, database, and configuration.
     *
     * @param projectRoot - Path to the project root directory
     * @param options - Initialization options
     * @returns A new NasCodeGraph instance
     */
    static init(projectRoot: string, options?: InitOptions): Promise<NasCodeGraph>;
    /**
     * Initialize synchronously (without indexing)
     */
    static initSync(projectRoot: string): NasCodeGraph;
    /**
     * Open an existing NasCodeGraph project
     *
     * @param projectRoot - Path to the project root directory
     * @param options - Open options
     * @returns A NasCodeGraph instance
     */
    static open(projectRoot: string, options?: OpenOptions): Promise<NasCodeGraph>;
    /**
     * Open synchronously (without sync)
     */
    static openSync(projectRoot: string): NasCodeGraph;
    /**
     * Check if a directory has been initialized as a NasCodeGraph project
     */
    static isInitialized(projectRoot: string): boolean;
    /**
     * Close the NasCodeGraph instance and release resources
     */
    close(): void;
    /**
     * Get the project root directory
     */
    getProjectRoot(): string;
    /**
     * Index all files in the project
     *
     * Uses a mutex to prevent concurrent indexing operations.
     */
    indexAll(options?: IndexOptions): Promise<IndexResult>;
    /**
     * Index specific files
     *
     * Uses a mutex to prevent concurrent indexing operations.
     */
    indexFiles(filePaths: string[]): Promise<IndexResult>;
    /**
     * Sync with current file state (incremental update)
     *
     * Uses a mutex to prevent concurrent indexing operations.
     */
    sync(options?: IndexOptions): Promise<SyncResult>;
    /**
     * Check if an indexing operation is currently in progress
     */
    isIndexing(): boolean;
    /**
     * Start watching for file changes and auto-syncing.
     *
     * Uses native OS file events (FSEvents on macOS, inotify on Linux 19+,
     * ReadDirectoryChangesW on Windows) with debouncing to avoid thrashing.
     *
     * @param options - Watch options (debounce delay, callbacks)
     * @returns true if watching started successfully
     */
    watch(options?: WatchOptions): boolean;
    /**
     * Stop watching for file changes.
     */
    unwatch(): void;
    /**
     * Check if the file watcher is active.
     */
    isWatching(): boolean;
    /**
     * True once live watching has permanently degraded (OS watch-resource
     * exhaustion, or a write lock held past the retry budget) and auto-sync is
     * disabled until the next {@link watch} call. Distinct from `!isWatching()`:
     * a stopped/never-started watcher is inactive but NOT degraded. MCP tools use
     * this to surface a whole-index "results may be stale" notice, since
     * `getPendingFiles()` goes empty once watching stops (#876).
     */
    isWatcherDegraded(): boolean;
    /** The reason live watching degraded, or null if it is healthy (#876). */
    getWatcherDegradedReason(): string | null;
    /**
     * Files seen by the file watcher since the last successful sync —
     * the per-file "stale" signal MCP tools attach to responses so an agent
     * can fall back to {@link Read} for just the affected file without
     * waiting for a debounced sync to complete (issue #403).
     *
     * Returns an empty list when the watcher isn't active, or no events have
     * arrived. Each entry includes `firstSeenMs` and `lastSeenMs` (wall-clock
     * `Date.now()` values) so callers can render "edited Nms ago", plus an
     * `indexing` flag indicating whether the in-flight sync (if any) will
     * absorb that file.
     */
    getPendingFiles(): PendingFile[];
    /**
     * Resolves once the file watcher has installed its watch set. Useful for
     * tests that need a deterministic boundary before asserting on
     * `getPendingFiles()`. Resolves immediately when no watcher is active.
     */
    waitUntilWatcherReady(timeoutMs?: number): Promise<void>;
    /**
     * Get files that have changed since last index
     */
    getChangedFiles(): {
        added: string[];
        modified: string[];
        removed: string[];
    };
    /**
     * Most recent index timestamp (ms since epoch) across all tracked files, or
     * null when nothing is indexed yet. Lets library consumers check index
     * freshness without shelling out to `nascodegraph status --json`. (#329)
     */
    getLastIndexedAt(): number | null;
    /**
     * Which engine built the current index: the package version + extraction
     * version stamped at the last full `indexAll`. Either field is null for an
     * index built before stamping existed (treated as stale). See
     * `extraction-version.ts` and `isIndexStale()`.
     */
    getIndexBuildInfo(): {
        version: string | null;
        extractionVersion: number | null;
    };
    /**
     * True when the on-disk index was built by an engine whose extraction is
     * older than the one now running — i.e. a re-index would add data a migration
     * can't backfill. False when there's no index yet (nothing to refresh) or the
     * stamp is current. This is the signal behind `nascodegraph status`'s re-index
     * hint and `nascodegraph upgrade`'s reminder.
     */
    isIndexStale(): boolean;
    /**
     * Extract nodes and edges from source code (without storing)
     */
    extractFromSource(filePath: string, source: string): ExtractionResult;
    /**
     * Resolve unresolved references and create edges
     *
     * This method takes unresolved references from extraction and attempts
     * to resolve them using multiple strategies:
     * - Framework-specific patterns (React, Express, Laravel)
     * - Import-based resolution
     * - Name-based symbol matching
     */
    resolveReferences(onProgress?: (current: number, total: number) => void): ResolutionResult;
    /**
     * Resolve references in batches to keep memory bounded on large codebases.
     * Processes chunks of unresolved refs, persisting results after each batch.
     */
    resolveReferencesBatched(onProgress?: (current: number, total: number) => void): Promise<ResolutionResult>;
    /**
     * Get detected frameworks in the project
     */
    getDetectedFrameworks(): string[];
    /**
     * Re-initialize the resolver (useful after adding new files)
     */
    reinitializeResolver(): void;
    /**
     * Get statistics about the knowledge graph
     */
    getStats(): GraphStats;
    /**
     * Active SQLite backend for this project's connection (`node-sqlite` — Node's
     * built-in real-SQLite module). Surfaced via `nascodegraph status` and the
     * `nascodegraph_status` MCP tool alongside the effective journal mode.
     */
    getBackend(): import('./db').SqliteBackend;
    /**
     * The journal mode actually in effect ('wal', 'delete', …). 'wal' means
     * readers never block on a concurrent writer; anything else means they can,
     * which is the precondition for the "database is locked" failures in issue
     * #238. Surfaced via `nascodegraph status` and the `nascodegraph_status` MCP tool.
     */
    getJournalMode(): string;
    /**
     * Get a node by ID
     */
    getNode(id: string): Node | null;
    /**
     * Get all nodes in a file
     */
    getNodesInFile(filePath: string): Node[];
    /**
     * Get all nodes of a specific kind
     */
    getNodesByKind(kind: Node['kind']): Node[];
    /**
     * Get ALL nodes with an exact name (direct index lookup, not FTS-ranked/capped).
     * Used to enumerate every overload of a heavily-overloaded name so the specific
     * definition the caller wants is never dropped below a search cut.
     */
    getNodesByName(name: string): Node[];
    /**
     * Search nodes by text
     */
    searchNodes(query: string, options?: SearchOptions): SearchResult[];
    /**
     * Normalized project-name tokens (go.mod / package.json / repo dir) used to
     * down-weight the non-discriminative project name in search ranking (#720).
     * Exposed so explore can exclude it from the PascalCase type-disambiguation
     * bias, which would otherwise pull overloaded tokens toward whichever stack
     * embeds the project name.
     */
    getProjectNameTokens(): Set<string>;
    /**
     * Find the project's "primary route file" — the file with the densest
     * concentration of framework-emitted `route` nodes (≥3 routes, ≥30%
     * of all non-test routes). Used to inline the routing config in
     * `nascodegraph_explore` responses on small realworld template repos
     * (rails-realworld, laravel-realworld, drupal-admintoolbar, …) where
     * Glob+Read of `routes.rb`/`urls.py`/etc. otherwise beats nascodegraph.
     */
    getTopRouteFile(): {
        filePath: string;
        routeCount: number;
        totalRoutes: number;
    } | null;
    /**
     * Build a URL → handler routing manifest from the index. Each entry
     * pairs a route node (URL + method) with its handler function/method
     * via the `references` edge that framework resolvers emit. Returns
     * null when fewer than 3 valid (non-test) routes exist.
     */
    getRoutingManifest(limit?: number): {
        entries: Array<{
            url: string;
            handler: string;
            handlerFile: string;
            handlerLine: number;
            handlerKind: string;
        }>;
        topHandlerFile: string | null;
        topHandlerFileCount: number;
        totalRoutes: number;
    } | null;
    /**
     * Get outgoing edges from a node
     */
    getOutgoingEdges(nodeId: string): Edge[];
    /**
     * Get incoming edges to a node
     */
    getIncomingEdges(nodeId: string): Edge[];
    /**
     * Get a file record by path
     */
    getFile(filePath: string): FileRecord | null;
    /**
     * Get all tracked files
     */
    getFiles(): FileRecord[];
    /**
     * Get the context for a node (ancestors, children, references)
     *
     * Returns comprehensive context about a node including its containment
     * hierarchy, children, incoming/outgoing references, type information,
     * and relevant imports.
     *
     * @param nodeId - ID of the focal node
     * @returns Context object with all related information
     */
    getContext(nodeId: string): Context;
    /**
     * Traverse the graph from a starting node
     *
     * Uses breadth-first search by default. Supports filtering by edge types,
     * node types, and traversal direction.
     *
     * @param startId - Starting node ID
     * @param options - Traversal options
     * @returns Subgraph containing traversed nodes and edges
     */
    traverse(startId: string, options?: TraversalOptions): Subgraph;
    /**
     * Get the call graph for a function
     *
     * Returns both callers (functions that call this function) and
     * callees (functions called by this function) up to the specified depth.
     *
     * @param nodeId - ID of the function/method node
     * @param depth - Maximum depth in each direction (default: 2)
     * @returns Subgraph containing the call graph
     */
    getCallGraph(nodeId: string, depth?: number): Subgraph;
    /**
     * Get the type hierarchy for a class/interface
     *
     * Returns both ancestors (types this extends/implements) and
     * descendants (types that extend/implement this).
     *
     * @param nodeId - ID of the class/interface node
     * @returns Subgraph containing the type hierarchy
     */
    getTypeHierarchy(nodeId: string): Subgraph;
    /**
     * Find all usages of a symbol
     *
     * Returns all nodes that reference the specified symbol through
     * any edge type (calls, references, type_of, etc.).
     *
     * @param nodeId - ID of the symbol node
     * @returns Array of nodes and edges that reference this symbol
     */
    findUsages(nodeId: string): Array<{
        node: Node;
        edge: Edge;
    }>;
    /**
     * Get callers of a function/method
     *
     * @param nodeId - ID of the function/method node
     * @param maxDepth - Maximum depth to traverse (default: 1)
     * @returns Array of nodes that call this function
     */
    getCallers(nodeId: string, maxDepth?: number): Array<{
        node: Node;
        edge: Edge;
    }>;
    /**
     * Get callees of a function/method
     *
     * @param nodeId - ID of the function/method node
     * @param maxDepth - Maximum depth to traverse (default: 1)
     * @returns Array of nodes called by this function
     */
    getCallees(nodeId: string, maxDepth?: number): Array<{
        node: Node;
        edge: Edge;
    }>;
    /**
     * Calculate the impact radius of a node
     *
     * Returns all nodes that could be affected by changes to this node.
     *
     * @param nodeId - ID of the node
     * @param maxDepth - Maximum depth to traverse (default: 3)
     * @returns Subgraph containing potentially impacted nodes
     */
    getImpactRadius(nodeId: string, maxDepth?: number): Subgraph;
    /**
     * Find the shortest path between two nodes
     *
     * @param fromId - Starting node ID
     * @param toId - Target node ID
     * @param edgeKinds - Edge types to consider (all if empty)
     * @returns Array of nodes and edges forming the path, or null if no path exists
     */
    findPath(fromId: string, toId: string, edgeKinds?: Edge['kind'][]): Array<{
        node: Node;
        edge: Edge | null;
    }> | null;
    /**
     * Get ancestors of a node in the containment hierarchy
     *
     * @param nodeId - ID of the node
     * @returns Array of ancestor nodes from immediate parent to root
     */
    getAncestors(nodeId: string): Node[];
    /**
     * Get immediate children of a node
     *
     * @param nodeId - ID of the node
     * @returns Array of child nodes
     */
    getChildren(nodeId: string): Node[];
    /**
     * Get dependencies of a file
     *
     * @param filePath - Path to the file
     * @returns Array of file paths this file depends on
     */
    getFileDependencies(filePath: string): string[];
    /**
     * Get dependents of a file
     *
     * @param filePath - Path to the file
     * @returns Array of file paths that depend on this file
     */
    getFileDependents(filePath: string): string[];
    /**
     * Find circular dependencies in the codebase
     *
     * @returns Array of cycles, each cycle is an array of file paths
     */
    findCircularDependencies(): string[][];
    /**
     * Find dead code (unreferenced symbols)
     *
     * @param kinds - Node kinds to check (default: functions, methods, classes)
     * @returns Array of unreferenced nodes
     */
    findDeadCode(kinds?: Node['kind'][]): Node[];
    /**
     * Get complexity metrics for a node
     *
     * @param nodeId - ID of the node
     * @returns Object containing various complexity metrics
     */
    getNodeMetrics(nodeId: string): {
        incomingEdgeCount: number;
        outgoingEdgeCount: number;
        callCount: number;
        callerCount: number;
        childCount: number;
        depth: number;
    };
    /**
     * Get the source code for a node
     *
     * Reads the file and extracts the code between startLine and endLine.
     *
     * @param nodeId - ID of the node
     * @returns Code string or null if not found
     */
    getCode(nodeId: string): Promise<string | null>;
    /**
     * Find relevant subgraph for a query
     *
     * Combines semantic search with graph traversal to find the most
     * relevant nodes and their relationships for a given query.
     *
     * @param query - Natural language query describing the task
     * @param options - Search and traversal options
     * @returns Subgraph of relevant nodes and edges
     */
    findRelevantContext(query: string, options?: FindRelevantContextOptions): Promise<Subgraph>;
    /**
     * Build context for a task
     *
     * Creates comprehensive context by:
     * 1. Running FTS search to find entry points
     * 2. Expanding the graph around entry points
     * 3. Extracting code blocks for key nodes
     * 4. Formatting output for Claude
     *
     * @param input - Task description (string or {title, description})
     * @param options - Build options (maxNodes, includeCode, format, etc.)
     * @returns TaskContext object or formatted string (markdown/JSON)
     */
    buildContext(input: TaskInput, options?: BuildContextOptions): Promise<TaskContext | string>;
    /**
     * Optimize the database (vacuum and analyze)
     */
    optimize(): void;
    /**
     * Clear all data from the graph
     */
    clear(): void;
    /**
     * Alias for close() for backwards compatibility.
     * @deprecated Use close() instead
     */
    destroy(): void;
    /**
     * Completely remove NasCodeGraph from the project.
     * This closes the database and deletes the .NasCodeGraph directory.
     *
     * WARNING: This permanently deletes all NasCodeGraph data for the project.
     */
    uninitialize(): void;
}
export default NasCodeGraph;
//# sourceMappingURL=index.d.ts.map