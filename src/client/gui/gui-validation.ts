/**
 * GUI Validation - Client-side form validation
 */

import type { ValidationRule, InputElement } from './gui-types.js';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate a single field value against its rules.
 */
export function validateField(
  value: unknown,
  rules: ValidationRule[]
): string | null {
  for (const rule of rules) {
    const error = validateRule(value, rule);
    if (error) {
      return error;
    }
  }
  return null;
}

/**
 * Validate a value against a single rule.
 */
function validateRule(value: unknown, rule: ValidationRule): string | null {
  const strValue = String(value ?? '');
  const numValue = typeof value === 'number' ? value : parseFloat(strValue);

  switch (rule.type) {
    case 'required':
      if (value === undefined || value === null || strValue.trim() === '') {
        return rule.message ?? 'This field is required';
      }
      break;

    case 'minLength':
      if (strValue.length < (rule.value as number)) {
        return rule.message ?? `Must be at least ${rule.value} characters`;
      }
      break;

    case 'maxLength':
      if (strValue.length > (rule.value as number)) {
        return rule.message ?? `Must be at most ${rule.value} characters`;
      }
      break;

    case 'min':
      if (isNaN(numValue) || numValue < (rule.value as number)) {
        return rule.message ?? `Must be at least ${rule.value}`;
      }
      break;

    case 'max':
      if (isNaN(numValue) || numValue > (rule.value as number)) {
        return rule.message ?? `Must be at most ${rule.value}`;
      }
      break;

    case 'pattern':
      try {
        const regex = new RegExp(rule.value as string);
        if (!regex.test(strValue)) {
          return rule.message ?? 'Invalid format';
        }
      } catch {
        console.error('Invalid regex pattern:', rule.value);
      }
      break;

    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(strValue)) {
        return rule.message ?? 'Invalid email address';
      }
      break;
    }

    case 'custom':
      // Custom validation would need to be handled differently
      // For now, we skip it (server-side will handle)
      break;
  }

  return null;
}

/**
 * Validate all form data against element definitions.
 */
export function validateForm(
  data: Record<string, unknown>,
  elements: InputElement[]
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const element of elements) {
    if (element.validation && element.validation.length > 0) {
      const value = data[element.name];
      const error = validateField(value, element.validation);
      if (error) {
        errors[element.name] = error;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Extract all input elements from a layout tree.
 */
export function extractInputElements(
  layout: { children?: unknown[]; type?: string; name?: string; validation?: ValidationRule[] }
): InputElement[] {
  const inputs: InputElement[] = [];

  function traverse(node: unknown): void {
    if (!node || typeof node !== 'object') return;

    const n = node as { children?: unknown[]; type?: string; name?: string };

    // Check if this is an input element (has a name property)
    if ('name' in n && n.name && n.type) {
      inputs.push(n as InputElement);
    }

    // Traverse children if present
    if ('children' in n && Array.isArray(n.children)) {
      for (const child of n.children) {
        traverse(child);
      }
    }
  }

  traverse(layout);
  return inputs;
}
