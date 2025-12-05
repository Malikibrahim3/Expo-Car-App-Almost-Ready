/**
 * Date Utility Functions
 * Provides precise date calculations for the application
 */

/**
 * Get the current date and time
 * @returns {Date} Current date
 */
export const getCurrentDate = () => {
  return new Date();
};

/**
 * Calculate exact age in years from a date
 * @param {string|Date} date - The date to calculate age from
 * @returns {number} Age in years (with decimal precision)
 */
export const calculateAgeInYears = (date) => {
  const now = getCurrentDate();
  const startDate = new Date(date);
  
  // Calculate difference in milliseconds
  const diffMs = now - startDate;
  
  // Convert to years (accounting for leap years)
  const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
  const ageInYears = diffMs / msPerYear;
  
  return ageInYears;
};

/**
 * Calculate exact age in months from a date
 * @param {string|Date} date - The date to calculate age from
 * @returns {number} Age in months
 */
export const calculateAgeInMonths = (date) => {
  const now = getCurrentDate();
  const startDate = new Date(date);
  
  const yearsDiff = now.getFullYear() - startDate.getFullYear();
  const monthsDiff = now.getMonth() - startDate.getMonth();
  const daysDiff = now.getDate() - startDate.getDate();
  
  let totalMonths = yearsDiff * 12 + monthsDiff;
  
  // If we haven't reached the same day of the month yet, subtract one month
  if (daysDiff < 0) {
    totalMonths -= 1;
  }
  
  return totalMonths;
};

/**
 * Calculate exact age in days from a date
 * @param {string|Date} date - The date to calculate age from
 * @returns {number} Age in days
 */
export const calculateAgeInDays = (date) => {
  const now = getCurrentDate();
  const startDate = new Date(date);
  
  const diffMs = now - startDate;
  const msPerDay = 1000 * 60 * 60 * 24;
  
  return Math.floor(diffMs / msPerDay);
};

/**
 * Format age in a human-readable way
 * @param {string|Date} date - The date to calculate age from
 * @returns {string} Formatted age string (e.g., "10 months", "2 years 3 months")
 */
export const formatAge = (date) => {
  const months = calculateAgeInMonths(date);
  
  if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  }
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
  
  return `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
};

/**
 * Format age in years with decimal precision
 * @param {string|Date} date - The date to calculate age from
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted age (e.g., "0.83 years", "2.25 years")
 */
export const formatAgeInYears = (date, decimals = 2) => {
  const ageInYears = calculateAgeInYears(date);
  return `${ageInYears.toFixed(decimals)} year${ageInYears !== 1 ? 's' : ''}`;
};

/**
 * Get a detailed age breakdown
 * @param {string|Date} date - The date to calculate age from
 * @returns {Object} Object with years, months, days, totalMonths, totalDays, exactYears
 */
export const getAgeBreakdown = (date) => {
  const now = getCurrentDate();
  const startDate = new Date(date);
  
  const totalMonths = calculateAgeInMonths(date);
  const totalDays = calculateAgeInDays(date);
  const exactYears = calculateAgeInYears(date);
  
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  
  // Calculate remaining days in current month
  const lastMonthDate = new Date(now);
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const daysSinceLastMonth = Math.floor((now - lastMonthDate) / (1000 * 60 * 60 * 24));
  
  return {
    years,
    months,
    days: daysSinceLastMonth,
    totalMonths,
    totalDays,
    exactYears,
    formatted: formatAge(date),
    formattedYears: formatAgeInYears(date),
  };
};

/**
 * Check if a date is in the future
 * @param {string|Date} date - The date to check
 * @returns {boolean} True if date is in the future
 */
export const isFutureDate = (date) => {
  return new Date(date) > getCurrentDate();
};

/**
 * Check if a date is in the past
 * @param {string|Date} date - The date to check
 * @returns {boolean} True if date is in the past
 */
export const isPastDate = (date) => {
  return new Date(date) < getCurrentDate();
};

/**
 * Format a date for display
 * @param {string|Date} date - The date to format
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, locale = 'en-US') => {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format a date for display (short version)
 * @param {string|Date} date - The date to format
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted date string
 */
export const formatDateShort = (date, locale = 'en-US') => {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Get current timestamp for logging/debugging
 * @returns {string} ISO timestamp
 */
export const getCurrentTimestamp = () => {
  return getCurrentDate().toISOString();
};

/**
 * Calculate time elapsed since a date in human-readable format
 * @param {string|Date} date - The date to calculate from
 * @returns {string} Human-readable time elapsed (e.g., "2 hours ago", "3 days ago")
 */
export const getTimeElapsed = (date) => {
  const now = getCurrentDate();
  const startDate = new Date(date);
  const diffMs = now - startDate;
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (years > 0) return `${years} year${years !== 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months !== 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  return 'just now';
};

export default {
  getCurrentDate,
  calculateAgeInYears,
  calculateAgeInMonths,
  calculateAgeInDays,
  formatAge,
  formatAgeInYears,
  getAgeBreakdown,
  isFutureDate,
  isPastDate,
  formatDate,
  formatDateShort,
  getCurrentTimestamp,
  getTimeElapsed,
};
