import { describe, it, expect } from 'vitest';
import { CONFIG_OPTIONS, getConfigOption } from '../../mudlib/lib/player-config.js';

describe('player-config', () => {
  it('includes combatBrief with default off', () => {
    const option = getConfigOption('combatBrief');
    expect(option).toBeDefined();
    expect(option?.type).toBe('boolean');
    expect(option?.default).toBe(false);
  });

  it('does not include combatVerbose', () => {
    expect(getConfigOption('combatVerbose')).toBeUndefined();
    expect(CONFIG_OPTIONS.some((opt) => opt.key === 'combatVerbose')).toBe(false);
  });
});
