/**
 * GUI Modal System Types (Client-side)
 *
 * These types mirror the server-side definitions in mudlib/lib/gui-types.ts
 */

// =============================================================================
// Modal Configuration
// =============================================================================

export type ModalSize = 'small' | 'medium' | 'large' | 'fullscreen' | 'auto';

export interface ModalConfig {
  id: string;
  title: string;
  subtitle?: string;
  size?: ModalSize;
  width?: string;
  height?: string;
  closable?: boolean;
  escapable?: boolean;
  backgroundImage?: string;
  backgroundColor?: string;
  headerStyle?: ElementStyle;
  bodyStyle?: ElementStyle;
  footerStyle?: ElementStyle;
}

// =============================================================================
// Styling
// =============================================================================

export interface ElementStyle {
  width?: string;
  height?: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;
  padding?: string;
  margin?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  border?: string;
  borderRadius?: string;
  opacity?: number;
  flex?: string;
  flexGrow?: number;
  flexShrink?: number;
  alignItems?: string;
  justifyContent?: string;
  flexDirection?: string;
  gridColumn?: string;
  gridRow?: string;
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  display?: string;
  gap?: string;
  cursor?: string;
}

// =============================================================================
// Validation
// =============================================================================

export type ValidationType =
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'min'
  | 'max'
  | 'pattern'
  | 'email'
  | 'custom';

export interface ValidationRule {
  type: ValidationType;
  value?: string | number;
  message?: string;
}

// =============================================================================
// Layout Types
// =============================================================================

export type LayoutType = 'vertical' | 'horizontal' | 'grid' | 'tabs' | 'form';

export interface LayoutContainer {
  type: LayoutType;
  id?: string;
  style?: ElementStyle;
  className?: string;
  gap?: string;
  columns?: number | string;
  rows?: string;
  children: Array<LayoutContainer | InputElement | DisplayElement>;
  tabLabel?: string;
  tabId?: string;
  tabIcon?: string;
}

// =============================================================================
// Input Elements
// =============================================================================

export type InputType =
  | 'text'
  | 'password'
  | 'textarea'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'button'
  | 'slider'
  | 'color'
  | 'hidden';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: string;
}

export interface InputElement {
  type: InputType;
  id: string;
  name: string;
  label?: string;
  placeholder?: string;
  value?: string | number | boolean;
  options?: SelectOption[];
  validation?: ValidationRule[];
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  disabled?: boolean;
  readOnly?: boolean;
  style?: ElementStyle;
  className?: string;
  visible?: boolean;
  action?: ButtonAction;
  customAction?: string;
  variant?: ButtonVariant;
}

// =============================================================================
// Display Elements
// =============================================================================

export type DisplayType =
  | 'text'
  | 'heading'
  | 'paragraph'
  | 'divider'
  | 'image'
  | 'icon'
  | 'spacer'
  | 'progress'
  | 'html';

export interface DisplayElement {
  type: DisplayType;
  id: string;
  content?: string;
  src?: string;
  alt?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  progress?: number;
  progressColor?: string;
  style?: ElementStyle;
  className?: string;
  visible?: boolean;
}

// =============================================================================
// Buttons
// =============================================================================

export type ButtonAction = 'submit' | 'cancel' | 'custom' | 'navigate';
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';

export interface ModalButton {
  id: string;
  label: string;
  action: ButtonAction;
  variant?: ButtonVariant;
  disabled?: boolean;
  customAction?: string;
  icon?: string;
}

// =============================================================================
// Messages
// =============================================================================

export interface GUIOpenMessage {
  action: 'open';
  modal: ModalConfig;
  layout: LayoutContainer;
  buttons?: ModalButton[];
  data?: Record<string, unknown>;
}

export interface GUIUpdateMessage {
  action: 'update';
  modalId: string;
  updates: {
    elements?: Record<string, Partial<InputElement | DisplayElement>>;
    data?: Record<string, unknown>;
    buttons?: ModalButton[];
    title?: string;
    subtitle?: string;
  };
}

export interface GUICloseMessage {
  action: 'close';
  modalId: string;
  reason?: string;
}

export interface GUIErrorMessage {
  action: 'error';
  modalId: string;
  errors: Record<string, string>;
  globalError?: string;
}

export type GUIServerMessage =
  | GUIOpenMessage
  | GUIUpdateMessage
  | GUICloseMessage
  | GUIErrorMessage;

export interface GUISubmitMessage {
  action: 'submit';
  modalId: string;
  buttonId: string;
  data: Record<string, unknown>;
}

export interface GUIButtonMessage {
  action: 'button';
  modalId: string;
  buttonId: string;
  customAction?: string;
  data?: Record<string, unknown>;
}

export interface GUIClosedMessage {
  action: 'closed';
  modalId: string;
  reason: 'escape' | 'close-button' | 'backdrop' | 'cancel';
}

export type GUIClientMessage =
  | GUISubmitMessage
  | GUIButtonMessage
  | GUIClosedMessage;

export type GUIMessage = GUIServerMessage | GUIClientMessage;

// =============================================================================
// Type Guards
// =============================================================================

const INPUT_TYPES: InputType[] = [
  'text', 'password', 'textarea', 'number', 'select',
  'radio', 'checkbox', 'button', 'slider', 'color', 'hidden'
];

const DISPLAY_TYPES: DisplayType[] = [
  'text', 'heading', 'paragraph', 'divider', 'image',
  'icon', 'spacer', 'progress', 'html'
];

export function isInputElement(
  element: InputElement | DisplayElement | LayoutContainer
): element is InputElement {
  return 'name' in element && INPUT_TYPES.includes(element.type as InputType);
}

export function isDisplayElement(
  element: InputElement | DisplayElement | LayoutContainer
): element is DisplayElement {
  return !('name' in element) && !('children' in element) && DISPLAY_TYPES.includes(element.type as DisplayType);
}

export function isLayoutContainer(
  element: InputElement | DisplayElement | LayoutContainer
): element is LayoutContainer {
  return 'children' in element;
}
