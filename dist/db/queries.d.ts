/**
 * Database Queries
 *
 * Prepared statements for CRUD operations on the knowledge graph.
 */
import { SqliteDatabase } from './sqlite-adapter';
import { Node, Edge, FileRecord, UnresolvedReference, NodeKind, EdgeKind, GraphStats, SearchOptions, SearchResult } from '../types';
/**
 * Query builder for the knowledge graph database
 */
export declare class QueryBuilder {
    private db;
    private projectNameTokens;
    private nodeCache;
    private readonly maxCacheSize;
    private stmts;
    constructor(db: SqliteDatabase);
    /** Set the normalized project-name tokens used to down-weight non-discriminative
     * query words in path scoring (#720). Called once when the project opens. */
    setProjectNameTokens(tokens: Set<string>): void;
    /** The normalized project-name tokens (#720); empty if none were derived. */
    getProjectNameTokens(): Set<string>;
    /**
     * Insert a new node
     */
    insertNode(node: Node): void;
    /**
     * Insert multiple nodes in a transaction
     */
    insertNodes(nodes: Node[]): void;
    /**
     * Update an existing node
     */
    updateNode(node: Node): void;
    /**
     * Delete a node by ID
     */
    deleteNode(id: string): void;
    /**
     * Delete all nodes for a file
     */
    deleteNodesByFile(filePath: string): void;
    /**
     * Get a node by ID
     */
    getNodeById(id: string): Node | null;
    /**
     * Batch lookup: fetch many nodes by ID in a single SQL round-trip.
     *
     * Replaces the N+1 pattern in graph traversal where every edge would
     * trigger its own `getNodeById` call. For a function with 50 callers
     * this collapses 50 point reads into one IN-list query (~10-50x
     * faster end-to-end).
     *
     * Returns a Map keyed by id so callers can preserve their own ordering
     * (typically the order edges were returned from the graph). Missing IDs
     * are simply absent from the map.
     *
     * Cache-aware: ids already in the LRU cache are served from memory and
     * the SQL query only touches the misses.
     */
    getNodesByIds(ids: readonly string[]): Map<string, Node>;
    private getExistingNodeIds;
    /**
     * Add a node to the cache, evicting oldest if needed
     */
    private cacheNode;
    /**
     * Clear the node cache
     */
    clearCache(): void;
    /**
     * Get all nodes in a file
     */
    getNodesByFile(filePath: string): Node[];
    /**
     * Find the file that holds the densest concentration of the project's
     * internal call graph — the "core" file. Used by context-builder to
     * boost ranking of symbols in that file's directory (so e.g. sinatra
     * queries surface `lib/sinatra/base.rb`'s `route!` instead of
     * `sinatra-contrib/lib/sinatra/multi_route.rb`'s `route` extension).
     *
     * Returns null if no file has a meaningful concentration (e.g. spread
     * evenly across many files, or empty index).
     *
     * "Internal" = source and target are in the same file. Cross-file
     * edges aren't useful here — they don't tell us which file is the
     * functional center.
     *
     * Excludes test/spec files from candidacy via path-pattern. The agent's
     * typical question is "how does X work", not "how is X tested", so
     * boosting a test file's directory would be a misfire.
     */
    getDominantFile(): {
        filePath: string;
        edgeCount: number;
        nextEdgeCount: number;
    } | null;
    /**
     * Find the file that holds the densest concentration of the project's
     * `route` nodes (framework-emitted: Express/Gin/Flask/Rails/Drupal/etc.).
     * Used by handleContext on small repos to inline the project's routing
     * config when the agent's query is about request flow — eliminating the
     * "Glob + Read routes.rb" pattern that beats nascodegraph on tiny realworld
     * template repos.
     *
     * Excludes test/generated files from candidacy. Returns null if there
     * are fewer than 3 non-test routes total, or if no file holds at least
     * 30% of them (diffuse routing → no single answer file).
     */
    getTopRouteFile(): {
        filePath: string;
        routeCount: number;
        totalRoutes: number;
    } | null;
    /**
     * Build a URL → handler manifest from the index. Each route node's
     * `references` edge points at the function/method that handles the
     * request. We join them in one pass; the agent gets the canonical
     * routing answer ("POST /users/login → AuthController#login") without
     * having to parse the framework's route DSL itself.
     *
     * Also returns the file with the most handler endpoints — used as the
     * "top handler file" to inline source for, so the agent has both the
     * mapping AND the handler implementations.
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
     * Get all nodes of a specific kind
     */
    getNodesByKind(kind: NodeKind): Node[];
    /**
     * Stream every node of a kind one at a time (lazy) instead of materializing
     * them all like {@link getNodesByKind}. For unbounded kinds (`function`,
     * `method`) on a symbol-dense project the full array is gigabytes; the
     * dynamic-edge synthesizers only scan-and-filter, so they iterate to keep
     * memory O(1) in the node count rather than O(nodes) (#610).
     */
    iterateNodesByKind(kind: NodeKind): IterableIterator<Node>;
    /**
     * Get all nodes in the database
     */
    getAllNodes(): Node[];
    /**
     * Get nodes by exact name match (uses idx_nodes_name index)
     */
    getNodesByName(name: string): Node[];
    /**
     * Get nodes by exact qualified name match (uses idx_nodes_qualified_name index)
     */
    getNodesByQualifiedNameExact(qualifiedName: string): Node[];
    /**
     * Get nodes by lowercase name match (uses idx_nodes_lower_name expression index)
     */
    getNodesByLowerName(lowerName: string): Node[];
    /**
     * Search nodes by name using FTS with fallback to LIKE for better matching
     *
     * Search strategy:
     * 1. Try FTS5 prefix match (query*) for word-start matching
     * 2. If no results, try LIKE for substring matching (e.g., "signIn" finds "signInWithGoogle")
     * 3. Score results based on match quality
     */
    searchNodes(query: string, options?: SearchOptions): SearchResult[];
    /**
     * Match-everything path used when the user supplied only field
     * filters (`kind:function lang:typescript`) with no text. Returns
     * candidates ordered by name; the caller's filter pass narrows to
     * what was asked for.
     */
    private searchAllByFilters;
    /**
     * Fuzzy fallback: when zero FTS/LIKE hits, try an edit-distance
     * sweep over the distinct symbol-name set. Caps `maxDist` at 2 so
     * `getUssr` finds `getUser` but `process` doesn't match `prosody`.
     * Bounded edit distance keeps each comparison cheap; the per-query
     * scan is O(distinct-name-count) which is far smaller than total
     * node count on any real codebase.
     */
    private searchNodesFuzzy;
    /**
     * FTS5 search with prefix matching
     */
    private searchNodesFTS;
    /**
     * LIKE-based substring search for cases where FTS doesn't match
     * Useful for camelCase matching (e.g., "signIn" finds "signInWithGoogle")
     */
    private searchNodesLike;
    /**
     * Find nodes by exact name match
     *
     * Used for hybrid search - looks up symbols by exact name or case-insensitive match.
     * Returns high-confidence matches for known symbol names extracted from query.
     *
     * @param names - Array of symbol names to look up
     * @param options - Search options (kinds, languages, limit)
     * @returns SearchResult array with exact matches scored at 1.0
     */
    findNodesByExactName(names: string[], options?: SearchOptions): SearchResult[];
    /**
     * Find nodes whose name contains a substring (LIKE-based).
     * Useful for CamelCase-part matching where FTS fails because
     * e.g. "TransportSearchAction" is one FTS token, not matchable by "Search"*.
     *
     * Results are ordered by name length (shorter = more likely to be the core type).
     */
    findNodesByNameSubstring(substring: string, options?: SearchOptions & {
        excludePrefix?: boolean;
    }): SearchResult[];
    /**
     * Insert a new edge
     */
    insertEdge(edge: Edge): void;
    /**
     * Insert multiple edges in a transaction
     */
    insertEdges(edges: Edge[]): void;
    /**
     * Delete all edges from a source node
     */
    deleteEdgesBySource(sourceId: string): void;
    /**
     * Get outgoing edges from a node
     */
    getOutgoingEdges(sourceId: string, kinds?: EdgeKind[], provenance?: string): Edge[];
    /**
     * Get incoming edges to a node
     */
    getIncomingEdges(targetId: string, kinds?: EdgeKind[]): Edge[];
    /**
     * Find all edges where both source and target are in the given node set.
     * Useful for recovering inter-node connectivity after BFS.
     */
    findEdgesBetweenNodes(nodeIds: string[], kinds?: EdgeKind[]): Edge[];
    /**
     * Distinct file paths that DEPEND ON `filePath`: every file containing a
     * symbol with a cross-file edge (any kind except `contains`) into a symbol
     * of this file. This is the file-level projection of the symbol dependency
     * graph and the basis for blast-radius / `affected` test selection.
     *
     * It deliberately does NOT restrict to `imports` edges. In this graph an
     * `imports` edge connects a file to its own local import declarations
     * (it is always same-file), so an imports-only lookup returns zero
     * cross-file dependents for every file. The real cross-file dependency
     * signal is the resolved call/reference graph — calls, references,
     * instantiates, extends, implements, overrides, type_of, returns,
     * decorates — exactly what {@link GraphTraverser.getImpactRadius} traverses.
     * `contains` is excluded: a parent containing a symbol does not *depend* on
     * it. One indexed query (idx_nodes_file_path + idx_edges_target_kind).
     */
    getDependentFilePaths(filePath: string): string[];
    /**
     * Distinct file paths that `filePath` DEPENDS ON — the inverse of
     * {@link getDependentFilePaths}: every file containing a symbol that a
     * symbol of this file has a cross-file edge into. Same edge-kind rules
     * (all kinds except `contains`); same reason imports-only is insufficient.
     */
    getDependencyFilePaths(filePath: string): string[];
    /**
     * Cross-file edges whose TARGET is a node in `filePath` and whose SOURCE is a
     * node in a *different* file, paired with the target node's (name, kind) so a
     * caller can re-resolve the edge to the re-indexed target's new ID (node IDs
     * are `sha256(filePath:kind:name:line)`, so any line shift in the callee file
     * changes target IDs and a naive re-insert by old ID silently drops them).
     * Used by `storeExtractionResult` to preserve incoming edges across a file
     * re-index (issue #899). Same edge-kind rules as
     * {@link getDependentFilePaths}: all kinds except `contains`.
     */
    getCrossFileIncomingEdgesWithTarget(filePath: string): Array<Edge & {
        targetName: string;
        targetKind: NodeKind;
    }>;
    /**
     * Insert or update a file record
     */
    upsertFile(file: FileRecord): void;
    /**
     * Delete a file record and its nodes
     */
    deleteFile(filePath: string): void;
    /**
     * Get a file record by path
     */
    getFileByPath(filePath: string): FileRecord | null;
    /**
     * Get all tracked files
     */
    getAllFiles(): FileRecord[];
    /**
     * Most recent index timestamp (ms since epoch) across all tracked files, or
     * null when nothing is indexed yet. One indexed aggregate, no per-row scan. (#329)
     */
    getLastIndexedAt(): number | null;
    /**
     * Get files that need re-indexing (hash changed)
     */
    getStaleFiles(currentHashes: Map<string, string>): FileRecord[];
    /**
     * Insert an unresolved reference
     */
    insertUnresolvedRef(ref: UnresolvedReference): void;
    /**
     * Insert multiple unresolved references in a transaction
     */
    insertUnresolvedRefsBatch(refs: UnresolvedReference[]): void;
    /**
     * Delete unresolved references from a node
     */
    deleteUnresolvedByNode(nodeId: string): void;
    /**
     * Get unresolved references by name (for resolution)
     */
    getUnresolvedByName(name: string): UnresolvedReference[];
    /**
     * Get all unresolved references
     */
    getUnresolvedReferences(): UnresolvedReference[];
    /**
     * Get the count of unresolved references without loading them into memory
     */
    getUnresolvedReferencesCount(): number;
    /**
     * Get a batch of unresolved references using LIMIT/OFFSET pagination.
     * Used to process references in bounded memory chunks.
     */
    getUnresolvedReferencesBatch(offset: number, limit: number): UnresolvedReference[];
    /**
     * Get all tracked file paths (lightweight — no full FileRecord objects)
     */
    getAllFilePaths(): string[];
    /**
     * Get all distinct node names (lightweight — just name strings for pre-filtering)
     */
    getAllNodeNames(): string[];
    /**
     * Get unresolved references scoped to specific file paths.
     * Uses the idx_unresolved_file_path index for efficient lookup.
     */
    getUnresolvedReferencesByFiles(filePaths: string[]): UnresolvedReference[];
    /**
     * Delete all unresolved references (after resolution)
     */
    clearUnresolvedReferences(): void;
    /**
     * Delete resolved references by their IDs
     */
    deleteResolvedReferences(fromNodeIds: string[]): void;
    /**
     * Delete specific resolved references by (fromNodeId, referenceName, referenceKind) tuples.
     * More precise than deleteResolvedReferences — only removes refs that were actually resolved.
     */
    deleteSpecificResolvedReferences(refs: Array<{
        fromNodeId: string;
        referenceName: string;
        referenceKind: string;
    }>): void;
    /**
     * Lightweight (nodes, edges) count snapshot. Used around an index/sync
     * run to compute true additions across extraction + resolution +
     * synthesis — the per-phase counter in the orchestrator only sees
     * extraction's contribution, which is why the CLI summary under-reported
     * the edge count (resolution + synthesizer edges were invisible).
     */
    getNodeAndEdgeCount(): {
        nodes: number;
        edges: number;
    };
    /**
     * Get graph statistics
     */
    getStats(): GraphStats;
    /**
     * Get a metadata value by key
     */
    getMetadata(key: string): string | null;
    /**
     * Set a metadata key-value pair (upsert)
     */
    setMetadata(key: string, value: string): void;
    /**
     * Get all metadata as a key-value record
     */
    getAllMetadata(): Record<string, string>;
    /**
     * Clear all data from the database
     */
    clear(): void;
}
//# sourceMappingURL=queries.d.ts.map