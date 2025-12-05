/**
 * Input Validation Utilities
 * Provides sanitization and validation for user inputs
 */

// Email validation regex (RFC 5322 compliant)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: any;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email?.trim().toLowerCase();
  
  if (!trimmed) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (trimmed.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }
  
  if (!EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true, sanitizedValue: trimmed };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must include at least one capital letter' };
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, error: 'Password must include at least one special character' };
  }
  
  return { isValid: true };
}

/**
 * Validate mileage input
 */
export function validateMileage(value: string | number): ValidationResult {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Mileage must be a number' };
  }
  
  if (num < 0) {
    return { isValid: false, error: 'Mileage cannot be negative' };
  }
  
  if (num > 1000000) {
    return { isValid: false, error: 'Mileage seems too high. Please check the value.' };
  }
  
  return { isValid: true, sanitizedValue: Math.round(num) };
}

/**
 * Validate monetary amount
 */
export function validateMoneyAmount(value: string | number, fieldName: string = 'Amount'): ValidationResult {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a number` };
  }
  
  if (num < 0) {
    return { isValid: false, error: `${fieldName} cannot be negative` };
  }
  
  if (num > 10000000) {
    return { isValid: false, error: `${fieldName} seems too high. Please check the value.` };
  }
  
  // Round to 2 decimal places
  return { isValid: true, sanitizedValue: Math.round(num * 100) / 100 };
}

/**
 * Validate interest rate
 */
export function validateInterestRate(value: string | number): ValidationResult {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Interest rate must be a number' };
  }
  
  if (num < 0) {
    return { isValid: false, error: 'Interest rate cannot be negative' };
  }
  
  if (num > 50) {
    return { isValid: false, error: 'Interest rate seems too high. Please enter a percentage (e.g., 5.9)' };
  }
  
  // Round to 2 decimal places
  return { isValid: true, sanitizedValue: Math.round(num * 100) / 100 };
}

/**
 * Validate year
 */
export function validateYear(value: string | number): ValidationResult {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  const currentYear = new Date().getFullYear();
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Year must be a number' };
  }
  
  if (num < 1900) {
    return { isValid: false, error: 'Year must be 1900 or later' };
  }
  
  if (num > currentYear + 2) {
    return { isValid: false, error: `Year cannot be more than ${currentYear + 2}` };
  }
  
  return { isValid: true, sanitizedValue: num };
}

/**
 * Validate loan term (months)
 */
export function validateLoanTerm(value: string | number): ValidationResult {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Loan term must be a number' };
  }
  
  if (num < 0) {
    return { isValid: false, error: 'Loan term cannot be negative' };
  }
  
  if (num > 120) {
    return { isValid: false, error: 'Loan term cannot exceed 120 months (10 years)' };
  }
  
  return { isValid: true, sanitizedValue: Math.round(num) };
}

/**
 * Sanitize string input (remove potential XSS)
 */
export function sanitizeString(input: string, maxLength: number = 500): string {
  if (!input) return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Remove angle brackets to prevent HTML injection
}

/**
 * Validate VIN format
 */
export function validateVIN(vin: string): ValidationResult {
  const sanitized = vin?.trim().toUpperCase();
  
  if (!sanitized) {
    return { isValid: true, sanitizedValue: '' }; // VIN is optional
  }
  
  // VIN must be exactly 17 characters
  if (sanitized.length !== 17) {
    return { isValid: false, error: 'VIN must be exactly 17 characters' };
  }
  
  // VIN cannot contain I, O, or Q
  if (/[IOQ]/.test(sanitized)) {
    return { isValid: false, error: 'VIN cannot contain letters I, O, or Q' };
  }
  
  // VIN must be alphanumeric
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(sanitized)) {
    return { isValid: false, error: 'VIN contains invalid characters' };
  }
  
  return { isValid: true, sanitizedValue: sanitized };
}

export default {
  validateEmail,
  validatePassword,
  validateMileage,
  validateMoneyAmount,
  validateInterestRate,
  validateYear,
  validateLoanTerm,
  sanitizeString,
  validateVIN,
};
