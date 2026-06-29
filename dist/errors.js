"use strict";
/**
 * NasCodeGraph Error Classes
 *
 * Custom error types for better error handling and debugging.
 *
 * @module errors
 *
 * @example
 * ```typescript
 * import { FileError, ParseError, setLogger, silentLogger } from 'nascodegraph';
 *
 * // Catch specific error types
 * try {
 *   await cg.indexAll();
 * } catch (error) {
 *   if (error instanceof FileError) {
 *     console.log(`File error at ${error.filePath}: ${error.message}`);
 *   } else if (error instanceof ParseError) {
 *     console.log(`Parse error at ${error.filePath}:${error.line}`);
 *   }
 * }
 *
 * // Disable logging for tests
 * setLogger(silentLogger);
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.silentLogger = exports.defaultLogger = exports.ConfigError = exports.VectorError = exports.SearchError = exports.DatabaseError = exports.ParseError = exports.FileError = exports.NasCodeGraphError = void 0;
exports.setLogger = setLogger;
exports.getLogger = getLogger;
exports.logDebug = logDebug;
exports.logWarn = logWarn;
exports.logError = logError;
/**
 * Base error class for all NasCodeGraph errors.
 *
 * All NasCodeGraph-specific errors extend this class, allowing you to catch
 * all NasCodeGraph errors with a single catch block.
 *
 * @example
 * ```typescript
 * try {
 *   await cg.indexAll();
 * } catch (error) {
 *   if (error instanceof NasCodeGraphError) {
 *     console.log(`NasCodeGraph error [${error.code}]: ${error.message}`);
 *   }
 * }
 * ```
 */
class NasCodeGraphError extends Error {
    /** Error code for categorization (e.g., 'FILE_ERROR', 'PARSE_ERROR') */
    code;
    /** Additional context about the error */
    context;
    constructor(message, code, context) {
        super(message);
        this.name = 'NasCodeGraphError';
        this.code = code;
        this.context = context;
        // Maintain proper stack trace for V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
exports.NasCodeGraphError = NasCodeGraphError;
/**
 * Error reading or accessing files
 */
class FileError extends NasCodeGraphError {
    filePath;
    constructor(message, filePath, cause) {
        super(message, 'FILE_ERROR', { filePath, cause: cause?.message });
        this.name = 'FileError';
        this.filePath = filePath;
        if (cause) {
            this.cause = cause;
        }
    }
}
exports.FileError = FileError;
/**
 * Error parsing source code
 */
class ParseError extends NasCodeGraphError {
    filePath;
    line;
    column;
    constructor(message, filePath, options) {
        super(message, 'PARSE_ERROR', {
            filePath,
            line: options?.line,
            column: options?.column,
            cause: options?.cause?.message,
        });
        this.name = 'ParseError';
        this.filePath = filePath;
        this.line = options?.line;
        this.column = options?.column;
        if (options?.cause) {
            this.cause = options.cause;
        }
    }
}
exports.ParseError = ParseError;
/**
 * Error with database operations
 */
class DatabaseError extends NasCodeGraphError {
    operation;
    constructor(message, operation, cause) {
        super(message, 'DATABASE_ERROR', { operation, cause: cause?.message });
        this.name = 'DatabaseError';
        this.operation = operation;
        if (cause) {
            this.cause = cause;
        }
    }
}
exports.DatabaseError = DatabaseError;
/**
 * Error with search operations
 */
class SearchError extends NasCodeGraphError {
    query;
    constructor(message, query, cause) {
        super(message, 'SEARCH_ERROR', { query, cause: cause?.message });
        this.name = 'SearchError';
        this.query = query;
        if (cause) {
            this.cause = cause;
        }
    }
}
exports.SearchError = SearchError;
/**
 * Error with vector/embedding operations
 */
class VectorError extends NasCodeGraphError {
    constructor(message, operation, cause) {
        super(message, 'VECTOR_ERROR', { operation, cause: cause?.message });
        this.name = 'VectorError';
        if (cause) {
            this.cause = cause;
        }
    }
}
exports.VectorError = VectorError;
/**
 * Error with configuration
 */
class ConfigError extends NasCodeGraphError {
    constructor(message, details) {
        super(message, 'CONFIG_ERROR', details);
        this.name = 'ConfigError';
    }
}
exports.ConfigError = ConfigError;
/**
 * Default console-based logger
 */
exports.defaultLogger = {
    debug(message, context) {
        if (process.env.NASTECHGRAPH_DEBUG) {
            console.debug(`[NasCodeGraph] ${message}`, context ?? '');
        }
    },
    warn(message, context) {
        console.warn(`[NasCodeGraph] ${message}`, context ?? '');
    },
    error(message, context) {
        console.error(`[NasCodeGraph] ${message}`, context ?? '');
    },
};
/**
 * Silent logger (no output) - useful for tests
 */
exports.silentLogger = {
    debug() { },
    warn() { },
    error() { },
};
/**
 * Current logger instance (can be replaced)
 */
let currentLogger = exports.defaultLogger;
/**
 * Set the global logger
 */
function setLogger(logger) {
    currentLogger = logger;
}
/**
 * Get the current logger
 */
function getLogger() {
    return currentLogger;
}
/**
 * Log a debug message
 */
function logDebug(message, context) {
    currentLogger.debug(message, context);
}
/**
 * Log a warning message
 */
function logWarn(message, context) {
    currentLogger.warn(message, context);
}
/**
 * Log an error message
 */
function logError(message, context) {
    currentLogger.error(message, context);
}
//# sourceMappingURL=errors.js.map