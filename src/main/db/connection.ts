import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { logger } from '../utils/logger'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Database: WasmDatabase } = require('node-sqlite3-wasm')

/**
 * Thin better-sqlite3-compatible shim around node-sqlite3-wasm.
 * Exposes db.prepare(sql).all(...args), .get(...args), .run(...args)
 * and db.exec(sql) and db.transaction(fn)().
 *
 * node-sqlite3-wasm uses: db.all(sql, valuesArray), db.get(sql, valuesArray), db.run(sql, valuesArray)
 * better-sqlite3 uses:    db.prepare(sql).all(...args), .get(...args), .run(...args)
 */
class CompatibleDb {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private inner: any

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(inner: any) {
        this.inner = inner
    }

    exec(sql: string): void {
        this.inner.exec(sql)
    }

    prepare(sql: string) {
        const inner = this.inner
        return {
            // better-sqlite3: .all(...args) where args are spread positional
            all(...args: unknown[]) {
                const values = args.length === 1 && Array.isArray(args[0]) ? args[0] : args
                try {
                    return inner.all(sql, values.length === 0 ? undefined : values)
                } catch (e) {
                    logger.error(`SQL error in all(): ${sql}\n${e}`)
                    return []
                }
            },
            // better-sqlite3: .get(...args)
            get(...args: unknown[]) {
                const values = args.length === 1 && Array.isArray(args[0]) ? args[0] : args
                try {
                    return inner.get(sql, values.length === 0 ? undefined : values)
                } catch (e) {
                    logger.error(`SQL error in get(): ${sql}\n${e}`)
                    return undefined
                }
            },
            // better-sqlite3: .run(...args)
            run(...args: unknown[]) {
                const values = args.length === 1 && Array.isArray(args[0]) ? args[0] : args
                try {
                    return inner.run(sql, values.length === 0 ? undefined : values)
                } catch (e) {
                    logger.error(`SQL error in run(): ${sql}\n${e}`)
                    return { changes: 0, lastInsertRowid: 0 }
                }
            }
        }
    }

    // Minimal transaction support - node-sqlite3-wasm doesn't have .transaction()
    transaction(fn: () => void): () => void {
        return () => {
            this.inner.exec('BEGIN')
            try {
                fn()
                this.inner.exec('COMMIT')
            } catch (e) {
                this.inner.exec('ROLLBACK')
                throw e
            }
        }
    }
}

let db: CompatibleDb | null = null

export function initDatabase(): CompatibleDb {
    const userDataPath = app.getPath('userData')
    const dbDir = join(userDataPath, 'db')

    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
    }

    const dbPath = join(dbDir, 'studio.sqlite')
    logger.info(`Opening database at: ${dbPath}`)

    const wasmDb = new WasmDatabase(dbPath)
    db = new CompatibleDb(wasmDb)

    db.exec('PRAGMA journal_mode = WAL')
    db.exec('PRAGMA synchronous = NORMAL')
    db.exec('PRAGMA foreign_keys = ON')
    db.exec('PRAGMA cache_size = -20000')

    logger.info('Database initialized successfully')
    return db
}

export function getDb(): CompatibleDb {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.')
    }
    return db
}
