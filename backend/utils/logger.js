const winston = require('winston');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston to add colors
winston.addColors(colors);

// Custom format for logging
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => {
      // Format the message
      let message = `${info.timestamp} ${info.level}: ${info.message}`;
      
      // Add additional metadata if available
      if (info.error) {
        message += ` | ${info.error}`;
      }
      
      if (info.data) {
        try {
          message += ` | ${JSON.stringify(info.data)}`;
        } catch (e) {
          message += ` | [Data could not be stringified]`;
        }
      }
      
      return message;
    }
  )
);

// Create custom transports for production and development
const transports = [
  // Always write to console
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      format
    )
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  // Don't exit on errors
  exitOnError: false,
});

// Safe logging wrapper that won't crash the application
const safeLogger = {
  error: (message, meta = {}) => {
    try {
      logger.error(message, meta);
    } catch (e) {
      console.error('Logger error:', e.message);
      console.error('Original message:', message);
    }
  },
  warn: (message, meta = {}) => {
    try {
      logger.warn(message, meta);
    } catch (e) {
      console.warn('Logger warning:', e.message);
      console.warn('Original message:', message);
    }
  },
  info: (message, meta = {}) => {
    try {
      logger.info(message, meta);
    } catch (e) {
      console.info('Logger info error:', e.message);
      console.info('Original message:', message);
    }
  },
  http: (message, meta = {}) => {
    try {
      logger.http(message, meta);
    } catch (e) {
      console.log('Logger http error:', e.message);
      console.log('Original message:', message);
    }
  },
  debug: (message, meta = {}) => {
    try {
      logger.debug(message, meta);
    } catch (e) {
      console.debug('Logger debug error:', e.message);
      console.debug('Original message:', message);
    }
  }
};

module.exports = safeLogger;
