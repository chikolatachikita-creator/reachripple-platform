/**
 * Form Validation Utilities
 * Provides reusable validation functions and patterns for form inputs
 */

import { useState, useCallback } from 'react';

// ========================================
// VALIDATION RULES
// ========================================

export const validators = {
  /**
   * Required field validation
   */
  required: (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return null;
  },

  /**
   * Email validation
   */
  email: (value) => {
    if (!value) return null; // Let required handle empty
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  /**
   * Minimum length validation
   */
  minLength: (min) => (value, fieldName = 'This field') => {
    if (!value) return null;
    if (value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return null;
  },

  /**
   * Maximum length validation
   */
  maxLength: (max) => (value, fieldName = 'This field') => {
    if (!value) return null;
    if (value.length > max) {
      return `${fieldName} must be no more than ${max} characters`;
    }
    return null;
  },

  /**
   * Password strength validation (matches backend requirements)
   */
  password: (value) => {
    if (!value) return null;
    
    const errors = [];
    
    if (value.length < 8) {
      errors.push('at least 8 characters');
    }
    if (!/[A-Z]/.test(value)) {
      errors.push('one uppercase letter');
    }
    if (!/[a-z]/.test(value)) {
      errors.push('one lowercase letter');
    }
    if (!/[0-9]/.test(value)) {
      errors.push('one number');
    }
    
    if (errors.length > 0) {
      return `Password must contain ${errors.join(', ')}`;
    }
    return null;
  },

  /**
   * Password confirmation match
   */
  passwordMatch: (password) => (value) => {
    if (!value) return null;
    if (value !== password) {
      return 'Passwords do not match';
    }
    return null;
  },

  /**
   * Phone number validation (optional, flexible format)
   */
  phone: (value) => {
    if (!value) return null;
    // Allow various formats: +1234567890, (123) 456-7890, 123-456-7890, etc.
    const phoneRegex = /^[\d\s\-()+-]{10,20}$/;
    if (!phoneRegex.test(value)) {
      return 'Please enter a valid phone number';
    }
    return null;
  },

  /**
   * URL validation
   */
  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  /**
   * Number range validation
   */
  numberRange: (min, max) => (value, fieldName = 'Value') => {
    if (value === '' || value === null || value === undefined) return null;
    const num = Number(value);
    if (isNaN(num)) {
      return `${fieldName} must be a number`;
    }
    if (num < min || num > max) {
      return `${fieldName} must be between ${min} and ${max}`;
    }
    return null;
  },

  /**
   * Age validation (18+)
   */
  age: (value) => {
    if (!value) return null;
    const age = Number(value);
    if (isNaN(age) || age < 18 || age > 100) {
      return 'Age must be between 18 and 100';
    }
    return null;
  },

  /**
   * Price validation
   */
  price: (value) => {
    if (!value && value !== 0) return null;
    const price = Number(value);
    if (isNaN(price) || price < 0) {
      return 'Price must be a positive number';
    }
    if (price > 100000) {
      return 'Price seems too high. Please check.';
    }
    return null;
  },
};

// ========================================
// VALIDATION RUNNER
// ========================================

/**
 * Run multiple validators on a single value
 * @param {any} value - The value to validate
 * @param {Function[]} rules - Array of validator functions
 * @param {string} fieldName - Optional field name for error messages
 * @returns {string|null} - First error message or null if valid
 */
export function validate(value, rules, fieldName) {
  for (const rule of rules) {
    const error = rule(value, fieldName);
    if (error) return error;
  }
  return null;
}

/**
 * Validate an entire form object
 * @param {Object} values - Form values object
 * @param {Object} schema - Validation schema { fieldName: [validators] }
 * @returns {Object} - Object with error messages for each invalid field
 */
export function validateForm(values, schema) {
  const errors = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const error = validate(values[field], rules, field);
    if (error) {
      errors[field] = error;
    }
  }
  
  return errors;
}

/**
 * Check if form has any errors
 */
export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

// ========================================
// REACT HOOK FOR FORM VALIDATION
// ========================================

/**
 * Custom hook for form validation
 * @param {Object} initialValues - Initial form values
 * @param {Object} schema - Validation schema
 */
export function useFormValidation(initialValues, schema) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Validate a single field
  const validateField = useCallback((name, value) => {
    if (!schema[name]) return null;
    return validate(value, schema[name], name);
  }, [schema]);

  // Handle input change
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({ ...prev, [name]: newValue }));
    
    // Validate on change if field was already touched
    if (touched[name]) {
      const error = validateField(name, newValue);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [touched, validateField]);

  // Handle input blur (mark as touched and validate)
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField]);

  // Validate entire form
  const validateAll = useCallback(() => {
    const newErrors = validateForm(values, schema);
    setErrors(newErrors);
    
    // Mark all fields as touched
    const allTouched = Object.keys(schema).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);
    
    return !hasErrors(newErrors);
  }, [values, schema]);

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  // Set a single value programmatically
  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  // Set multiple values
  const setValuesAll = useCallback((newValues) => {
    setValues(prev => ({ ...prev, ...newValues }));
  }, []);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    validateField,
    reset,
    setValue,
    setValues: setValuesAll,
    isValid: !hasErrors(errors),
  };
}

// ========================================
// INLINE VALIDATION COMPONENT HELPERS
// ========================================

/**
 * Get field state classes based on validation
 */
export function getFieldClasses(error, touched, baseClasses = '') {
  if (!touched) {
    return `${baseClasses} border-gray-200 focus:border-purple-500 focus:ring-purple-500/20`;
  }
  if (error) {
    return `${baseClasses} border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50`;
  }
  return `${baseClasses} border-green-300 focus:border-green-500 focus:ring-green-500/20`;
}

/**
 * Error message component
 */
export function FieldError({ error, show = true }) {
  if (!error || !show) return null;
  
  return (
    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5 animate-fadeIn">
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {error}
    </p>
  );
}

/**
 * Success indicator component
 */
export function FieldSuccess({ show = false, message = 'Looks good!' }) {
  if (!show) return null;
  
  return (
    <p className="mt-1.5 text-sm text-green-600 flex items-center gap-1.5 animate-fadeIn">
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  );
}

// Combined exports for convenience
const formValidation = {
  validators,
  validate,
  validateForm,
  hasErrors,
  useFormValidation,
  getFieldClasses,
  FieldError,
  FieldSuccess,
};

export default formValidation;
