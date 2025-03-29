/**
 * Simple logger utility for consistent logging throughout the application
 * In production, this could be replaced with a more robust logging solution
 */
const logger = {
  /**
   * Log debug information
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  debug: (message, data = {}) => {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_LOGS === 'true') {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
  
  /**
   * Log informational message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  info: (message, data = {}) => {
    console.log(`[INFO] ${message}`, data);
  },
  
  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  warn: (message, data = {}) => {
    console.warn(`[WARN] ${message}`, data);
  },
  
  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  error: (message, data = {}) => {
    console.error(`[ERROR] ${message}`, data);
  }
};

module.exports = logger;