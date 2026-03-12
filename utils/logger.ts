type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
   debug: 0,
   info: 1,
   warn: 2,
   error: 3,
};

const getMinLevel = (): LogLevel => {
   const env = process.env.LOG_LEVEL as LogLevel | undefined;
   if (env && env in LOG_LEVELS) return env;
   return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
};

const shouldLog = (level: LogLevel): boolean => LOG_LEVELS[level] >= LOG_LEVELS[getMinLevel()];

const timestamp = (): string => new Date().toISOString();

const formatArgs = (args: unknown[]): string => {
   return args.map((a) => {
      if (a instanceof Error) return `${a.message}\n${a.stack || ''}`;
      if (typeof a === 'object' && a !== null) {
         try { return JSON.stringify(a); } catch { return String(a); }
      }
      return String(a);
   }).join(' ');
};

const log = (level: LogLevel, message: string, ...args: unknown[]): void => {
   if (!shouldLog(level)) return;
   const prefix = `${timestamp()} [${level.toUpperCase()}]`;
   const suffix = args.length > 0 ? ` ${formatArgs(args)}` : '';
   const output = `${prefix} ${message}${suffix}`;

   switch (level) {
      case 'error':
         // eslint-disable-next-line no-console
         console.error(output);
         break;
      case 'warn':
         // eslint-disable-next-line no-console
         console.warn(output);
         break;
      default:
         // eslint-disable-next-line no-console
         console.log(output);
         break;
   }
};

const logger = {
   debug: (message: string, ...args: unknown[]) => log('debug', message, ...args),
   info: (message: string, ...args: unknown[]) => log('info', message, ...args),
   warn: (message: string, ...args: unknown[]) => log('warn', message, ...args),
   error: (message: string, ...args: unknown[]) => log('error', message, ...args),
};

export default logger;
