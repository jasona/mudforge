/**
 * Prompts Daemon - Thin wrapper over prompt template efuns.
 *
 * Provides convenient access to AI prompt templates from mudlib code.
 * All data lives in the driver's PromptManager; this daemon just
 * wraps the efun calls.
 *
 * Usage:
 *   import { getPromptsDaemon } from '../daemons/prompts.js';
 *   const prompts = getPromptsDaemon();
 *   const rendered = prompts.render('describe.system', { styleGuide: '...' });
 */

import { MudObject } from '../std/object.js';
import { renderTemplate } from '../lib/prompt-template.js';

export class PromptsDaemon extends MudObject {
  constructor() {
    super();
    this.shortDesc = 'Prompts Daemon';
    this.longDesc = 'Manages AI prompt templates for customizing AI-generated content.';
  }

  /**
   * Get the effective template for a prompt ID (override if set, else default).
   */
  get(id: string): string | undefined {
    if (typeof efuns === 'undefined' || !efuns.getPromptTemplate) return undefined;
    return efuns.getPromptTemplate(id);
  }

  /**
   * Get the hardcoded default template for a prompt ID.
   */
  getDefault(id: string): string | undefined {
    if (typeof efuns === 'undefined' || !efuns.getPromptDefault) return undefined;
    return efuns.getPromptDefault(id);
  }

  /**
   * Get all registered prompt IDs.
   */
  getIds(): string[] {
    if (typeof efuns === 'undefined' || !efuns.getPromptIds) return [];
    return efuns.getPromptIds();
  }

  /**
   * Check whether a prompt ID has an active override.
   */
  hasOverride(id: string): boolean {
    if (typeof efuns === 'undefined' || !efuns.hasPromptOverride) return false;
    return efuns.hasPromptOverride(id);
  }

  /**
   * Render a prompt template with variables.
   * Falls back to local rendering if the efun is unavailable.
   */
  render(id: string, vars: Record<string, string | undefined> = {}): string | undefined {
    if (typeof efuns !== 'undefined' && efuns.renderPrompt) {
      return efuns.renderPrompt(id, vars);
    }
    // Fallback: get template and render locally
    const template = this.get(id);
    if (!template) return undefined;
    return renderTemplate(template, vars);
  }

  /**
   * Set an override for a prompt template.
   */
  async set(id: string, template: string): Promise<{ success: boolean; error?: string }> {
    if (typeof efuns === 'undefined' || !efuns.setPromptOverride) {
      return { success: false, error: 'Prompt efuns not available' };
    }
    return efuns.setPromptOverride(id, template);
  }

  /**
   * Reset a prompt template to its default (remove override).
   */
  async reset(id: string): Promise<{ success: boolean; error?: string }> {
    if (typeof efuns === 'undefined' || !efuns.resetPromptOverride) {
      return { success: false, error: 'Prompt efuns not available' };
    }
    return efuns.resetPromptOverride(id);
  }

  /**
   * Reload prompt overrides from disk.
   */
  async reload(): Promise<void> {
    if (typeof efuns !== 'undefined' && efuns.reloadPrompts) {
      await efuns.reloadPrompts();
    }
  }
}

// Singleton
let promptsDaemon: PromptsDaemon | null = null;

export function getPromptsDaemon(): PromptsDaemon {
  if (!promptsDaemon) {
    promptsDaemon = new PromptsDaemon();
  }
  return promptsDaemon;
}

export function resetPromptsDaemon(): void {
  promptsDaemon = null;
}

export default PromptsDaemon;
