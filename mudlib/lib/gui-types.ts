/**
 * GUI Modal System Types
 *
 * Shared type definitions for the server-driven GUI modal system.
 * These types are used by both the server (mudlib) and client.
 */

// =============================================================================
// Modal Configuration
// =============================================================================

/** Modal size presets */
export type ModalSize = 'small' | 'medium' | 'large' | 'fullscreen' | 'auto';

/** Modal configuration */
export interface ModalConfig {
  /** Unique identifier for this modal instance */
  id: string;
  /** Title displayed in the modal header */
  title: string;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Size preset for the modal */
  size?: ModalSize;
  /** Custom width (overrides size) */
  width?: string;
  /** Custom height (overrides size) */
  height?: string;
  /** Whether the modal can be closed by the user */
  closable?: boolean;
  /** Whether pressing Escape closes the modal */
  escapable?: boolean;
  /** Background image URL for the modal */
  backgroundImage?: string;
  /** Background color for the modal */
  backgroundColor?: string;
  /** Custom styles for the header */
  headerStyle?: ElementStyle;
  /** Custom styles for the body */
  bodyStyle?: ElementStyle;
  /** Custom styles for the footer */
  footerStyle?: ElementStyle;
}

// =============================================================================
// Styling
// =============================================================================

/** Style properties for elements (subset of CSS) */
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
  overflowY?: 'visible' | 'hidden' | 'scroll' | 'auto';
  display?: string;
  gap?: string;
  cursor?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  lineHeight?: string;
  textTransform?: string;
}

// =============================================================================
// Validation
// =============================================================================

/** Validation rule types */
export type ValidationType =
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'min'
  | 'max'
  | 'pattern'
  | 'email'
  | 'custom';

/** Validation rule definition */
export interface ValidationRule {
  type: ValidationType;
  /** Value for the rule (e.g., min length, regex pattern) */
  value?: string | number;
  /** Custom error message */
  message?: string;
}

// =============================================================================
// Layout Types
// =============================================================================

/** Layout container types */
export type LayoutType = 'vertical' | 'horizontal' | 'grid' | 'tabs' | 'form';

/** Tooltip configuration */
export interface TooltipConfig {
  /** Tooltip content (plain text or HTML) */
  content: string;
  /** Whether content is HTML (default: false) */
  html?: boolean;
  /** Tooltip position preference */
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /** Maximum width of tooltip */
  maxWidth?: string;
}

/** Layout container definition */
export interface LayoutContainer {
  type: LayoutType;
  /** Optional ID for the container */
  id?: string;
  /** Custom styles */
  style?: ElementStyle;
  /** CSS class name */
  className?: string;
  /** Gap between children (CSS gap value) */
  gap?: string;
  /** Grid columns (number or CSS grid-template-columns value) */
  columns?: number | string;
  /** Grid rows (CSS grid-template-rows value) */
  rows?: string;
  /** Child elements */
  children: Array<LayoutContainer | InputElement | DisplayElement>;
  /** For tabs layout: tab label */
  tabLabel?: string;
  /** For tabs layout: tab ID */
  tabId?: string;
  /** For tabs layout: tab icon */
  tabIcon?: string;
  /** For tabs layout: default active tab (index or tabId) */
  defaultTab?: number | string;
  /** Tooltip to show on hover */
  tooltip?: string | TooltipConfig;
}

// =============================================================================
// Input Elements
// =============================================================================

/** Input element types */
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

/** Option for select, radio elements */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: string;
}

/** Input element definition */
export interface InputElement {
  /** Element type */
  type: InputType;
  /** Unique identifier */
  id: string;
  /** Form field name (used for data collection) */
  name: string;
  /** Label displayed above/beside the input */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Default/current value */
  value?: string | number | boolean;
  /** Options for select/radio elements */
  options?: SelectOption[];
  /** Validation rules */
  validation?: ValidationRule[];
  /** Minimum value (for number/slider) */
  min?: number;
  /** Maximum value (for number/slider) */
  max?: number;
  /** Step value (for number/slider) */
  step?: number;
  /** Number of rows (for textarea) */
  rows?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the input is read-only */
  readOnly?: boolean;
  /** Custom styles */
  style?: ElementStyle;
  /** CSS class name */
  className?: string;
  /** Whether element is visible */
  visible?: boolean;
  /** For button: the action to perform */
  action?: ButtonAction;
  /** For button: custom action name */
  customAction?: string;
  /** For button: button variant style */
  variant?: ButtonVariant;
}

// =============================================================================
// Display Elements
// =============================================================================

/** Display element types */
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

/** Display element definition */
export interface DisplayElement {
  /** Element type */
  type: DisplayType;
  /** Unique identifier */
  id: string;
  /** Text content */
  content?: string;
  /** Image source URL */
  src?: string;
  /** Alt text for images */
  alt?: string;
  /** Heading level (1-6) */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Progress value (0-100) */
  progress?: number;
  /** Progress bar color */
  progressColor?: string;
  /** Custom styles */
  style?: ElementStyle;
  /** CSS class name */
  className?: string;
  /** Whether element is visible */
  visible?: boolean;
  /** Tooltip to show on hover */
  tooltip?: string | TooltipConfig;
}

// =============================================================================
// Buttons
// =============================================================================

/** Button action types */
export type ButtonAction = 'submit' | 'cancel' | 'custom' | 'navigate';

/** Button visual variants */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';

/** Modal footer button definition */
export interface ModalButton {
  /** Button identifier */
  id: string;
  /** Button label text */
  label: string;
  /** Action to perform when clicked */
  action: ButtonAction;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Custom action name (for action: 'custom') */
  customAction?: string;
  /** Icon to display */
  icon?: string;
}

// =============================================================================
// Server -> Client Messages
// =============================================================================

/** Open a new modal */
export interface GUIOpenMessage {
  action: 'open';
  /** Modal configuration */
  modal: ModalConfig;
  /** Layout structure */
  layout: LayoutContainer;
  /** Footer buttons */
  buttons?: ModalButton[];
  /** Initial form data */
  data?: Record<string, unknown>;
}

/** Update an existing modal */
export interface GUIUpdateMessage {
  action: 'update';
  /** ID of the modal to update */
  modalId: string;
  /** Updates to apply */
  updates: {
    /** Element property updates (keyed by element ID) */
    elements?: Record<string, Partial<InputElement | DisplayElement>>;
    /** Form data updates */
    data?: Record<string, unknown>;
    /** Button updates */
    buttons?: ModalButton[];
    /** Update modal title */
    title?: string;
    /** Update modal subtitle */
    subtitle?: string;
  };
}

/** Close a modal */
export interface GUICloseMessage {
  action: 'close';
  /** ID of the modal to close */
  modalId: string;
  /** Optional reason for closing */
  reason?: string;
}

/** Show validation errors */
export interface GUIErrorMessage {
  action: 'error';
  /** ID of the modal */
  modalId: string;
  /** Field-level errors (keyed by field name) */
  errors: Record<string, string>;
  /** Global error message */
  globalError?: string;
}

/** Union of all server -> client messages */
export type GUIServerMessage =
  | GUIOpenMessage
  | GUIUpdateMessage
  | GUICloseMessage
  | GUIErrorMessage;

// =============================================================================
// Client -> Server Messages
// =============================================================================

/** Form submission */
export interface GUISubmitMessage {
  action: 'submit';
  /** ID of the modal */
  modalId: string;
  /** ID of the button that triggered submission */
  buttonId: string;
  /** Form data */
  data: Record<string, unknown>;
}

/** Button click (non-submit) */
export interface GUIButtonMessage {
  action: 'button';
  /** ID of the modal */
  modalId: string;
  /** ID of the button clicked */
  buttonId: string;
  /** Custom action name if applicable */
  customAction?: string;
  /** Current form data */
  data?: Record<string, unknown>;
}

/** Modal closed by user */
export interface GUIClosedMessage {
  action: 'closed';
  /** ID of the modal */
  modalId: string;
  /** How the modal was closed */
  reason: 'escape' | 'close-button' | 'backdrop' | 'cancel';
}

/** Union of all client -> server messages */
export type GUIClientMessage =
  | GUISubmitMessage
  | GUIButtonMessage
  | GUIClosedMessage;

/** Union of all GUI messages */
export type GUIMessage = GUIServerMessage | GUIClientMessage;

// =============================================================================
// Type Guards
// =============================================================================

/** Check if an element is an input element */
export function isInputElement(
  element: InputElement | DisplayElement | LayoutContainer
): element is InputElement {
  const inputTypes: InputType[] = [
    'text',
    'password',
    'textarea',
    'number',
    'select',
    'radio',
    'checkbox',
    'button',
    'slider',
    'color',
    'hidden',
  ];
  return 'name' in element && inputTypes.includes(element.type as InputType);
}

/** Check if an element is a display element */
export function isDisplayElement(
  element: InputElement | DisplayElement | LayoutContainer
): element is DisplayElement {
  const displayTypes: DisplayType[] = [
    'text',
    'heading',
    'paragraph',
    'divider',
    'image',
    'icon',
    'spacer',
    'progress',
    'html',
  ];
  return !('name' in element) && !('children' in element) && displayTypes.includes(element.type as DisplayType);
}

/** Check if an element is a layout container */
export function isLayoutContainer(
  element: InputElement | DisplayElement | LayoutContainer
): element is LayoutContainer {
  return 'children' in element;
}

/** Check if a message is a server message */
export function isServerMessage(message: GUIMessage): message is GUIServerMessage {
  return ['open', 'update', 'close', 'error'].includes(message.action);
}

/** Check if a message is a client message */
export function isClientMessage(message: GUIMessage): message is GUIClientMessage {
  return ['submit', 'button', 'closed'].includes(message.action);
}
