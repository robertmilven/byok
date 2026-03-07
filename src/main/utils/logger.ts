import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { app } from 'electron'
import { join } from 'path'

let loggerInstance: winston.Logger | null = null

// Fallback to console for early startup (before app is ready)
const fallback = console

export function initLogger(): void {
    const userDataPath = app.getPath('userData')
    const logsDir = join(userDataPath, 'logs')

    loggerInstance = winston.createLogger({
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
            winston.format.errors({ stack: true }),
            winston.format.json()
        ),
        transports: [
            // Console transport for dev
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            }),
            // Rotating file transport
            new DailyRotateFile({
                dirname: logsDir,
                filename: 'byok-studio-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                maxFiles: '14d',
                maxSize: '20m',
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json()
                )
            })
        ]
    })
}

// Proxy logger — falls back to console if logger not yet initialized
export const logger = new Proxy({} as winston.Logger, {
    get(_target, prop: string) {
        if (loggerInstance) {
            return (loggerInstance as unknown as Record<string, unknown>)[prop]
        }
        // Fallback to console methods
        if (prop === 'info') return fallback.info.bind(fallback)
        if (prop === 'error') return fallback.error.bind(fallback)
        if (prop === 'warn') return fallback.warn.bind(fallback)
        if (prop === 'debug') return fallback.debug.bind(fallback)
        return () => { }
    }
})
