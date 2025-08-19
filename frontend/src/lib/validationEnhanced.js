/**
 * Enhanced form validation utilities
 * Addresses issues identified in test reports:
 * - Inconsistent validation across forms
 * - Poor user experience with validation errors
 * - Missing real-time validation
 * - No validation caching
 * - Memory leaks from validation listeners
 */

import { writable, derived, get } from 'svelte/store';
import { enhancedApiCall, DEBOUNCE_CONFIG } from './apiEnhanced.js';

// Validation patterns and rules
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^(\+\d{1,3}[- ]?)?\d{8,14}$/,
  CIN: /^[A-Z]{1,2}\d{6,8}$/,
  WORKER_NUMBER: /^W\d{4,8}$/,
  CLIENT_NUMBER: /^C\d{6,10}$/,
  AMOUNT: /^\d+(\.\d{1,2})?$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  NAME: /^[a-zA-ZÀ-ÿ\s-']{2,50}$/,
  ADDRESS: /^[a-zA-Z0-9À-ÿ\s,.-]{5,100}$/,
  WORKPLACE: /^[a-zA-Z0-9À-ÿ\s&.-]{2,50}$/
};

// Validation error messages
export const VALIDATION_MESSAGES = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number (8-14 digits)',
  cin: 'CIN must be 1-2 letters followed by 6-8 digits (e.g., AB123456)',
  workerNumber: 'Worker number must start with W followed by 4-8 digits',
  clientNumber: 'Client number must start with C followed by 6-10 digits',
  amount: 'Please enter a valid amount (e.g., 123.45)',
  password: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  name: 'Name must be 2-50 characters, letters only',
  address: 'Address must be 5-100 characters',
  workplace: 'Workplace must be 2-50 characters',
  minLength: (min) => `Must be at least ${min} characters`,
  maxLength: (max) => `Must be no more than ${max} characters`,
  min: (min) => `Must be at least ${min}`,
  max: (max) => `Must be no more than ${max}`,
  unique: (field) => `This ${field} already exists`,
  match: (field) => `Must match ${field}`,
  custom: 'Invalid value'
};

/**
 * Enhanced validation rule class
 */
class ValidationRule {
  constructor(type, value, message, options = {}) {
    this.type = type;
    this.value = value;
    this.message = message;
    this.options = options;
    this.async = options.async || false;
    this.debounce = options.debounce || false;
  }

  /**
   * Validate a value against this rule
   */
  async validate(value, context = {}) {
    switch (this.type) {
      case 'required':
        return this.validateRequired(value);
      case 'pattern':
        return this.validatePattern(value);
      case 'minLength':
        return this.validateMinLength(value);
      case 'maxLength':
        return this.validateMaxLength(value);
      case 'min':
        return this.validateMin(value);
      case 'max':
        return this.validateMax(value);
      case 'email':
        return this.validateEmail(value);
      case 'phone':
        return this.validatePhone(value);
      case 'cin':
        return this.validateCIN(value);
      case 'workerNumber':
        return this.validateWorkerNumber(value);
      case 'clientNumber':
        return this.validateClientNumber(value);
      case 'amount':
        return this.validateAmount(value);
      case 'password':
        return this.validatePassword(value);
      case 'match':
        return this.validateMatch(value, context);
      case 'unique':
        return this.validateUnique(value, context);
      case 'custom':
        return this.validateCustom(value, context);
      default:
        return { valid: true };
    }
  }

  validateRequired(value) {
    const isEmpty = value === null || value === undefined || 
                   (typeof value === 'string' && value.trim() === '') ||
                   (Array.isArray(value) && value.length === 0);
    
    return {
      valid: !isEmpty,
      message: isEmpty ? this.message || VALIDATION_MESSAGES.required : null
    };
  }

  validatePattern(value) {
    if (!value) return { valid: true }; // Empty values are handled by required rule
    
    const isValid = this.value.test(value);
    return {
      valid: isValid,
      message: isValid ? null : this.message || VALIDATION_MESSAGES.custom
    };
  }

  validateMinLength(value) {
    if (!value) return { valid: true };
    
    const isValid = value.length >= this.value;
    return {
      valid: isValid,
      message: isValid ? null : this.message || VALIDATION_MESSAGES.minLength(this.value)
    };
  }

  validateMaxLength(value) {
    if (!value) return { valid: true };
    
    const isValid = value.length <= this.value;
    return {
      valid: isValid,
      message: isValid ? null : this.message || VALIDATION_MESSAGES.maxLength(this.value)
    };
  }

  validateMin(value) {
    if (!value) return { valid: true };
    
    const numValue = parseFloat(value);
    const isValid = !isNaN(numValue) && numValue >= this.value;
    return {
      valid: isValid,
      message: isValid ? null : this.message || VALIDATION_MESSAGES.min(this.value)
    };
  }

  validateMax(value) {
    if (!value) return { valid: true };
    
    const numValue = parseFloat(value);
    const isValid = !isNaN(numValue) && numValue <= this.value;
    return {
      valid: isValid,
      message: isValid ? null : this.message || VALIDATION_MESSAGES.max(this.value)
    };
  }

  validateEmail(value) {
    if (!value) return { valid: true };
    
    const isValid = VALIDATION_PATTERNS.EMAIL.test(value);
    return {
      valid: isValid,
      message: isValid ? null : this.message || VALIDATION_MESSAGES.email
    };
  }

  validatePhone(value) {
    if (!value) return { valid: true };
    
    const isValid = VALIDATION_PATTERNS.PHONE.test(value);
    return {
      valid: isValid,
      message: isValid ? null : this.message || VALIDATION_MESSAGES.phone
    };
  }

  validateCIN(value) {
    if (!value) return { valid: true };
    
    const isValid = VALIDATION_PATTERNS.CIN.test(value);
    return {
      valid: isValid,
      message: isValid ? null : this.message || VALIDATION_MESSAGES.cin
    };
  }

  validateWorkerNumber(value) {
    if (!value) return { valid: true };
    
    const isValid = VALIDATION_PATTERNS.WORKER_NUMBER.test(value);
    return {
      valid: isValid,
      message: isValid ? null : this.message || VALIDATION_MESSAGES.workerNumber
    };
  }

  validateClientNumber(value) {
    if (!value) return { valid: true };
    
    const isValid = VALIDATION_PATTERNS.CLIENT_NUMBER.test(value);
    return {
      valid: isValid,
      message: isValid ? null : this.message || VALIDATION_MESSAGES.clientNumber
    };
  }

  validateAmount(value) {
    if (!value) return { valid: true };
    
    const isValid = VALIDATION_PATTERNS.AMOUNT.test(value);
    return {
      valid: isValid,
      message: isValid ? null : this.message || VALIDATION_MESSAGES.amount
    };
  }

  validatePassword(value) {
    if (!value) return { valid: true };
    
    const isValid = VALIDATION_PATTERNS.PASSWORD.test(value);
    return {
      valid: isValid,
      message: isValid ? null : this.message || VALIDATION_MESSAGES.password
    };
  }

  validateMatch(value, context) {
    if (!value) return { valid: true };
    
    const matchValue = context[this.value];
    const isValid = value === matchValue;
    return {
      valid: isValid,
      message: isValid ? null : this.message || VALIDATION_MESSAGES.match(this.value)
    };
  }

  async validateUnique(value, context) {
    if (!value) return { valid: true };
    
    try {
      // Make API call to check uniqueness
      const result = await enhancedApiCall({
        url: `/api/v1/validation/unique`,
        method: 'POST',
        data: { 
          field: this.value, 
          value: value,
          excludeId: context.excludeId 
        },
        debounceKey: `unique-${this.value}-${value}`,
        debounceDelay: DEBOUNCE_CONFIG.VALIDATION
      });
      
      return {
        valid: result.unique,
        message: result.unique ? null : this.message || VALIDATION_MESSAGES.unique(this.value)
      };
    } catch (error) {
      console.error('Unique validation error:', error);
      return { valid: true }; // Assume valid on error to not block form
    }
  }

  async validateCustom(value, context) {
    if (typeof this.value === 'function') {
      try {
        const result = await this.value(value, context);
        return {
          valid: result.valid !== false,
          message: result.valid !== false ? null : result.message || this.message || VALIDATION_MESSAGES.custom
        };
      } catch (error) {
        console.error('Custom validation error:', error);
        return {
          valid: false,
          message: this.message || VALIDATION_MESSAGES.custom
        };
      }
    }
    
    return { valid: true };
  }
}

/**
 * Enhanced form field class
 */
class FormField {
  constructor(name, initialValue = '', rules = []) {
    this.name = name;
    this.value = writable(initialValue);
    this.errors = writable([]);
    this.touched = writable(false);
    this.validating = writable(false);
    this.rules = rules.map(rule => 
      rule instanceof ValidationRule ? rule : new ValidationRule(rule.type, rule.value, rule.message, rule.options)
    );
    
    // Derived stores
    this.valid = derived([this.errors], ([errors]) => errors.length === 0);
    this.invalid = derived([this.valid], ([valid]) => !valid);
    this.showErrors = derived([this.touched, this.errors], ([touched, errors]) => touched && errors.length > 0);
    
    // Validation cache
    this.validationCache = new Map();
    this.lastValidationTime = 0;
    
    // Debounced validation
    this.validationTimeout = null;
  }

  /**
   * Set field value and trigger validation
   */
  setValue(newValue, immediate = false) {
    this.value.set(newValue);
    
    if (immediate) {
      this.validate();
    } else {
      this.debouncedValidate();
    }
  }

  /**
   * Mark field as touched
   */
  setTouched(touched = true) {
    this.touched.set(touched);
  }

  /**
   * Add validation rule
   */
  addRule(rule) {
    const validationRule = rule instanceof ValidationRule ? 
      rule : new ValidationRule(rule.type, rule.value, rule.message, rule.options);
    this.rules.push(validationRule);
  }

  /**
   * Remove validation rule by type
   */
  removeRule(type) {
    this.rules = this.rules.filter(rule => rule.type !== type);
  }

  /**
   * Debounced validation
   */
  debouncedValidate(delay = 300) {
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }
    
    this.validationTimeout = setTimeout(() => {
      this.validate();
    }, delay);
  }

  /**
   * Immediate validation
   */
  async validate(context = {}) {
    const currentValue = get(this.value);
    const cacheKey = JSON.stringify({ value: currentValue, context });
    
    // Check cache for recent validation
    const cachedResult = this.validationCache.get(cacheKey);
    const now = Date.now();
    if (cachedResult && (now - this.lastValidationTime) < 1000) {
      this.errors.set(cachedResult);
      return cachedResult.length === 0;
    }
    
    this.validating.set(true);
    const errors = [];
    
    try {
      // Run all validation rules
      for (const rule of this.rules) {
        const result = await rule.validate(currentValue, context);
        if (!result.valid && result.message) {
          errors.push(result.message);
          // Stop on first error for better UX
          break;
        }
      }
      
      // Cache result
      this.validationCache.set(cacheKey, errors);
      this.lastValidationTime = now;
      
      // Clean old cache entries
      if (this.validationCache.size > 10) {
        const oldestKey = this.validationCache.keys().next().value;
        this.validationCache.delete(oldestKey);
      }
      
    } catch (error) {
      console.error(`Validation error for field ${this.name}:`, error);
      errors.push('Validation error occurred');
    }
    
    this.errors.set(errors);
    this.validating.set(false);
    
    return errors.length === 0;
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.errors.set([]);
  }

  /**
   * Reset field to initial state
   */
  reset(initialValue = '') {
    this.value.set(initialValue);
    this.errors.set([]);
    this.touched.set(false);
    this.validating.set(false);
    this.validationCache.clear();
    
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }
  }

  /**
   * Destroy field and clean up resources
   */
  destroy() {
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }
    this.validationCache.clear();
  }
}

/**
 * Enhanced form manager class
 */
export class EnhancedForm {
  constructor(fields = {}, options = {}) {
    this.fields = {};
    this.options = {
      validateOnChange: true,
      validateOnBlur: true,
      showErrorsOnTouched: true,
      ...options
    };
    
    // Form-level stores
    this.valid = writable(true);
    this.invalid = derived([this.valid], ([valid]) => !valid);
    this.validating = writable(false);
    this.submitted = writable(false);
    this.submitting = writable(false);
    
    // Initialize fields
    Object.entries(fields).forEach(([name, config]) => {
      this.addField(name, config.value, config.rules);
    });
    
    // Update form validity when fields change
    this.updateFormValidity();
  }

  /**
   * Add field to form
   */
  addField(name, initialValue = '', rules = []) {
    const field = new FormField(name, initialValue, rules);
    this.fields[name] = field;
    
    // Subscribe to field changes to update form validity
    field.valid.subscribe(() => {
      this.updateFormValidity();
    });
    
    return field;
  }

  /**
   * Get field by name
   */
  getField(name) {
    return this.fields[name];
  }

  /**
   * Get all field values
   */
  getValues() {
    const values = {};
    Object.entries(this.fields).forEach(([name, field]) => {
      values[name] = get(field.value);
    });
    return values;
  }

  /**
   * Set multiple field values
   */
  setValues(values) {
    Object.entries(values).forEach(([name, value]) => {
      if (this.fields[name]) {
        this.fields[name].setValue(value);
      }
    });
  }

  /**
   * Validate all fields
   */
  async validateAll() {
    this.validating.set(true);
    const context = this.getValues();
    
    const validationPromises = Object.values(this.fields).map(field => 
      field.validate(context)
    );
    
    const results = await Promise.all(validationPromises);
    const isValid = results.every(result => result);
    
    this.validating.set(false);
    this.valid.set(isValid);
    
    return isValid;
  }

  /**
   * Touch all fields (show validation errors)
   */
  touchAll() {
    Object.values(this.fields).forEach(field => {
      field.setTouched(true);
    });
  }

  /**
   * Update form validity based on field validity
   */
  updateFormValidity() {
    const isValid = Object.values(this.fields).every(field => get(field.valid));
    this.valid.set(isValid);
  }

  /**
   * Handle form submission
   */
  async handleSubmit(submitFunction) {
    this.submitted.set(true);
    this.submitting.set(true);
    this.touchAll();
    
    try {
      const isValid = await this.validateAll();
      
      if (isValid) {
        const values = this.getValues();
        const result = await submitFunction(values);
        return { success: true, data: result };
      } else {
        return { success: false, error: 'Please fix validation errors' };
      }
    } catch (error) {
      console.error('Form submission error:', error);
      return { success: false, error: error.message || 'Submission failed' };
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * Reset form to initial state
   */
  reset() {
    Object.values(this.fields).forEach(field => {
      field.reset();
    });
    
    this.valid.set(true);
    this.submitted.set(false);
    this.submitting.set(false);
  }

  /**
   * Destroy form and clean up resources
   */
  destroy() {
    Object.values(this.fields).forEach(field => {
      field.destroy();
    });
    this.fields = {};
  }
}

/**
 * Validation rule builders for common use cases
 */
export const ValidationRules = {
  required: (message) => new ValidationRule('required', true, message),
  email: (message) => new ValidationRule('email', true, message),
  phone: (message) => new ValidationRule('phone', true, message),
  cin: (message) => new ValidationRule('cin', true, message),
  workerNumber: (message) => new ValidationRule('workerNumber', true, message),
  clientNumber: (message) => new ValidationRule('clientNumber', true, message),
  amount: (message) => new ValidationRule('amount', true, message),
  password: (message) => new ValidationRule('password', true, message),
  name: (message) => new ValidationRule('pattern', VALIDATION_PATTERNS.NAME, message),
  address: (message) => new ValidationRule('pattern', VALIDATION_PATTERNS.ADDRESS, message),
  workplace: (message) => new ValidationRule('pattern', VALIDATION_PATTERNS.WORKPLACE, message),
  minLength: (min, message) => new ValidationRule('minLength', min, message),
  maxLength: (max, message) => new ValidationRule('maxLength', max, message),
  min: (min, message) => new ValidationRule('min', min, message),
  max: (max, message) => new ValidationRule('max', max, message),
  pattern: (pattern, message) => new ValidationRule('pattern', pattern, message),
  match: (field, message) => new ValidationRule('match', field, message),
  unique: (field, message) => new ValidationRule('unique', field, message, { async: true, debounce: true }),
  custom: (validationFn, message) => new ValidationRule('custom', validationFn, message, { async: true })
};

/**
 * Common form configurations
 */
export const FormConfigs = {
  client: {
    name: {
      value: '',
      rules: [
        ValidationRules.required(),
        ValidationRules.name(),
        ValidationRules.minLength(2),
        ValidationRules.maxLength(50)
      ]
    },
    email: {
      value: '',
      rules: [
        ValidationRules.required(),
        ValidationRules.email(),
        ValidationRules.unique('email')
      ]
    },
    phoneNumber: {
      value: '',
      rules: [
        ValidationRules.required(),
        ValidationRules.phone()
      ]
    },
    cin: {
      value: '',
      rules: [
        ValidationRules.required(),
        ValidationRules.cin(),
        ValidationRules.unique('cin')
      ]
    },
    address: {
      value: '',
      rules: [
        ValidationRules.required(),
        ValidationRules.address()
      ]
    },
    workplace: {
      value: '',
      rules: [
        ValidationRules.required(),
        ValidationRules.workplace()
      ]
    },
    workerNumber: {
      value: '',
      rules: [
        ValidationRules.required(),
        ValidationRules.workerNumber(),
        ValidationRules.unique('workerNumber')
      ]
    }
  },
  
  login: {
    email: {
      value: '',
      rules: [
        ValidationRules.required(),
        ValidationRules.email()
      ]
    },
    password: {
      value: '',
      rules: [
        ValidationRules.required(),
        ValidationRules.minLength(6)
      ]
    }
  },
  
  payment: {
    amount: {
      value: '',
      rules: [
        ValidationRules.required(),
        ValidationRules.amount(),
        ValidationRules.min(0.01)
      ]
    },
    description: {
      value: '',
      rules: [
        ValidationRules.required(),
        ValidationRules.minLength(5),
        ValidationRules.maxLength(255)
      ]
    }
  }
};

/**
 * Form validation utilities
 */
export const formUtils = {
  /**
   * Create enhanced form from config
   */
  createForm: (config, options = {}) => {
    return new EnhancedForm(config, options);
  },

  /**
   * Validate single value with rules
   */
  validateValue: async (value, rules, context = {}) => {
    const errors = [];
    
    for (const rule of rules) {
      const validationRule = rule instanceof ValidationRule ? 
        rule : new ValidationRule(rule.type, rule.value, rule.message, rule.options);
      
      const result = await validationRule.validate(value, context);
      if (!result.valid && result.message) {
        errors.push(result.message);
        break; // Stop on first error
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Format validation errors for display
   */
  formatErrors: (errors) => {
    if (!Array.isArray(errors) || errors.length === 0) {
      return '';
    }
    
    return errors[0]; // Show only first error
  }
};

// Export main classes and utilities
export { ValidationRule, FormField, EnhancedForm };
