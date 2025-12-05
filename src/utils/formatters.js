/**
 * Format currency with K/M abbreviations for large numbers
 * @param {number} value - The number to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, options = {}) => {
  const {
    showFull = false,
    decimals = 1,
    showSign = false,
    abbreviate = true,
  } = options;

  // Handle null/undefined
  if (value === null || value === undefined || isNaN(value)) {
    return '$0';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : (showSign && value > 0 ? '+' : '');

  // Show full number if requested
  if (showFull || !abbreviate) {
    return `${sign}$${absValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }

  // Format with K/M abbreviations
  if (absValue >= 1000000) {
    return `${sign}$${(absValue / 1000000).toFixed(decimals)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(decimals === 0 ? 0 : 1)}K`;
  }
  return `${sign}$${absValue.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

/**
 * Format percentage with proper decimals
 * @param {number} value - The percentage value
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format number with proper thousands separators
 * @param {number} value - The number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString('en-US');
};
