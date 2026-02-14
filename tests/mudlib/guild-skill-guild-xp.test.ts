import { beforeEach, describe, expect, it } from 'vitest';
import { getGuildDaemon, resetGuildDaemon } from '../../mudlib/daemons/guild.js';

interface MockPlayer {
  name: string;
  gold: number;
  race: 'human';
  environment: null;
  inventory: unknown[];
  alive: boolean;
  health: number;
  mana: number;
  properties: Map<string, unknown>;
  receive: (message: string) => void;
  getProperty: (key: string) => unknown;
  setProperty: (key: string, value: unknown) => void;
  getStat: (stat: string) => number;
  useMana: (amount: number) => boolean;
  hasMana: (amount: number) => boolean;
  damage: (_amount: number) => void;
  heal: (_amount: number) => void;
  addEffect: (_effect: unknown) => void;
  addStatModifier: (_stat: string, _amount: number) => void;
  addCombatStatModifier: (_stat: string, _amount: number) => void;
}

function createMockPlayer(): MockPlayer {
  const properties = new Map<string, unknown>();
  const stats: Record<string, number> = {
    strength: 15,
    dexterity: 15,
    constitution: 12,
    intelligence: 12,
    wisdom: 12,
    charisma: 10,
    luck: 12,
  };

  return {
    name: 'Tester',
    gold: 5000,
    race: 'human',
    environment: null,
    inventory: [],
    alive: true,
    health: 100,
    mana: 100,
    properties,
    receive: () => {},
    getProperty: (key: string) => properties.get(key),
    setProperty: (key: string, value: unknown) => void properties.set(key, value),
    getStat: (stat: string) => stats[stat] ?? 10,
    useMana(amount: number) {
      if (this.mana < amount) return false;
      this.mana -= amount;
      return true;
    },
    hasMana(amount: number) {
      return this.mana >= amount;
    },
    damage: () => {},
    heal: () => {},
    addEffect: () => {},
    addStatModifier: () => {},
    addCombatStatModifier: () => {},
  };
}

describe('Guild skill usage guild XP', () => {
  beforeEach(() => {
    resetGuildDaemon();
    (globalThis as unknown as { efuns: Record<string, unknown> }).efuns = {
      guildAddCommandPath: () => {},
      guildRemoveCommandPath: () => {},
    };
  });

  it('awards guild XP when using a learned skill successfully', () => {
    const daemon = getGuildDaemon();
    const player = createMockPlayer();

    const joinResult = daemon.joinGuild(player as unknown as Parameters<typeof daemon.joinGuild>[0], 'thief');
    expect(joinResult.success).toBe(true);

    const learnResult = daemon.learnSkill(player as unknown as Parameters<typeof daemon.learnSkill>[0], 'thief:hide');
    expect(learnResult.success).toBe(true);

    const before = daemon.getMembership(
      player as unknown as Parameters<typeof daemon.getMembership>[0],
      'thief'
    )?.guildXP;
    expect(before).toBe(0);

    const useResult = daemon.useSkill(
      player as unknown as Parameters<typeof daemon.useSkill>[0],
      'thief:hide'
    );
    expect(useResult.success).toBe(true);
    expect(useResult.guildXPAwarded).toBeGreaterThan(0);

    const after = daemon.getMembership(
      player as unknown as Parameters<typeof daemon.getMembership>[0],
      'thief'
    )?.guildXP;
    expect(after).toBe((before ?? 0) + (useResult.guildXPAwarded ?? 0));
  });
});
