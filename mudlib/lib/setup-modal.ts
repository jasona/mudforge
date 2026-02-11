/**
 * Setup Modal - Build the admin setup GUI modal.
 *
 * Creates a tabbed modal for reconfiguring game identity and mechanics
 * from within the game. Used by the `setup` admin command.
 */

import type {
  GUIOpenMessage,
  GUIClientMessage,
  LayoutContainer,
  InputElement,
  DisplayElement,
  ModalButton,
} from './gui-types.js';

/** Game config data */
interface GameConfigData {
  name: string;
  tagline: string;
  description: string;
  website: string;
  establishedYear: number;
}

/** Config setting with metadata */
interface ConfigSettingInfo {
  value: unknown;
  description: string;
  type: 'number' | 'string' | 'boolean';
  min?: number;
  max?: number;
}

/** Player interface for GUI */
interface SetupPlayer {
  name: string;
  onGUIResponse?: (msg: GUIClientMessage) => void;
}

/** Config daemon interface */
interface ConfigDaemonInterface {
  get<T>(key: string): T | undefined;
  set(key: string, value: unknown): { success: boolean; error?: string };
  getAll(): Record<string, ConfigSettingInfo>;
  save(): Promise<void>;
}

/**
 * Open the setup modal for an admin player.
 */
export async function openSetupModal(
  player: SetupPlayer,
  gameConfig: GameConfigData,
  configDaemon: ConfigDaemonInterface,
  sendLine: (msg: string) => void,
): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    sendLine('{red}GUI not available.{/}');
    return;
  }

  const allSettings = configDaemon.getAll();

  // Build Game Identity tab
  const identityChildren: Array<InputElement | DisplayElement | LayoutContainer> = [
    {
      type: 'text' as const,
      id: 'setup-info',
      content: 'Update your game\'s branding and identity.',
    } as DisplayElement,
    {
      type: 'text' as const,
      id: 'game-name',
      name: 'game.name',
      label: 'Game Name',
      value: gameConfig.name,
      validation: [{ type: 'required', message: 'Game name is required' }],
    } as InputElement,
    {
      type: 'text' as const,
      id: 'game-tagline',
      name: 'game.tagline',
      label: 'Tagline',
      value: gameConfig.tagline,
    } as InputElement,
    {
      type: 'textarea' as const,
      id: 'game-description',
      name: 'game.description',
      label: 'Description',
      value: gameConfig.description,
      rows: 3,
    } as InputElement,
    {
      type: 'text' as const,
      id: 'game-website',
      name: 'game.website',
      label: 'Website URL',
      value: gameConfig.website,
    } as InputElement,
    {
      type: 'number' as const,
      id: 'game-year',
      name: 'game.establishedYear',
      label: 'Established Year',
      value: gameConfig.establishedYear,
      min: 1990,
      max: 2099,
    } as InputElement,
  ];

  // Build Game Mechanics tab
  const mechanicsChildren: Array<InputElement | DisplayElement | LayoutContainer> = [
    {
      type: 'text' as const,
      id: 'mechanics-info',
      content: 'Configure gameplay settings for your game.',
    } as DisplayElement,
  ];

  // Add each config setting as an input
  const sortedKeys = Object.keys(allSettings).sort();
  for (const key of sortedKeys) {
    const setting = allSettings[key];
    const inputId = `config-${key.replace(/\./g, '-')}`;

    if (setting.type === 'boolean') {
      mechanicsChildren.push({
        type: 'checkbox' as const,
        id: inputId,
        name: `config.${key}`,
        label: `${formatSettingKey(key)} — ${setting.description}`,
        value: setting.value as boolean,
      } as InputElement);
    } else if (setting.type === 'number') {
      mechanicsChildren.push({
        type: 'number' as const,
        id: inputId,
        name: `config.${key}`,
        label: `${formatSettingKey(key)} — ${setting.description}`,
        value: setting.value as number,
        min: setting.min,
        max: setting.max,
      } as InputElement);
    } else {
      mechanicsChildren.push({
        type: 'text' as const,
        id: inputId,
        name: `config.${key}`,
        label: `${formatSettingKey(key)} — ${setting.description}`,
        value: setting.value as string,
      } as InputElement);
    }
  }

  const layout: LayoutContainer = {
    type: 'tabs',
    id: 'setup-tabs',
    children: [
      {
        type: 'vertical',
        id: 'identity-tab',
        tabLabel: 'Game Identity',
        tabId: 'identity',
        gap: '12px',
        children: identityChildren,
      },
      {
        type: 'vertical',
        id: 'mechanics-tab',
        tabLabel: 'Game Mechanics',
        tabId: 'mechanics',
        gap: '12px',
        children: mechanicsChildren,
      },
    ],
  };

  const buttons: ModalButton[] = [
    {
      id: 'cancel',
      label: 'Cancel',
      action: 'cancel',
      variant: 'secondary',
    },
    {
      id: 'save',
      label: 'Save Changes',
      action: 'submit',
      variant: 'primary',
    },
  ];

  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: 'setup-modal',
      title: 'Game Setup',
      subtitle: 'Configure your game settings',
      size: 'large',
      closable: true,
      escapable: true,
    },
    layout,
    buttons,
  };

  // Set up response handler
  player.onGUIResponse = async (response: GUIClientMessage) => {
    try {
      if (response.action === 'submit') {
        const data = response.data;
        let changes = 0;

        // Update game identity
        const gameFields: Record<string, string> = {
          'game.name': 'name',
          'game.tagline': 'tagline',
          'game.description': 'description',
          'game.website': 'website',
        };

        const updatedConfig: Record<string, unknown> = {};
        for (const [formKey, configKey] of Object.entries(gameFields)) {
          if (formKey in data && data[formKey] !== undefined) {
            updatedConfig[configKey] = String(data[formKey]);
            changes++;
          }
        }

        if ('game.establishedYear' in data) {
          updatedConfig['establishedYear'] = Number(data['game.establishedYear']);
          changes++;
        }

        // Write game.json if there are game identity changes
        if (Object.keys(updatedConfig).length > 0) {
          try {
            const configPath = '/config/game.json';
            let existing: Record<string, unknown> = {};
            try {
              const content = await efuns.readFile(configPath);
              existing = JSON.parse(content);
            } catch {
              // No existing config
            }
            const merged = { ...existing, ...updatedConfig };
            await efuns.writeFile(configPath, JSON.stringify(merged, null, 2));
            efuns.reloadGameConfig();
          } catch (err) {
            sendLine(`{red}Failed to save game config: ${err}{/}`);
          }
        }

        // Update config daemon settings
        for (const [formKey, value] of Object.entries(data)) {
          if (formKey.startsWith('config.')) {
            const settingKey = formKey.substring(7); // Remove 'config.' prefix
            const result = configDaemon.set(settingKey, value);
            if (result.success) {
              changes++;
            } else {
              sendLine(`{yellow}Warning: ${result.error}{/}`);
            }
          }
        }

        // Save config daemon to disk
        try {
          await configDaemon.save();
        } catch (err) {
          sendLine(`{yellow}Warning: Failed to save config: ${err}{/}`);
        }

        sendLine(`{green}Setup saved. ${changes} setting(s) updated.{/}`);
      }

      if (response.action === 'closed' || response.action === 'submit') {
        player.onGUIResponse = undefined;
      }
    } catch (err) {
      sendLine(`{red}Error saving setup: ${err}{/}`);
      player.onGUIResponse = undefined;
    }
  };

  efuns.guiSend(message);
}

/**
 * Format a setting key for display.
 * "combat.playerKilling" -> "Player Killing"
 */
function formatSettingKey(key: string): string {
  const part = key.split('.').pop() || key;
  return part
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}
