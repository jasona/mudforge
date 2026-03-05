import type {
  DisplayElement,
  GUIClientMessage,
  GUIOpenMessage,
  InputElement,
  LayoutContainer,
  ModalButton,
} from './gui-types.js';
import type { MudObject } from './std.js';

export const THEME_MODAL_ID = 'theme-modal';

export const THEME_COLOR_VARS = [
  '--bg-primary',
  '--bg-secondary',
  '--bg-tertiary',
  '--bg-hover',
  '--bg-terminal',
  '--border-primary',
  '--border-subtle',
  '--text-primary',
  '--text-secondary',
  '--text-tertiary',
  '--accent',
  '--accent-hover',
] as const;

export type ThemeColorVar = (typeof THEME_COLOR_VARS)[number];
export type ThemeColors = Partial<Record<ThemeColorVar, string>>;

const THEME_DEFAULTS_FALLBACK: Record<ThemeColorVar, string> = {
  '--bg-primary': '#0d0d0f',
  '--bg-secondary': '#141416',
  '--bg-tertiary': '#1a1a1f',
  '--bg-hover': '#222228',
  '--bg-terminal': '#0a0a0c',
  '--border-primary': '#2a2a30',
  '--border-subtle': '#1f1f24',
  '--text-primary': '#f5f5f5',
  '--text-secondary': '#8b8b8e',
  '--text-tertiary': '#5c5c60',
  '--accent': '#5e6ad2',
  '--accent-hover': '#7c85e0',
};

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

interface ThemeModalPlayer extends MudObject {
  name: string;
  permissionLevel?: number;
  onGUIResponse?: (message: GUIClientMessage) => void | Promise<void>;
  getProperty?: (key: string) => unknown;
  setProperty: (key: string, value: unknown) => void;
}

function normalizeThemeColors(raw: unknown): ThemeColors {
  const normalized: ThemeColors = {};
  if (!raw || typeof raw !== 'object') {
    return normalized;
  }

  for (const varName of THEME_COLOR_VARS) {
    const value = (raw as Record<string, unknown>)[varName];
    if (typeof value === 'string' && HEX_COLOR_RE.test(value.trim())) {
      normalized[varName] = value.trim();
    }
  }

  return normalized;
}

export async function loadDefaultThemeColors(): Promise<ThemeColors> {
  if (typeof efuns === 'undefined' || !efuns.loadData) {
    return { ...THEME_DEFAULTS_FALLBACK };
  }

  try {
    const saved = await efuns.loadData<unknown>('config', 'theme-defaults');
    const normalized = normalizeThemeColors(saved);
    return { ...THEME_DEFAULTS_FALLBACK, ...normalized };
  } catch {
    return { ...THEME_DEFAULTS_FALLBACK };
  }
}

export async function resolveThemeColorsForPlayer(player: ThemeModalPlayer): Promise<ThemeColors> {
  const defaults = await loadDefaultThemeColors();
  const playerTheme = normalizeThemeColors(player.getProperty?.('themeColors'));
  return { ...defaults, ...playerTheme };
}

function buildColorInput(varName: ThemeColorVar, label: string, value: string): InputElement {
  return {
    type: 'color',
    id: `theme-${varName.replace(/^-+/, '').replace(/-/g, '_')}`,
    name: varName,
    label,
    value,
  };
}

function buildSection(
  id: string,
  title: string,
  fields: Array<{ varName: ThemeColorVar; label: string }>,
  colors: ThemeColors
): LayoutContainer {
  return {
    type: 'vertical',
    id,
    gap: '8px',
    children: [
      {
        type: 'heading',
        id: `${id}-heading`,
        content: title,
        level: 4,
      } as DisplayElement,
      {
        type: 'grid',
        id: `${id}-grid`,
        columns: 2,
        gap: '10px',
        children: fields.map((field) =>
          buildColorInput(field.varName, field.label, colors[field.varName] ?? THEME_DEFAULTS_FALLBACK[field.varName])
        ),
      },
    ],
  };
}

export async function openThemeModal(
  player: ThemeModalPlayer,
  isAdmin: boolean,
  sendLine: (message: string) => void
): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    sendLine('{red}GUI is not available.{/}');
    return;
  }

  const currentColors = await resolveThemeColorsForPlayer(player);

  const layout: LayoutContainer = {
    type: 'vertical',
    id: 'theme-root',
    gap: '14px',
    children: [
      {
        type: 'paragraph',
        id: 'theme-help',
        content: 'Adjust the client color palette. Changes preview live while this modal is open.',
      } as DisplayElement,
      buildSection(
        'theme-bg',
        'Backgrounds',
        [
          { varName: '--bg-primary', label: 'Primary' },
          { varName: '--bg-secondary', label: 'Secondary' },
          { varName: '--bg-tertiary', label: 'Tertiary' },
          { varName: '--bg-hover', label: 'Hover' },
          { varName: '--bg-terminal', label: 'Terminal' },
        ],
        currentColors
      ),
      buildSection(
        'theme-border',
        'Borders',
        [
          { varName: '--border-primary', label: 'Primary' },
          { varName: '--border-subtle', label: 'Subtle' },
        ],
        currentColors
      ),
      buildSection(
        'theme-text',
        'Text',
        [
          { varName: '--text-primary', label: 'Primary' },
          { varName: '--text-secondary', label: 'Secondary' },
          { varName: '--text-tertiary', label: 'Tertiary' },
        ],
        currentColors
      ),
      buildSection(
        'theme-accent',
        'Accent',
        [
          { varName: '--accent', label: 'Accent' },
          { varName: '--accent-hover', label: 'Accent Hover' },
        ],
        currentColors
      ),
    ],
  };

  const buttons: ModalButton[] = [
    {
      id: 'reset-defaults',
      label: 'Reset Defaults',
      action: 'custom',
      customAction: 'reset-defaults',
      variant: 'ghost',
    },
  ];

  if (isAdmin) {
    buttons.push({
      id: 'set-as-default',
      label: 'Set as Default',
      action: 'custom',
      customAction: 'set-as-default',
      variant: 'secondary',
    });
  }

  buttons.push(
    {
      id: 'cancel',
      label: 'Cancel',
      action: 'cancel',
      variant: 'secondary',
    },
    {
      id: 'save',
      label: 'Save',
      action: 'submit',
      variant: 'primary',
    }
  );

  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: THEME_MODAL_ID,
      title: 'Theme Customization',
      size: 'medium',
      closable: true,
      escapable: true,
    },
    layout,
    buttons,
    data: currentColors as Record<string, unknown>,
  };

  player.onGUIResponse = async (response: GUIClientMessage) => {
    if ((response as { modalId?: string }).modalId !== THEME_MODAL_ID) {
      return;
    }

    if (response.action === 'submit') {
      const colors = normalizeThemeColors(response.data);
      player.setProperty('themeColors', colors);
      if (efuns.sendTheme) {
        efuns.sendTheme(player, colors as Record<string, string>);
      }

      efuns.guiSend({ action: 'close', modalId: THEME_MODAL_ID });
      sendLine('{green}Theme saved.{/}');
      player.onGUIResponse = undefined;
      return;
    }

    if (response.action === 'button') {
      if (response.customAction === 'reset-defaults') {
        player.setProperty('themeColors', null);
        const defaults = await loadDefaultThemeColors();
        if (efuns.sendTheme) {
          efuns.sendTheme(player, defaults as Record<string, string>);
        }
        await openThemeModal(player, isAdmin, sendLine);
        return;
      }

      if (response.customAction === 'set-as-default') {
        if (!isAdmin) {
          sendLine('{red}Only admins can set global defaults.{/}');
          return;
        }

        const colors = normalizeThemeColors(response.data);
        if (efuns.saveData) {
          await efuns.saveData('config', 'theme-defaults', colors);
          sendLine('{green}Theme saved as global default.{/}');
        }
        if (efuns.sendTheme) {
          efuns.sendTheme(player, colors as Record<string, string>);
        }
      }
      return;
    }

    if (response.action === 'closed') {
      player.onGUIResponse = undefined;
    }
  };

  efuns.guiSend(message);
}
