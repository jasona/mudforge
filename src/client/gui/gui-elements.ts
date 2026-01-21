/**
 * GUI Elements - Renders individual input and display elements
 */

import type {
  InputElement,
  DisplayElement,
  ElementStyle,
} from './gui-types.js';
import { AVATARS } from '../avatars.js';

/**
 * Apply inline styles to an element.
 */
export function applyStyle(element: HTMLElement, style?: ElementStyle): void {
  if (!style) return;

  const styleMap: Record<string, string> = {
    width: 'width',
    height: 'height',
    minWidth: 'minWidth',
    minHeight: 'minHeight',
    maxWidth: 'maxWidth',
    maxHeight: 'maxHeight',
    padding: 'padding',
    margin: 'margin',
    marginTop: 'marginTop',
    marginBottom: 'marginBottom',
    marginLeft: 'marginLeft',
    marginRight: 'marginRight',
    backgroundColor: 'backgroundColor',
    backgroundImage: 'backgroundImage',
    color: 'color',
    fontSize: 'fontSize',
    fontWeight: 'fontWeight',
    fontStyle: 'fontStyle',
    textAlign: 'textAlign',
    border: 'border',
    borderRadius: 'borderRadius',
    flex: 'flex',
    alignItems: 'alignItems',
    justifyContent: 'justifyContent',
    flexDirection: 'flexDirection',
    gridColumn: 'gridColumn',
    gridRow: 'gridRow',
    overflow: 'overflow',
    overflowY: 'overflowY',
    display: 'display',
    gap: 'gap',
    cursor: 'cursor',
    objectFit: 'objectFit',
    lineHeight: 'lineHeight',
    textTransform: 'textTransform',
  };

  for (const [key, cssKey] of Object.entries(styleMap)) {
    const value = (style as Record<string, unknown>)[key];
    if (value !== undefined) {
      (element.style as Record<string, unknown>)[cssKey] = value;
    }
  }

  if (style.opacity !== undefined) {
    element.style.opacity = String(style.opacity);
  }
  if (style.flexGrow !== undefined) {
    element.style.flexGrow = String(style.flexGrow);
  }
  if (style.flexShrink !== undefined) {
    element.style.flexShrink = String(style.flexShrink);
  }
}

// =============================================================================
// Input Element Renderers
// =============================================================================

export function renderInputElement(
  element: InputElement,
  data: Record<string, unknown>,
  onChange?: (name: string, value: unknown) => void
): HTMLElement {
  // For buttons, don't wrap in a div - return the button directly for better inline behavior
  if (element.type === 'button') {
    const button = createButton(element);
    applyStyle(button, element.style);
    if (element.className) {
      button.classList.add(element.className);
    }
    if (element.visible === false) {
      button.style.display = 'none';
    }
    return button;
  }

  const wrapper = document.createElement('div');
  wrapper.className = `gui-field gui-field-${element.type}`;
  if (element.className) {
    wrapper.classList.add(element.className);
  }
  wrapper.dataset.fieldName = element.name;

  if (element.visible === false) {
    wrapper.style.display = 'none';
  }

  // Add label if present (except for checkbox which has inline label)
  if (element.label && element.type !== 'checkbox' && element.type !== 'button') {
    const label = document.createElement('label');
    label.className = 'gui-label';
    label.htmlFor = `gui-input-${element.id}`;
    label.textContent = element.label;
    wrapper.appendChild(label);
  }

  let inputEl: HTMLElement;

  switch (element.type) {
    case 'text':
    case 'password':
    case 'number':
    case 'color':
      inputEl = createTextInput(element, data, onChange);
      break;
    case 'textarea':
      inputEl = createTextarea(element, data, onChange);
      break;
    case 'select':
      inputEl = createSelect(element, data, onChange);
      break;
    case 'radio':
      inputEl = createRadioGroup(element, data, onChange);
      break;
    case 'checkbox':
      inputEl = createCheckbox(element, data, onChange);
      break;
    case 'slider':
      inputEl = createSlider(element, data, onChange);
      break;
    case 'hidden':
      inputEl = createHiddenInput(element, data);
      break;
    default:
      inputEl = document.createElement('span');
      inputEl.textContent = `Unknown input type: ${element.type}`;
  }

  wrapper.appendChild(inputEl);
  applyStyle(wrapper, element.style);

  return wrapper;
}

function createTextInput(
  element: InputElement,
  data: Record<string, unknown>,
  onChange?: (name: string, value: unknown) => void
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = element.type;
  input.id = `gui-input-${element.id}`;
  input.name = element.name;
  input.className = 'gui-input';
  input.placeholder = element.placeholder ?? '';
  input.disabled = element.disabled ?? false;
  input.readOnly = element.readOnly ?? false;

  const value = data[element.name] ?? element.value ?? '';
  input.value = String(value);

  if (element.type === 'number') {
    if (element.min !== undefined) input.min = String(element.min);
    if (element.max !== undefined) input.max = String(element.max);
    if (element.step !== undefined) input.step = String(element.step);
  }

  if (onChange) {
    input.addEventListener('input', () => {
      const val = element.type === 'number' ? input.valueAsNumber : input.value;
      onChange(element.name, val);
    });
  }

  return input;
}

function createTextarea(
  element: InputElement,
  data: Record<string, unknown>,
  onChange?: (name: string, value: unknown) => void
): HTMLTextAreaElement {
  const textarea = document.createElement('textarea');
  textarea.id = `gui-input-${element.id}`;
  textarea.name = element.name;
  textarea.className = 'gui-textarea';
  textarea.placeholder = element.placeholder ?? '';
  textarea.disabled = element.disabled ?? false;
  textarea.readOnly = element.readOnly ?? false;
  textarea.rows = element.rows ?? 4;

  const value = data[element.name] ?? element.value ?? '';
  textarea.value = String(value);

  if (onChange) {
    textarea.addEventListener('input', () => {
      onChange(element.name, textarea.value);
    });
  }

  return textarea;
}

function createSelect(
  element: InputElement,
  data: Record<string, unknown>,
  onChange?: (name: string, value: unknown) => void
): HTMLSelectElement {
  const select = document.createElement('select');
  select.id = `gui-input-${element.id}`;
  select.name = element.name;
  select.className = 'gui-select';
  select.disabled = element.disabled ?? false;

  const currentValue = String(data[element.name] ?? element.value ?? '');

  for (const option of element.options ?? []) {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    opt.disabled = option.disabled ?? false;
    opt.selected = option.value === currentValue;
    select.appendChild(opt);
  }

  if (onChange) {
    select.addEventListener('change', () => {
      onChange(element.name, select.value);
    });
  }

  return select;
}

function createRadioGroup(
  element: InputElement,
  data: Record<string, unknown>,
  onChange?: (name: string, value: unknown) => void
): HTMLElement {
  const group = document.createElement('div');
  group.className = 'gui-radio-group';

  const currentValue = String(data[element.name] ?? element.value ?? '');

  for (const option of element.options ?? []) {
    const wrapper = document.createElement('label');
    wrapper.className = 'gui-radio-option';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = element.name;
    radio.value = option.value;
    radio.checked = option.value === currentValue;
    radio.disabled = element.disabled ?? option.disabled ?? false;

    if (onChange) {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          onChange(element.name, radio.value);
        }
      });
    }

    const labelText = document.createElement('span');
    labelText.className = 'gui-radio-label';
    labelText.textContent = option.label;

    wrapper.appendChild(radio);
    wrapper.appendChild(labelText);
    group.appendChild(wrapper);
  }

  return group;
}

function createCheckbox(
  element: InputElement,
  data: Record<string, unknown>,
  onChange?: (name: string, value: unknown) => void
): HTMLElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'gui-checkbox-wrapper';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `gui-input-${element.id}`;
  checkbox.name = element.name;
  checkbox.className = 'gui-checkbox';
  checkbox.disabled = element.disabled ?? false;

  const value = data[element.name] ?? element.value ?? false;
  checkbox.checked = Boolean(value);

  if (onChange) {
    checkbox.addEventListener('change', () => {
      onChange(element.name, checkbox.checked);
    });
  }

  wrapper.appendChild(checkbox);

  if (element.label) {
    const labelText = document.createElement('span');
    labelText.className = 'gui-checkbox-label';
    labelText.textContent = element.label;
    wrapper.appendChild(labelText);
  }

  return wrapper;
}

function createSlider(
  element: InputElement,
  data: Record<string, unknown>,
  onChange?: (name: string, value: unknown) => void
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'gui-slider-wrapper';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = `gui-input-${element.id}`;
  slider.name = element.name;
  slider.className = 'gui-slider';
  slider.disabled = element.disabled ?? false;

  slider.min = String(element.min ?? 0);
  slider.max = String(element.max ?? 100);
  slider.step = String(element.step ?? 1);

  const value = data[element.name] ?? element.value ?? element.min ?? 0;
  slider.value = String(value);

  const valueDisplay = document.createElement('span');
  valueDisplay.className = 'gui-slider-value';
  valueDisplay.textContent = String(value);

  slider.addEventListener('input', () => {
    valueDisplay.textContent = slider.value;
    if (onChange) {
      onChange(element.name, parseFloat(slider.value));
    }
  });

  wrapper.appendChild(slider);
  wrapper.appendChild(valueDisplay);

  return wrapper;
}

function createButton(element: InputElement): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = `gui-input-${element.id}`;
  button.className = `gui-btn gui-btn-${element.variant ?? 'secondary'}`;
  button.disabled = element.disabled ?? false;
  button.textContent = element.label ?? 'Button';
  button.dataset.action = element.action ?? 'custom';
  button.dataset.customAction = element.customAction ?? '';

  return button;
}

function createHiddenInput(
  element: InputElement,
  data: Record<string, unknown>
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = element.name;
  input.value = String(data[element.name] ?? element.value ?? '');
  return input;
}

// =============================================================================
// Display Element Renderers
// =============================================================================

export function renderDisplayElement(element: DisplayElement): HTMLElement {
  let el: HTMLElement;

  switch (element.type) {
    case 'text':
      el = createTextDisplay(element);
      break;
    case 'heading':
      el = createHeading(element);
      break;
    case 'paragraph':
      el = createParagraph(element);
      break;
    case 'divider':
      el = createDivider(element);
      break;
    case 'image':
      el = createImage(element);
      break;
    case 'icon':
      el = createIcon(element);
      break;
    case 'spacer':
      el = createSpacer(element);
      break;
    case 'progress':
      el = createProgressBar(element);
      break;
    case 'html':
      el = createHtmlContent(element);
      break;
    default:
      el = document.createElement('span');
      el.textContent = `Unknown display type: ${element.type}`;
  }

  el.id = `gui-display-${element.id}`;
  if (element.className) {
    el.classList.add(element.className);
  }
  if (element.visible === false) {
    el.style.display = 'none';
  }
  applyStyle(el, element.style);

  return el;
}

function createTextDisplay(element: DisplayElement): HTMLElement {
  const span = document.createElement('span');
  span.className = 'gui-text';
  span.textContent = element.content ?? '';
  return span;
}

function createHeading(element: DisplayElement): HTMLElement {
  const level = element.level ?? 2;
  const tag = `h${Math.min(Math.max(level, 1), 6)}` as keyof HTMLElementTagNameMap;
  const heading = document.createElement(tag);
  heading.className = 'gui-heading';
  heading.textContent = element.content ?? '';
  return heading;
}

function createParagraph(element: DisplayElement): HTMLElement {
  const p = document.createElement('p');
  p.className = 'gui-paragraph';
  p.textContent = element.content ?? '';
  return p;
}

function createDivider(_element: DisplayElement): HTMLElement {
  const hr = document.createElement('hr');
  hr.className = 'gui-divider';
  return hr;
}

function createImage(element: DisplayElement): HTMLElement {
  // Wrap image in container for consistent dark vignette effect
  const wrapper = document.createElement('div');
  wrapper.className = 'gui-image-wrapper';

  const img = document.createElement('img');
  img.className = 'gui-image';

  // Check if src is an avatar ID and convert to SVG data URI
  let src = element.src ?? '';
  if (src && AVATARS[src]) {
    const svgContent = AVATARS[src];
    src = `data:image/svg+xml;base64,${btoa(svgContent)}`;
  }

  img.src = src;
  img.alt = element.alt ?? '';

  wrapper.appendChild(img);
  return wrapper;
}

function createIcon(element: DisplayElement): HTMLElement {
  const span = document.createElement('span');
  span.className = 'gui-icon';
  span.textContent = element.content ?? '';
  return span;
}

function createSpacer(_element: DisplayElement): HTMLElement {
  const div = document.createElement('div');
  div.className = 'gui-spacer';
  return div;
}

function createProgressBar(element: DisplayElement): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'gui-progress';

  const fill = document.createElement('div');
  fill.className = 'gui-progress-fill';
  fill.style.width = `${Math.min(Math.max(element.progress ?? 0, 0), 100)}%`;

  if (element.progressColor) {
    fill.style.backgroundColor = element.progressColor;
  }

  wrapper.appendChild(fill);
  return wrapper;
}

function createHtmlContent(element: DisplayElement): HTMLElement {
  const div = document.createElement('div');
  div.className = 'gui-html';
  // Note: This allows HTML content - use with caution
  div.innerHTML = element.content ?? '';

  // Execute any script tags (innerHTML doesn't execute them automatically)
  const scripts = div.querySelectorAll('script');
  scripts.forEach((oldScript) => {
    const newScript = document.createElement('script');
    // Copy attributes
    Array.from(oldScript.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value);
    });
    // Copy content
    newScript.textContent = oldScript.textContent;
    // Replace old script with new one to execute it
    oldScript.parentNode?.replaceChild(newScript, oldScript);
  });

  return div;
}
