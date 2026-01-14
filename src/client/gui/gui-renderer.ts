/**
 * GUI Renderer - DOM rendering engine for GUI schemas
 */

import type {
  LayoutContainer,
  InputElement,
  DisplayElement,
} from './gui-types.js';
import { isLayoutContainer, isInputElement, isDisplayElement } from './gui-types.js';
import { renderLayout } from './gui-layout.js';
import { renderInputElement, renderDisplayElement, applyStyle } from './gui-elements.js';

export type ButtonClickHandler = (buttonId: string, action: string, customAction?: string) => void;

export class GUIRenderer {
  private elementMap: Map<string, HTMLElement> = new Map();
  private inputMap: Map<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> = new Map();
  private formData: Record<string, unknown> = {};
  private onChange?: (name: string, value: unknown) => void;
  private onButtonClick?: ButtonClickHandler;

  /**
   * Render a layout to a parent element.
   */
  render(
    layout: LayoutContainer,
    parent: HTMLElement,
    data: Record<string, unknown>,
    onChange?: (name: string, value: unknown) => void,
    onButtonClick?: ButtonClickHandler
  ): void {
    this.elementMap.clear();
    this.inputMap.clear();
    this.formData = { ...data };
    this.onChange = onChange;
    this.onButtonClick = onButtonClick;

    const element = this.renderNode(layout);
    parent.appendChild(element);
  }

  /**
   * Render a single node (layout, input, or display element).
   */
  private renderNode(
    node: LayoutContainer | InputElement | DisplayElement
  ): HTMLElement {
    if (isLayoutContainer(node)) {
      return renderLayout(node, (child) =>
        this.renderNode(child as LayoutContainer | InputElement | DisplayElement)
      );
    } else if (isInputElement(node)) {
      const element = renderInputElement(node, this.formData, (name, value) => {
        this.formData[name] = value;
        this.onChange?.(name, value);
      });

      // Track the element
      if (node.id) {
        this.elementMap.set(node.id, element);
      }

      // Track the actual input element
      const input = element.querySelector('input, select, textarea');
      if (input && node.name) {
        this.inputMap.set(node.name, input as HTMLInputElement);
      }

      // Attach click handler for buttons
      if (node.type === 'button' && this.onButtonClick) {
        const button = element.querySelector('button');
        if (button) {
          button.addEventListener('click', () => {
            this.onButtonClick?.(
              node.id,
              node.action ?? 'custom',
              node.customAction
            );
          });
        }
      }

      return element;
    } else if (isDisplayElement(node)) {
      const element = renderDisplayElement(node);

      if (node.id) {
        this.elementMap.set(node.id, element);
      }

      return element;
    }

    // Fallback for unknown node types
    const span = document.createElement('span');
    span.textContent = 'Unknown element';
    return span;
  }

  /**
   * Get all form data from inputs.
   */
  getFormData(): Record<string, unknown> {
    const data: Record<string, unknown> = { ...this.formData };

    for (const [name, input] of this.inputMap) {
      if (input instanceof HTMLInputElement) {
        if (input.type === 'checkbox') {
          data[name] = input.checked;
        } else if (input.type === 'number' || input.type === 'range') {
          data[name] = input.valueAsNumber;
        } else if (input.type === 'hidden') {
          data[name] = input.value;
        } else {
          data[name] = input.value;
        }
      } else if (input instanceof HTMLTextAreaElement) {
        data[name] = input.value;
      } else if (input instanceof HTMLSelectElement) {
        data[name] = input.value;
      }
    }

    // Also get radio button values
    for (const [id, element] of this.elementMap) {
      const radioInputs = element.querySelectorAll('input[type="radio"]:checked');
      radioInputs.forEach((radio) => {
        const r = radio as HTMLInputElement;
        if (r.name) {
          data[r.name] = r.value;
        }
      });
    }

    return data;
  }

  /**
   * Update elements with new properties.
   */
  updateElements(updates: Record<string, Partial<InputElement | DisplayElement>>): void {
    for (const [id, props] of Object.entries(updates)) {
      const element = this.elementMap.get(id);
      if (element) {
        this.applyUpdates(element, props);
      }
    }
  }

  /**
   * Apply updates to an element.
   */
  private applyUpdates(
    element: HTMLElement,
    props: Partial<InputElement | DisplayElement>
  ): void {
    // Handle visibility
    if ('visible' in props) {
      element.style.display = props.visible === false ? 'none' : '';
    }

    // Handle disabled state
    if ('disabled' in props) {
      const input = element.querySelector('input, select, textarea, button');
      if (input) {
        (input as HTMLInputElement | HTMLButtonElement).disabled = props.disabled ?? false;
      }
    }

    // Handle style updates
    if ('style' in props && props.style) {
      applyStyle(element, props.style);
    }

    // Handle content updates for display elements
    if ('content' in props) {
      const textEl = element.querySelector('.gui-text, .gui-paragraph, .gui-icon') ||
        element.tagName.match(/^H[1-6]$/) ? element : null;
      if (textEl) {
        textEl.textContent = props.content ?? '';
      }
    }

    // Handle progress updates
    if ('progress' in props) {
      const fill = element.querySelector('.gui-progress-fill') as HTMLElement;
      if (fill) {
        fill.style.width = `${Math.min(Math.max(props.progress ?? 0, 0), 100)}%`;
      }
    }

    // Handle value updates for inputs
    if ('value' in props) {
      const input = element.querySelector('input, select, textarea') as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null;
      if (input) {
        if (input instanceof HTMLInputElement && input.type === 'checkbox') {
          input.checked = Boolean(props.value);
        } else {
          input.value = String(props.value ?? '');
        }
      }
    }

    // Handle image source updates
    if ('src' in props) {
      const img = element.querySelector('img') || (element.tagName === 'IMG' ? element : null);
      if (img) {
        (img as HTMLImageElement).src = props.src ?? '';
      }
    }
  }

  /**
   * Update form data values.
   */
  updateData(data: Record<string, unknown>): void {
    Object.assign(this.formData, data);

    for (const [name, value] of Object.entries(data)) {
      const input = this.inputMap.get(name);
      if (input) {
        if (input instanceof HTMLInputElement) {
          if (input.type === 'checkbox') {
            input.checked = Boolean(value);
          } else if (input.type === 'radio') {
            // Handle radio - need to find all radios with this name
            const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
            radios.forEach((radio) => {
              (radio as HTMLInputElement).checked =
                (radio as HTMLInputElement).value === String(value);
            });
          } else {
            input.value = String(value ?? '');
          }
        } else {
          input.value = String(value ?? '');
        }
      }
    }
  }

  /**
   * Show validation errors on fields.
   */
  showErrors(errors: Record<string, string>): void {
    // Clear previous errors
    this.clearErrors();

    for (const [name, message] of Object.entries(errors)) {
      const input = this.inputMap.get(name);
      if (input) {
        input.classList.add('gui-input-error');

        // Find the field wrapper
        const wrapper = input.closest('.gui-field');
        if (wrapper) {
          const errorEl = document.createElement('div');
          errorEl.className = 'gui-field-error';
          errorEl.textContent = message;
          wrapper.appendChild(errorEl);
        }
      }
    }
  }

  /**
   * Clear all validation errors.
   */
  clearErrors(): void {
    for (const input of this.inputMap.values()) {
      input.classList.remove('gui-input-error');
      const wrapper = input.closest('.gui-field');
      wrapper?.querySelector('.gui-field-error')?.remove();
    }
  }

  /**
   * Get an element by ID.
   */
  getElement(id: string): HTMLElement | undefined {
    return this.elementMap.get(id);
  }

  /**
   * Get an input by name.
   */
  getInput(name: string): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | undefined {
    return this.inputMap.get(name);
  }
}
