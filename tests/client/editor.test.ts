/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeEditor } from '../../src/client/editor.js';

describe('CodeEditor', () => {
  let container: HTMLElement;
  let editor: CodeEditor;

  beforeEach(() => {
    // Create container
    container = document.createElement('div');
    document.body.appendChild(container);

    editor = new CodeEditor({ container });
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  describe('creation', () => {
    it('should create editor elements', () => {
      expect(container.querySelector('.code-editor-wrapper')).not.toBeNull();
      expect(container.querySelector('.code-editor-textarea')).not.toBeNull();
      expect(container.querySelector('.code-editor-lines')).not.toBeNull();
    });

    it('should be hidden by default', () => {
      const wrapper = container.querySelector('.code-editor-wrapper') as HTMLElement;
      expect(wrapper.style.display).toBe('none');
    });

    it('should accept initial content', () => {
      const editorWithContent = new CodeEditor({
        container,
        content: 'function test() {}',
      });

      expect(editorWithContent.getContent()).toBe('function test() {}');
      editorWithContent.destroy();
    });

    it('should accept initial file path', () => {
      const editorWithPath = new CodeEditor({
        container,
        filePath: '/std/test.ts',
      });

      const pathSpan = container.querySelectorAll('.code-editor-filepath')[1];
      expect(pathSpan?.textContent).toBe('/std/test.ts');
      editorWithPath.destroy();
    });
  });

  describe('show/hide', () => {
    it('should show editor', () => {
      editor.show();

      const wrapper = container.querySelector('.code-editor-wrapper') as HTMLElement;
      expect(wrapper.style.display).toBe('flex');
      expect(editor.visible).toBe(true);
    });

    it('should hide editor', () => {
      editor.show();
      editor.hide();

      const wrapper = container.querySelector('.code-editor-wrapper') as HTMLElement;
      expect(wrapper.style.display).toBe('none');
      expect(editor.visible).toBe(false);
    });
  });

  describe('open', () => {
    it('should open file with content', () => {
      editor.open('/std/room.ts', 'export class Room {}');

      expect(editor.getContent()).toBe('export class Room {}');
      expect(editor.visible).toBe(true);
    });

    it('should update file path display', () => {
      editor.open('/areas/town/square.ts', 'const room = {};');

      const pathSpan = container.querySelector('.code-editor-filepath');
      expect(pathSpan?.textContent).toBe('/areas/town/square.ts');
    });

    it('should handle read-only mode', () => {
      editor.open('/std/protected.ts', 'protected content', true);

      const textarea = container.querySelector('.code-editor-textarea') as HTMLTextAreaElement;
      expect(textarea.readOnly).toBe(true);
    });
  });

  describe('content', () => {
    it('should get content', () => {
      editor.open('/test.ts', 'test content');
      expect(editor.getContent()).toBe('test content');
    });

    it('should detect modifications', () => {
      editor.open('/test.ts', 'original');

      expect(editor.isModified()).toBe(false);

      const textarea = container.querySelector('.code-editor-textarea') as HTMLTextAreaElement;
      textarea.value = 'modified';

      expect(editor.isModified()).toBe(true);
    });
  });

  describe('events', () => {
    it('should emit save event', () => {
      const saveHandler = vi.fn();
      editor.on('save', saveHandler);
      editor.open('/test.ts', 'content');

      editor.save();

      expect(saveHandler).toHaveBeenCalledWith('/test.ts', 'content');
    });

    it('should emit close event', () => {
      const closeHandler = vi.fn();
      editor.on('close', closeHandler);
      editor.open('/test.ts', 'content');

      // Mock confirm to return true
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      editor.close();

      expect(closeHandler).toHaveBeenCalled();
    });

    it('should not save in read-only mode', () => {
      const saveHandler = vi.fn();
      editor.on('save', saveHandler);
      editor.open('/test.ts', 'content', true);

      editor.save();

      expect(saveHandler).not.toHaveBeenCalled();
    });
  });

  describe('errors', () => {
    it('should show errors', () => {
      editor.show();
      editor.showErrors([
        { line: 1, column: 5, message: 'Syntax error' },
        { line: 3, column: 10, message: 'Type error' },
      ]);

      const errorPanel = container.querySelector('.code-editor-errors') as HTMLElement;
      expect(errorPanel.style.display).toBe('block');

      const errorItems = container.querySelectorAll('.code-editor-error-item');
      expect(errorItems).toHaveLength(2);
    });

    it('should clear errors', () => {
      editor.show();
      editor.showErrors([{ line: 1, column: 5, message: 'Error' }]);
      editor.clearErrors();

      const errorPanel = container.querySelector('.code-editor-errors') as HTMLElement;
      expect(errorPanel.style.display).toBe('none');
    });

    it('should escape HTML in error messages', () => {
      editor.show();
      editor.showErrors([{ line: 1, column: 1, message: '<script>alert("xss")</script>' }]);

      const errorPanel = container.querySelector('.code-editor-errors') as HTMLElement;
      expect(errorPanel.innerHTML).not.toContain('<script>');
      expect(errorPanel.innerHTML).toContain('&lt;script&gt;');
    });
  });

  describe('status', () => {
    it('should update status bar', () => {
      editor.show();
      editor.setStatus('Saving...');

      const statusBar = container.querySelector('.code-editor-status');
      expect(statusBar?.textContent).toBe('Saving...');
    });
  });

  describe('compile result', () => {
    it('should handle successful compile', () => {
      editor.open('/test.ts', 'valid code');
      editor.handleCompileResult({ success: true });

      const statusBar = container.querySelector('.code-editor-status');
      expect(statusBar?.textContent).toBe('Saved successfully');
      expect(editor.isModified()).toBe(false);
    });

    it('should handle failed compile', () => {
      editor.open('/test.ts', 'invalid code');
      editor.handleCompileResult({
        success: false,
        errors: [{ line: 1, column: 1, message: 'Syntax error' }],
      });

      const errorPanel = container.querySelector('.code-editor-errors') as HTMLElement;
      expect(errorPanel.style.display).toBe('block');
    });
  });

  describe('line numbers', () => {
    it('should show line numbers', () => {
      editor.open('/test.ts', 'line1\nline2\nline3');

      const lineNumbers = container.querySelectorAll('.code-editor-line-number');
      expect(lineNumbers).toHaveLength(3);
    });
  });

  describe('go to line', () => {
    it('should go to specific line', () => {
      editor.open('/test.ts', 'line1\nline2\nline3\nline4\nline5');

      const textarea = container.querySelector('.code-editor-textarea') as HTMLTextAreaElement;
      const focusSpy = vi.spyOn(textarea, 'focus');

      editor.goToLine(3);

      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should remove editor elements', () => {
      editor.destroy();

      expect(container.querySelector('.code-editor-wrapper')).toBeNull();
    });
  });
});
