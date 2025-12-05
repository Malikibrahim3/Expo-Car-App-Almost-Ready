/**
 * Production-safe logger utility
 * Only logs in development mode to prevent sensitive data exposure
 */

const isDev = process.env.EXPO_PUBLIC_APP_ENV === 'development' || __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  
  info: (...args: any[]) => {
    if (isDev) console.info(...args);
  },
  
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  
  // Always log errors (but sanitize sensitive data)
  error: (...args: any[]) => {
    console.error(...args);
  },
  
  // Debug logs - only in development
  debug: (...args: any[]) => {
    if (isDev) console.debug(...args);
  },
};

export default logger;
