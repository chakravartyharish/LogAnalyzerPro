
export enum LogLevel {
    debug = 0,
    info,
    warning,
    error,
    none
}


interface LogFunction { (message?: any): void }


class Logger {

    logFunctions: LogFunction[] = []

    get debug(): LogFunction { return this.logFunctions[LogLevel.debug] }
    get info(): LogFunction { return this.logFunctions[LogLevel.info] }
    get warning(): LogFunction { return this.logFunctions[LogLevel.warning] }
    get error(): LogFunction { return this.logFunctions[LogLevel.error] }

    constructor(logLevel: LogLevel = LogLevel.info) {
        this.setLogLevel(logLevel)
    }

    setLogLevel(setLogLevel: LogLevel) {
        [LogLevel.debug, LogLevel.info, LogLevel.warning, LogLevel.error].forEach((logLevel: LogLevel) => {
            let logFunction: LogFunction
            if (logLevel < setLogLevel) {
                logFunction = function() {}
            } else {
                logFunction = console.log.bind(console, `${LogLevel[logLevel].toUpperCase()} -`)
            }
            this.logFunctions[logLevel] = logFunction
        })
    }
}


export const logger = new Logger(process.env.NODE_ENV === 'development' ? LogLevel.debug : LogLevel.info)