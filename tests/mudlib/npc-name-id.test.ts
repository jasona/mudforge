import { describe, it, expect } from 'vitest';
import { NPC } from '../../mudlib/std/npc.js';

describe('NPC name IDs', () => {
  it('adds full name and name parts as IDs when name is set', () => {
    const npc = new NPC();
    npc.name = 'Master Vorn';
    npc.shortDesc = 'Master Vorn, the combat trainer';

    expect(npc.id('master vorn')).toBe(true);
    expect(npc.id('master')).toBe(true);
    expect(npc.id('vorn')).toBe(true);
  });

  it('updates auto-generated IDs when name changes', () => {
    const npc = new NPC();
    npc.name = 'Master Vorn';
    npc.name = 'Captain Hale';

    expect(npc.id('vorn')).toBe(false);
    expect(npc.id('master vorn')).toBe(false);
    expect(npc.id('captain')).toBe(true);
    expect(npc.id('hale')).toBe(true);
    expect(npc.id('captain hale')).toBe(true);
  });
});
