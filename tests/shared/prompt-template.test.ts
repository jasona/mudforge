import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../../src/shared/prompt-template.js';

describe('renderTemplate', () => {
  it('should substitute simple variables', () => {
    const result = renderTemplate('Hello {{name}}, welcome to {{place}}.', {
      name: 'Alice',
      place: 'Wonderland',
    });
    expect(result).toBe('Hello Alice, welcome to Wonderland.');
  });

  it('should replace missing variables with empty string', () => {
    const result = renderTemplate('Hello {{name}}, you are {{title}}.', {
      name: 'Bob',
    });
    expect(result).toBe('Hello Bob, you are .');
  });

  it('should handle undefined variable values', () => {
    const result = renderTemplate('Hello {{name}}.', {
      name: undefined,
    });
    expect(result).toBe('Hello .');
  });

  it('should include conditional blocks when variable is set', () => {
    const result = renderTemplate(
      'Start.{{#if mood}} Mood: {{mood}}.{{/if}} End.',
      { mood: 'happy' }
    );
    expect(result).toBe('Start. Mood: happy. End.');
  });

  it('should remove conditional blocks when variable is empty', () => {
    const result = renderTemplate(
      'Start.{{#if mood}} Mood: {{mood}}.{{/if}} End.',
      { mood: '' }
    );
    expect(result).toBe('Start. End.');
  });

  it('should remove conditional blocks when variable is undefined', () => {
    const result = renderTemplate(
      'Start.{{#if mood}} Mood: {{mood}}.{{/if}} End.',
      {}
    );
    expect(result).toBe('Start. End.');
  });

  it('should handle multiline templates', () => {
    const template = `Line 1: {{name}}
{{#if title}}Title: {{title}}
{{/if}}Line 3: end`;
    const result = renderTemplate(template, { name: 'Alice', title: 'Queen' });
    expect(result).toBe('Line 1: Alice\nTitle: Queen\nLine 3: end');
  });

  it('should collapse excessive blank lines from removed conditionals', () => {
    const template = `Start


{{#if missing}}This is removed{{/if}}


End`;
    const result = renderTemplate(template, {});
    expect(result).toContain('Start');
    expect(result).toContain('End');
    // Should not have more than 2 consecutive newlines
    expect(result).not.toMatch(/\n{3,}/);
  });

  it('should handle multiple conditionals', () => {
    const template = `{{#if a}}A={{a}}{{/if}} {{#if b}}B={{b}}{{/if}}`;
    const result = renderTemplate(template, { a: '1' });
    expect(result).toBe('A=1');
  });

  it('should trim leading/trailing whitespace', () => {
    const result = renderTemplate('  Hello {{name}}  ', { name: 'World' });
    expect(result).toBe('Hello World');
  });

  it('should handle nested variables inside conditionals', () => {
    const template = `{{#if lore}}LORE:\n{{lore}}\n{{/if}}Generate something.`;
    const result = renderTemplate(template, { lore: 'The world is ancient.' });
    expect(result).toBe('LORE:\nThe world is ancient.\nGenerate something.');
  });

  it('should handle empty template', () => {
    const result = renderTemplate('', {});
    expect(result).toBe('');
  });

  it('should handle template with no variables', () => {
    const result = renderTemplate('Static content only.', {});
    expect(result).toBe('Static content only.');
  });
});
