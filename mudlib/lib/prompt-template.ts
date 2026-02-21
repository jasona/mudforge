/**
 * Prompt Template Renderer (Mudlib Copy)
 *
 * Pure function for rendering prompt templates with variable substitution.
 * This is a copy of src/shared/prompt-template.ts for use in the mudlib sandbox
 * where Node.js imports are not available.
 *
 * Supports:
 *   {{variable}}                - Simple substitution (missing vars become empty string)
 *   {{#if variable}}...{{/if}}  - Conditional blocks (removed when var is empty/undefined)
 */

/**
 * Render a prompt template with the given variables.
 */
export function renderTemplate(template: string, vars: Record<string, string | undefined>): string {
  // Process conditional blocks first: {{#if variable}}...content...{{/if}}
  let result = template.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, varName: string, content: string) => {
      const value = vars[varName];
      return value !== undefined && value !== '' ? content : '';
    }
  );

  // Process simple variable substitution: {{variable}}
  result = result.replace(
    /\{\{(\w+)\}\}/g,
    (_match, varName: string) => {
      const value = vars[varName];
      return value !== undefined ? value : '';
    }
  );

  // Clean up multiple consecutive blank lines left by removed conditionals
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}
