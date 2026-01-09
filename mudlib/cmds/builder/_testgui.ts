/**
 * testgui - Test command for GUI modal system.
 *
 * Usage:
 *   testgui              - Show main test modal
 *   testgui form         - Show form input test
 *   testgui shop         - Show shop-style modal
 *   testgui confirm      - Show confirmation dialog
 *   testgui tabs         - Show tabbed interface
 *   testgui progress     - Show progress bar demo
 *
 * Requires builder permission (level 1) or higher.
 */

import type { MudObject } from '../../lib/std.js';
import type { GUIOpenMessage, GUIClientMessage } from '../../lib/gui-types.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['testgui', 'guitest'];
export const description = 'Test GUI modal system (builder+)';
export const usage = 'testgui [form|shop|confirm|tabs|progress]';

/**
 * Show the main test modal with various elements.
 */
function showMainTest(ctx: CommandContext): void {
  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: 'test-main',
      title: 'GUI Modal Test',
      subtitle: 'Testing all the things',
      size: 'medium',
      closable: true,
      escapable: true,
    },
    layout: {
      type: 'vertical',
      gap: '16px',
      children: [
        {
          type: 'heading',
          id: 'welcome-heading',
          content: 'Welcome to the GUI System!',
          level: 2,
        },
        {
          type: 'paragraph',
          id: 'intro-text',
          content: 'This modal demonstrates the various GUI elements available. Try the different test modes to see more features.',
        },
        {
          type: 'divider',
          id: 'div1',
        },
        {
          type: 'horizontal',
          gap: '16px',
          children: [
            {
              type: 'vertical',
              gap: '8px',
              style: { flex: '1' },
              children: [
                {
                  type: 'text',
                  id: 'label1',
                  content: 'Text Input:',
                  style: { fontWeight: 'bold' },
                },
                {
                  type: 'text',
                  id: 'name-input',
                  name: 'playerName',
                  label: 'Your Name',
                  placeholder: 'Enter your name',
                  value: (ctx.player as { name?: string }).name || '',
                },
              ],
            },
            {
              type: 'vertical',
              gap: '8px',
              style: { flex: '1' },
              children: [
                {
                  type: 'text',
                  id: 'label2',
                  content: 'Number Input:',
                  style: { fontWeight: 'bold' },
                },
                {
                  type: 'number',
                  id: 'amount-input',
                  name: 'amount',
                  label: 'Amount',
                  placeholder: '0',
                  min: 0,
                  max: 1000,
                  value: 100,
                },
              ],
            },
          ],
        },
        {
          type: 'divider',
          id: 'div2',
        },
        {
          type: 'select',
          id: 'class-select',
          name: 'characterClass',
          label: 'Select a Class',
          options: [
            { value: 'warrior', label: 'Warrior' },
            { value: 'mage', label: 'Mage' },
            { value: 'rogue', label: 'Rogue' },
            { value: 'cleric', label: 'Cleric' },
          ],
          value: 'warrior',
        },
        {
          type: 'checkbox',
          id: 'agree-checkbox',
          name: 'agreeToTerms',
          label: 'I agree to the terms and conditions',
          value: false,
        },
        {
          type: 'progress',
          id: 'xp-progress',
          content: 'Experience Progress',
          progress: 65,
          progressColor: '#4CAF50',
        },
      ],
    },
    buttons: [
      { id: 'submit', label: 'Submit', action: 'submit', variant: 'primary' },
      { id: 'cancel', label: 'Cancel', action: 'cancel', variant: 'secondary' },
    ],
  };

  efuns.guiSend(message);
  ctx.sendLine('{cyan}Opening main GUI test modal...{/}');
}

/**
 * Show form input test.
 */
function showFormTest(ctx: CommandContext): void {
  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: 'test-form',
      title: 'Form Input Test',
      subtitle: 'All input types',
      size: 'large',
      closable: true,
    },
    layout: {
      type: 'form',
      gap: '12px',
      children: [
        {
          type: 'text',
          id: 'text-input',
          name: 'textField',
          label: 'Text Field',
          placeholder: 'Enter some text...',
          validation: [{ type: 'required', message: 'Text is required' }],
        },
        {
          type: 'password',
          id: 'password-input',
          name: 'passwordField',
          label: 'Password Field',
          placeholder: 'Enter password...',
        },
        {
          type: 'number',
          id: 'number-input',
          name: 'numberField',
          label: 'Number Field (1-100)',
          min: 1,
          max: 100,
          step: 1,
          value: 50,
        },
        {
          type: 'textarea',
          id: 'textarea-input',
          name: 'textareaField',
          label: 'Textarea',
          placeholder: 'Enter multiple lines of text...',
          rows: 4,
        },
        {
          type: 'select',
          id: 'select-input',
          name: 'selectField',
          label: 'Select Dropdown',
          options: [
            { value: 'option1', label: 'Option 1' },
            { value: 'option2', label: 'Option 2' },
            { value: 'option3', label: 'Option 3' },
          ],
        },
        {
          type: 'radio',
          id: 'radio-input',
          name: 'radioField',
          label: 'Radio Buttons',
          options: [
            { value: 'red', label: 'Red' },
            { value: 'green', label: 'Green' },
            { value: 'blue', label: 'Blue' },
          ],
          value: 'green',
        },
        {
          type: 'checkbox',
          id: 'checkbox-input',
          name: 'checkboxField',
          label: 'Checkbox option',
          value: true,
        },
        {
          type: 'slider',
          id: 'slider-input',
          name: 'sliderField',
          label: 'Slider (0-100)',
          min: 0,
          max: 100,
          step: 5,
          value: 50,
        },
      ],
    },
    buttons: [
      { id: 'submit', label: 'Submit Form', action: 'submit', variant: 'primary' },
      { id: 'reset', label: 'Reset', action: 'custom', customAction: 'reset', variant: 'secondary' },
      { id: 'cancel', label: 'Cancel', action: 'cancel', variant: 'ghost' },
    ],
  };

  efuns.guiSend(message);
  ctx.sendLine('{cyan}Opening form test modal...{/}');
}

/**
 * Show shop-style modal.
 */
function showShopTest(ctx: CommandContext): void {
  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: 'test-shop',
      title: 'Ye Olde Item Shoppe',
      subtitle: 'Buy and sell your wares',
      size: 'large',
      closable: true,
      headerStyle: {
        backgroundColor: '#2d1b0e',
        color: '#f4d03f',
      },
    },
    layout: {
      type: 'vertical',
      gap: '16px',
      children: [
        {
          type: 'text',
          id: 'gold-display',
          content: 'Your Gold: 1,234',
          style: {
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#f4d03f',
            textAlign: 'right',
          },
        },
        {
          type: 'grid',
          columns: 2,
          gap: '12px',
          children: [
            // Item 1
            {
              type: 'horizontal',
              gap: '12px',
              style: {
                padding: '12px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
              },
              children: [
                {
                  type: 'vertical',
                  gap: '4px',
                  style: { flex: '1' },
                  children: [
                    { type: 'text', id: 'item1-name', content: 'Iron Sword', style: { fontWeight: 'bold' } },
                    { type: 'text', id: 'item1-desc', content: 'A sturdy blade.', style: { fontSize: '12px', color: '#888' } },
                    { type: 'text', id: 'item1-price', content: '50 gold', style: { color: '#f4d03f' } },
                  ],
                },
                {
                  type: 'button',
                  id: 'buy-sword',
                  name: 'buyItem',
                  label: 'Buy',
                  action: 'custom',
                  customAction: 'buy-sword',
                  variant: 'primary',
                },
              ],
            },
            // Item 2
            {
              type: 'horizontal',
              gap: '12px',
              style: {
                padding: '12px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
              },
              children: [
                {
                  type: 'vertical',
                  gap: '4px',
                  style: { flex: '1' },
                  children: [
                    { type: 'text', id: 'item2-name', content: 'Leather Armor', style: { fontWeight: 'bold' } },
                    { type: 'text', id: 'item2-desc', content: 'Light protection.', style: { fontSize: '12px', color: '#888' } },
                    { type: 'text', id: 'item2-price', content: '75 gold', style: { color: '#f4d03f' } },
                  ],
                },
                {
                  type: 'button',
                  id: 'buy-armor',
                  name: 'buyItem',
                  label: 'Buy',
                  action: 'custom',
                  customAction: 'buy-armor',
                  variant: 'primary',
                },
              ],
            },
            // Item 3
            {
              type: 'horizontal',
              gap: '12px',
              style: {
                padding: '12px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
              },
              children: [
                {
                  type: 'vertical',
                  gap: '4px',
                  style: { flex: '1' },
                  children: [
                    { type: 'text', id: 'item3-name', content: 'Health Potion', style: { fontWeight: 'bold' } },
                    { type: 'text', id: 'item3-desc', content: 'Restores 50 HP.', style: { fontSize: '12px', color: '#888' } },
                    { type: 'text', id: 'item3-price', content: '25 gold', style: { color: '#f4d03f' } },
                  ],
                },
                {
                  type: 'button',
                  id: 'buy-potion',
                  name: 'buyItem',
                  label: 'Buy',
                  action: 'custom',
                  customAction: 'buy-potion',
                  variant: 'primary',
                },
              ],
            },
            // Item 4
            {
              type: 'horizontal',
              gap: '12px',
              style: {
                padding: '12px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
              },
              children: [
                {
                  type: 'vertical',
                  gap: '4px',
                  style: { flex: '1' },
                  children: [
                    { type: 'text', id: 'item4-name', content: 'Magic Staff', style: { fontWeight: 'bold' } },
                    { type: 'text', id: 'item4-desc', content: 'Channel arcane power.', style: { fontSize: '12px', color: '#888' } },
                    { type: 'text', id: 'item4-price', content: '150 gold', style: { color: '#f4d03f' } },
                  ],
                },
                {
                  type: 'button',
                  id: 'buy-staff',
                  name: 'buyItem',
                  label: 'Buy',
                  action: 'custom',
                  customAction: 'buy-staff',
                  variant: 'primary',
                },
              ],
            },
          ],
        },
      ],
    },
    buttons: [
      { id: 'close', label: 'Leave Shop', action: 'cancel', variant: 'secondary' },
    ],
  };

  efuns.guiSend(message);
  ctx.sendLine('{cyan}Opening shop test modal...{/}');
}

/**
 * Show confirmation dialog.
 */
function showConfirmTest(ctx: CommandContext): void {
  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: 'test-confirm',
      title: 'Confirm Action',
      size: 'small',
      closable: true,
      escapable: true,
    },
    layout: {
      type: 'vertical',
      gap: '16px',
      style: { textAlign: 'center' },
      children: [
        {
          type: 'heading',
          id: 'confirm-heading',
          content: 'Are you sure?',
          level: 3,
        },
        {
          type: 'paragraph',
          id: 'confirm-text',
          content: 'This action cannot be undone. Do you want to proceed with deleting this item?',
        },
      ],
    },
    buttons: [
      { id: 'confirm', label: 'Yes, Delete', action: 'submit', variant: 'danger' },
      { id: 'cancel', label: 'No, Cancel', action: 'cancel', variant: 'secondary' },
    ],
  };

  efuns.guiSend(message);
  ctx.sendLine('{cyan}Opening confirmation dialog...{/}');
}

/**
 * Show tabbed interface.
 */
function showTabsTest(ctx: CommandContext): void {
  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: 'test-tabs',
      title: 'Character Information',
      size: 'large',
      closable: true,
    },
    layout: {
      type: 'tabs',
      children: [
        // Stats Tab
        {
          type: 'vertical',
          tabLabel: 'Stats',
          tabId: 'tab-stats',
          gap: '12px',
          style: { padding: '16px' },
          children: [
            {
              type: 'heading',
              id: 'stats-heading',
              content: 'Character Statistics',
              level: 3,
            },
            {
              type: 'grid',
              columns: 2,
              gap: '8px',
              children: [
                { type: 'text', id: 'str-label', content: 'Strength:', style: { fontWeight: 'bold' } },
                { type: 'text', id: 'str-value', content: '18' },
                { type: 'text', id: 'dex-label', content: 'Dexterity:', style: { fontWeight: 'bold' } },
                { type: 'text', id: 'dex-value', content: '14' },
                { type: 'text', id: 'con-label', content: 'Constitution:', style: { fontWeight: 'bold' } },
                { type: 'text', id: 'con-value', content: '16' },
                { type: 'text', id: 'int-label', content: 'Intelligence:', style: { fontWeight: 'bold' } },
                { type: 'text', id: 'int-value', content: '12' },
                { type: 'text', id: 'wis-label', content: 'Wisdom:', style: { fontWeight: 'bold' } },
                { type: 'text', id: 'wis-value', content: '10' },
                { type: 'text', id: 'cha-label', content: 'Charisma:', style: { fontWeight: 'bold' } },
                { type: 'text', id: 'cha-value', content: '8' },
              ],
            },
          ],
        },
        // Equipment Tab
        {
          type: 'vertical',
          tabLabel: 'Equipment',
          tabId: 'tab-equipment',
          gap: '12px',
          style: { padding: '16px' },
          children: [
            {
              type: 'heading',
              id: 'equip-heading',
              content: 'Equipped Items',
              level: 3,
            },
            {
              type: 'vertical',
              gap: '8px',
              children: [
                { type: 'text', id: 'weapon-slot', content: 'Weapon: Iron Sword (+5 damage)' },
                { type: 'text', id: 'armor-slot', content: 'Armor: Leather Armor (+3 defense)' },
                { type: 'text', id: 'helm-slot', content: 'Helm: None' },
                { type: 'text', id: 'boots-slot', content: 'Boots: Worn Boots (+1 speed)' },
              ],
            },
          ],
        },
        // Skills Tab
        {
          type: 'vertical',
          tabLabel: 'Skills',
          tabId: 'tab-skills',
          gap: '12px',
          style: { padding: '16px' },
          children: [
            {
              type: 'heading',
              id: 'skills-heading',
              content: 'Skills & Abilities',
              level: 3,
            },
            {
              type: 'vertical',
              gap: '8px',
              children: [
                {
                  type: 'horizontal',
                  gap: '8px',
                  children: [
                    { type: 'text', id: 'skill1-name', content: 'Swordsmanship', style: { flex: '1' } },
                    { type: 'progress', id: 'skill1-progress', progress: 75 },
                  ],
                },
                {
                  type: 'horizontal',
                  gap: '8px',
                  children: [
                    { type: 'text', id: 'skill2-name', content: 'Defense', style: { flex: '1' } },
                    { type: 'progress', id: 'skill2-progress', progress: 60 },
                  ],
                },
                {
                  type: 'horizontal',
                  gap: '8px',
                  children: [
                    { type: 'text', id: 'skill3-name', content: 'Magic', style: { flex: '1' } },
                    { type: 'progress', id: 'skill3-progress', progress: 25 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    buttons: [
      { id: 'close', label: 'Close', action: 'cancel', variant: 'secondary' },
    ],
  };

  efuns.guiSend(message);
  ctx.sendLine('{cyan}Opening tabbed interface...{/}');
}

/**
 * Show progress bar demo.
 */
function showProgressTest(ctx: CommandContext): void {
  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: 'test-progress',
      title: 'Progress Indicators',
      size: 'medium',
      closable: true,
    },
    layout: {
      type: 'vertical',
      gap: '20px',
      style: { padding: '8px' },
      children: [
        {
          type: 'heading',
          id: 'progress-heading',
          content: 'Various Progress Bars',
          level: 3,
        },
        {
          type: 'vertical',
          gap: '4px',
          children: [
            { type: 'text', id: 'hp-label', content: 'Health Points' },
            { type: 'progress', id: 'hp-bar', progress: 85, progressColor: '#e74c3c' },
          ],
        },
        {
          type: 'vertical',
          gap: '4px',
          children: [
            { type: 'text', id: 'mp-label', content: 'Mana Points' },
            { type: 'progress', id: 'mp-bar', progress: 45, progressColor: '#3498db' },
          ],
        },
        {
          type: 'vertical',
          gap: '4px',
          children: [
            { type: 'text', id: 'xp-label', content: 'Experience' },
            { type: 'progress', id: 'xp-bar', progress: 72, progressColor: '#f39c12' },
          ],
        },
        {
          type: 'vertical',
          gap: '4px',
          children: [
            { type: 'text', id: 'quest-label', content: 'Quest Progress' },
            { type: 'progress', id: 'quest-bar', progress: 33, progressColor: '#9b59b6' },
          ],
        },
        {
          type: 'vertical',
          gap: '4px',
          children: [
            { type: 'text', id: 'skill-label', content: 'Skill Mastery' },
            { type: 'progress', id: 'skill-bar', progress: 100, progressColor: '#2ecc71' },
          ],
        },
        {
          type: 'divider',
          id: 'div-slider',
        },
        {
          type: 'slider',
          id: 'volume-slider',
          name: 'volume',
          label: 'Interactive Slider',
          min: 0,
          max: 100,
          step: 1,
          value: 50,
        },
      ],
    },
    buttons: [
      { id: 'close', label: 'Close', action: 'cancel', variant: 'secondary' },
    ],
  };

  efuns.guiSend(message);
  ctx.sendLine('{cyan}Opening progress demo...{/}');
}

export function execute(ctx: CommandContext): void {
  const args = ctx.args.trim().toLowerCase();

  // Set up GUI response handler for this player
  const player = ctx.player as MudObject & {
    onGUIResponse?: (message: GUIClientMessage) => void;
  };

  player.onGUIResponse = (message: GUIClientMessage) => {
    if (message.action === 'submit') {
      ctx.sendLine(`{green}Form submitted!{/}`);
      ctx.sendLine(`{dim}Modal: ${message.modalId}{/}`);
      ctx.sendLine(`{dim}Button: ${message.buttonId}{/}`);
      ctx.sendLine(`{dim}Data: ${JSON.stringify(message.data, null, 2)}{/}`);
    } else if (message.action === 'button') {
      ctx.sendLine(`{yellow}Button clicked: ${message.buttonId}{/}`);
      if (message.customAction) {
        ctx.sendLine(`{dim}Custom action: ${message.customAction}{/}`);
      }
    } else if (message.action === 'closed') {
      ctx.sendLine(`{dim}Modal closed (${message.reason}){/}`);
    }
  };

  switch (args) {
    case 'form':
      showFormTest(ctx);
      break;
    case 'shop':
      showShopTest(ctx);
      break;
    case 'confirm':
      showConfirmTest(ctx);
      break;
    case 'tabs':
      showTabsTest(ctx);
      break;
    case 'progress':
      showProgressTest(ctx);
      break;
    case '':
    default:
      showMainTest(ctx);
      break;
  }
}

export default { name, description, usage, execute };
