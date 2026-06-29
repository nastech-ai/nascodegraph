/**
 * Foundation Tests
 *
 * Tests for the NasCodeGraph foundation layer.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NasCodeGraph } from '../src';
import { Node, Edge } from '../src/types';
import { isInitialized, getNasCodeGraphDir, validateDirectory, codeGraphDirName, isNasCodeGraphDataDir } from '../src/directory';
import { DatabaseConnection, getDatabasePath } from '../src/db';

// Create a temporary directory for each test
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nascodegraph-test-'));
}

// Clean up temporary directory
function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('NasCodeGraph Foundation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Initialization', () => {
    it('should initialize a new project', () => {
      const cg = NasCodeGraph.initSync(tempDir);

      expect(NasCodeGraph.isInitialized(tempDir)).toBe(true);
      expect(fs.existsSync(getNasCodeGraphDir(tempDir))).toBe(true);
      expect(fs.existsSync(getDatabasePath(tempDir))).toBe(true);

      cg.close();
    });

    it('should create .gitignore in .NasCodeGraph directory', () => {
      const cg = NasCodeGraph.initSync(tempDir);

      const gitignorePath = path.join(getNasCodeGraphDir(tempDir), '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);

      const content = fs.readFileSync(gitignorePath, 'utf-8');
      // Ignore everything in .nascodegraph/ except this file itself, so transient
      // files (db, daemon.pid, sockets, logs) never show up in git. (#492, #484)
      expect(content).toContain('*');
      expect(content).toContain('!.gitignore');

      cg.close();
    });

    it('should throw if already initialized', () => {
      const cg = NasCodeGraph.initSync(tempDir);
      cg.close();

      expect(() => NasCodeGraph.initSync(tempDir)).toThrow(/already initialized/i);
    });
  });

  describe('Opening Projects', () => {
    it('should open an existing project', () => {
      // First initialize
      const cg1 = NasCodeGraph.initSync(tempDir);
      cg1.close();

      // Then open
      const cg2 = NasCodeGraph.openSync(tempDir);
      expect(cg2.getProjectRoot()).toBe(path.resolve(tempDir));
      cg2.close();
    });

    it('should throw if not initialized', () => {
      expect(() => NasCodeGraph.openSync(tempDir)).toThrow(/not initialized/i);
    });
  });

  describe('Static Methods', () => {
    it('isInitialized should return false for new directory', () => {
      expect(NasCodeGraph.isInitialized(tempDir)).toBe(false);
    });

    it('isInitialized should return true after init', () => {
      const cg = NasCodeGraph.initSync(tempDir);
      expect(NasCodeGraph.isInitialized(tempDir)).toBe(true);
      cg.close();
    });
  });

  describe('Database', () => {
    it('should create database with correct schema', () => {
      const cg = NasCodeGraph.initSync(tempDir);

      // Check that we can get stats (requires tables to exist)
      const stats = cg.getStats();
      expect(stats.nodeCount).toBe(0);
      expect(stats.edgeCount).toBe(0);
      expect(stats.fileCount).toBe(0);

      cg.close();
    });

    it('should return correct database size', () => {
      const cg = NasCodeGraph.initSync(tempDir);
      const stats = cg.getStats();

      // Database should have some size (at least the schema)
      expect(stats.dbSizeBytes).toBeGreaterThan(0);

      cg.close();
    });

    it('should support optimize operation', () => {
      const cg = NasCodeGraph.initSync(tempDir);

      // Should not throw
      expect(() => cg.optimize()).not.toThrow();

      cg.close();
    });

    it('should support clear operation', () => {
      const cg = NasCodeGraph.initSync(tempDir);

      // Should not throw
      expect(() => cg.clear()).not.toThrow();

      const stats = cg.getStats();
      expect(stats.nodeCount).toBe(0);

      cg.close();
    });
  });

  describe('Directory Management', () => {
    it('should validate directory structure', () => {
      const cg = NasCodeGraph.initSync(tempDir);
      cg.close();

      const validation = validateDirectory(tempDir);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid directory', () => {
      const validation = validateDirectory(tempDir);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('upgrades a stale pre-wildcard .gitignore in place (issue #788)', () => {
      const cg = NasCodeGraph.initSync(tempDir);
      cg.close();

      const gitignorePath = path.join(getNasCodeGraphDir(tempDir), '.gitignore');
      // A .gitignore written by an older version (<= 0.9.9): an explicit
      // allowlist that never ignored daemon.pid, so the daemon's runtime
      // pidfile got committed.
      const staleV099 =
        '# NasCodeGraph data files\n' +
        '# These are local to each machine and should not be committed\n\n' +
        '# Database\n*.db\n*.db-wal\n*.db-shm\n\n' +
        '# Cache\ncache/\n\n# Logs\n*.log\n\n# Hook markers\n.dirty\n';
      fs.writeFileSync(gitignorePath, staleV099, 'utf-8');

      // Opening the project runs validateDirectory, which self-heals.
      const cg2 = NasCodeGraph.openSync(tempDir);
      cg2.close();

      const upgraded = fs.readFileSync(gitignorePath, 'utf-8');
      expect(upgraded).toContain('\n*\n'); // wildcard ignores everything…
      expect(upgraded).toContain('!.gitignore'); // …except this file
      expect(upgraded).not.toContain('.dirty'); // old explicit list is gone
    });

    it('leaves a user-customized .nascodegraph/.gitignore untouched', () => {
      const cg = NasCodeGraph.initSync(tempDir);
      cg.close();

      const gitignorePath = path.join(getNasCodeGraphDir(tempDir), '.gitignore');
      // No NasCodeGraph header → user-authored → must not be rewritten.
      const custom = '# my own rules\n*.db\n!keep-this.json\n';
      fs.writeFileSync(gitignorePath, custom, 'utf-8');

      const cg2 = NasCodeGraph.openSync(tempDir);
      cg2.close();

      expect(fs.readFileSync(gitignorePath, 'utf-8')).toBe(custom);
    });
  });

  describe('Uninitialize', () => {
    it('should remove .NasCodeGraph directory', () => {
      const cg = NasCodeGraph.initSync(tempDir);

      cg.uninitialize();

      expect(fs.existsSync(getNasCodeGraphDir(tempDir))).toBe(false);
      expect(NasCodeGraph.isInitialized(tempDir)).toBe(false);
    });
  });

  describe('Close/Destroy', () => {
    it('should close database but keep .NasCodeGraph directory', () => {
      const cg = NasCodeGraph.initSync(tempDir);

      cg.destroy(); // destroy is alias for close

      expect(fs.existsSync(getNasCodeGraphDir(tempDir))).toBe(true);
      expect(NasCodeGraph.isInitialized(tempDir)).toBe(true);
    });
  });

  describe('Graph Query Methods', () => {
    it('should throw "Node not found" for non-existent nodes', () => {
      const cg = NasCodeGraph.initSync(tempDir);

      // getContext throws for non-existent nodes
      expect(() => cg.getContext('non-existent')).toThrow(/not found/i);

      cg.close();
    });

    it('should return empty results for non-existent nodes', () => {
      const cg = NasCodeGraph.initSync(tempDir);

      // These methods return empty results instead of throwing
      const traverseResult = cg.traverse('non-existent');
      expect(traverseResult.nodes.size).toBe(0);

      const callGraph = cg.getCallGraph('non-existent');
      expect(callGraph.nodes.size).toBe(0);

      const typeHierarchy = cg.getTypeHierarchy('non-existent');
      expect(typeHierarchy.nodes.size).toBe(0);

      const usages = cg.findUsages('non-existent');
      expect(usages.length).toBe(0);

      cg.close();
    });

  });
});

describe('Database Connection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should initialize new database', () => {
    const dbPath = path.join(tempDir, 'test.db');
    const db = DatabaseConnection.initialize(dbPath);

    expect(db.isOpen()).toBe(true);
    expect(fs.existsSync(dbPath)).toBe(true);

    db.close();
  });

  it('should get schema version', () => {
    const dbPath = path.join(tempDir, 'test.db');
    const db = DatabaseConnection.initialize(dbPath);

    const version = db.getSchemaVersion();
    expect(version).not.toBeNull();
    expect(version?.version).toBe(6);

    db.close();
  });

  it('should support transactions', () => {
    const dbPath = path.join(tempDir, 'test.db');
    const db = DatabaseConnection.initialize(dbPath);

    const result = db.transaction(() => {
      return 42;
    });

    expect(result).toBe(42);

    db.close();
  });

  it('should throw when opening non-existent database', () => {
    const dbPath = path.join(tempDir, 'nonexistent.db');

    expect(() => DatabaseConnection.open(dbPath)).toThrow(/not found/i);
  });
});

describe('Query Builder', () => {
  let tempDir: string;
  let cg: NasCodeGraph;

  beforeEach(() => {
    tempDir = createTempDir();
    cg = NasCodeGraph.initSync(tempDir);
  });

  afterEach(() => {
    cg.close();
    cleanupTempDir(tempDir);
  });

  it('should return null for non-existent node', () => {
    const node = cg.getNode('nonexistent');
    expect(node).toBeNull();
  });

  it('should return empty array for nodes in non-existent file', () => {
    const nodes = cg.getNodesInFile('nonexistent.ts');
    expect(nodes).toEqual([]);
  });

  it('should return empty array for edges from non-existent node', () => {
    const edges = cg.getOutgoingEdges('nonexistent');
    expect(edges).toEqual([]);
  });

  it('should return null for non-existent file', () => {
    const file = cg.getFile('nonexistent.ts');
    expect(file).toBeNull();
  });

  it('should return empty array for files when none tracked', () => {
    const files = cg.getFiles();
    expect(files).toEqual([]);
  });
});

// Two environments that share one working tree (Windows-native + WSL) must not
// share one `.nascodegraph/`. NASTECHGRAPH_DIR overrides the data directory name so
// each side keeps its own index in the same tree (issue #636).
describe('NASTECHGRAPH_DIR override (#636)', () => {
  const saved = process.env.NASTECHGRAPH_DIR;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nascodegraph-dirname-'));
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.NASTECHGRAPH_DIR;
    else process.env.NASTECHGRAPH_DIR = saved;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('codeGraphDirName()', () => {
    it('defaults to .nascodegraph when unset', () => {
      delete process.env.NASTECHGRAPH_DIR;
      expect(codeGraphDirName()).toBe('.nascodegraph');
    });

    it('honors a valid override', () => {
      process.env.NASTECHGRAPH_DIR = '.nascodegraph-win';
      expect(codeGraphDirName()).toBe('.nascodegraph-win');
    });

    // Anything that isn't a plain segment could escape the project root or
    // clobber it, so it's ignored in favor of the default.
    it.each(['foo/bar', 'a\\b', '..', '../x', '.', '/abs/path', '   ', ''])(
      'falls back to .nascodegraph for invalid value %j',
      (bad) => {
        process.env.NASTECHGRAPH_DIR = bad;
        expect(codeGraphDirName()).toBe('.nascodegraph');
      }
    );
  });

  describe('isNasCodeGraphDataDir()', () => {
    it('matches the default, the active override, and .nascodegraph-* siblings', () => {
      process.env.NASTECHGRAPH_DIR = '.nascodegraph-win';
      expect(isNasCodeGraphDataDir('.nascodegraph')).toBe(true);       // the other env's dir
      expect(isNasCodeGraphDataDir('.nascodegraph-win')).toBe(true);   // active override
      expect(isNasCodeGraphDataDir('.nascodegraph-wsl')).toBe(true);   // any sibling
    });

    it('does not match unrelated directories', () => {
      delete process.env.NASTECHGRAPH_DIR;
      for (const name of ['src', 'node_modules', '.git', 'nascodegraph', '.nascodegraphextra']) {
        expect(isNasCodeGraphDataDir(name)).toBe(false);
      }
    });
  });

  it('init writes the index under the overridden directory, not .nascodegraph', () => {
    process.env.NASTECHGRAPH_DIR = '.nascodegraph-win';
    const cg = NasCodeGraph.initSync(tempDir);
    try {
      expect(fs.existsSync(path.join(tempDir, '.nascodegraph-win', 'nascodegraph.db'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.nascodegraph'))).toBe(false);
      expect(getNasCodeGraphDir(tempDir)).toBe(path.join(tempDir, '.nascodegraph-win'));
      expect(NasCodeGraph.isInitialized(tempDir)).toBe(true);
    } finally {
      cg.close();
    }
  });

  it('two index dirs coexist in one tree and the override side skips the sibling', async () => {
    // WSL side: default `.nascodegraph`, with a source file.
    delete process.env.NASTECHGRAPH_DIR;
    fs.writeFileSync(path.join(tempDir, 'app.ts'), 'export function onlyReal() {}\n');
    const wsl = await NasCodeGraph.init(tempDir, { index: true });
    wsl.close();

    // Windows side: override dir, same tree. Plant a decoy source file INSIDE
    // the WSL data dir — the override-side index must not pick it up.
    process.env.NASTECHGRAPH_DIR = '.nascodegraph-win';
    fs.writeFileSync(path.join(tempDir, '.nascodegraph', 'decoy.ts'), 'export function decoyLeak() {}\n');
    const win = await NasCodeGraph.init(tempDir, { index: true });
    try {
      expect(fs.existsSync(path.join(tempDir, '.nascodegraph', 'nascodegraph.db'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.nascodegraph-win', 'nascodegraph.db'))).toBe(true);
      expect(win.searchNodes('onlyReal').length).toBeGreaterThan(0);
      expect(win.searchNodes('decoyLeak')).toEqual([]); // sibling data dir not indexed
    } finally {
      win.close();
    }
  });
});
