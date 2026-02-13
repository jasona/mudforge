import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CombatDaemon } from '../../mudlib/daemons/combat.js';
import { Room } from '../../mudlib/std/room.js';
import { Living } from '../../mudlib/std/living.js';
import { MudObject } from '../../mudlib/std/object.js';
import type { AttackResult, RoundResult } from '../../mudlib/std/combat/types.js';
import type { Weapon } from '../../mudlib/lib/std.js';

describe('CombatDaemon message routing', () => {
  let daemon: CombatDaemon;
  let room: Room;
  let attacker: Living;
  let defender: Living;

  beforeEach(() => {
    daemon = new CombatDaemon();
    room = new Room();
    attacker = new Living();
    defender = new Living();
    attacker.name = 'attacker';
    defender.name = 'defender';

    attacker.moveTo(room);
    defender.moveTo(room);
  });

  function makeAttackResult(): AttackResult {
    return {
      attacker,
      defender,
      weapon: null,
      hit: true,
      miss: false,
      critical: false,
      blocked: false,
      dodged: false,
      parried: false,
      glancingBlow: false,
      riposteTriggered: false,
      circling: false,
      baseDamage: 10,
      finalDamage: 8,
      damageType: 'bludgeoning',
      attackerMessage: 'verbose-attacker\n',
      attackerMessageBrief: 'brief-attacker\n',
      defenderMessage: 'verbose-defender\n',
      defenderMessageBrief: 'brief-defender\n',
      roomMessage: 'verbose-room\n',
      roomMessageBrief: 'brief-room\n',
    };
  }

  it('sends verbose or brief round messages per viewer preference', () => {
    const attackerReceive = vi.fn();
    const defenderReceive = vi.fn();
    const observerBriefReceive = vi.fn();
    const observerVerboseReceive = vi.fn();
    const sleepingReceive = vi.fn();

    (attacker as Living & { receive: typeof attackerReceive }).receive = attackerReceive;
    (defender as Living & { receive: typeof defenderReceive }).receive = defenderReceive;
    (attacker as Living & { getConfig: <T>(key: string) => T }).getConfig = (() => true) as <T>(key: string) => T;
    (defender as Living & { getConfig: <T>(key: string) => T }).getConfig = (() => false) as <T>(key: string) => T;

    const observerBrief = new MudObject();
    (observerBrief as MudObject & { receive: typeof observerBriefReceive }).receive = observerBriefReceive;
    (observerBrief as MudObject & { getConfig: <T>(key: string) => T }).getConfig = (() => true) as <T>(key: string) => T;
    observerBrief.moveTo(room);

    const observerVerbose = new MudObject();
    (observerVerbose as MudObject & { receive: typeof observerVerboseReceive }).receive = observerVerboseReceive;
    (observerVerbose as MudObject & { getConfig: <T>(key: string) => T }).getConfig = (() => false) as <T>(key: string) => T;
    observerVerbose.moveTo(room);

    const sleepingObserver = new Living();
    (sleepingObserver as Living & { receive: typeof sleepingReceive }).receive = sleepingReceive;
    (sleepingObserver as Living & { isSleeping: () => boolean }).isSleeping = () => true;
    sleepingObserver.moveTo(room);

    const round: RoundResult = {
      attacker,
      defender,
      attacks: [makeAttackResult()],
      totalDamage: 8,
      attackerDied: false,
      defenderDied: false,
    };

    daemon.sendRoundMessages(round);

    expect(attackerReceive).toHaveBeenCalledWith('brief-attacker\n');
    expect(defenderReceive).toHaveBeenCalledWith('verbose-defender\n');
    expect(observerBriefReceive).toHaveBeenCalledWith('brief-room\n');
    expect(observerVerboseReceive).toHaveBeenCalledWith('verbose-room\n');
    expect(sleepingReceive).not.toHaveBeenCalled();
  });

  it('sends riposte messages per viewer preference', () => {
    const originalAttackerReceive = vi.fn();
    const defenderReceive = vi.fn();
    const observerReceive = vi.fn();

    (attacker as Living & { receive: typeof originalAttackerReceive }).receive = originalAttackerReceive;
    (defender as Living & { receive: typeof defenderReceive }).receive = defenderReceive;
    (attacker as Living & { getConfig: <T>(key: string) => T }).getConfig = (() => false) as <T>(key: string) => T;
    (defender as Living & { getConfig: <T>(key: string) => T }).getConfig = (() => true) as <T>(key: string) => T;

    const observer = new MudObject();
    (observer as MudObject & { receive: typeof observerReceive }).receive = observerReceive;
    (observer as MudObject & { getConfig: <T>(key: string) => T }).getConfig = (() => true) as <T>(key: string) => T;
    observer.moveTo(room);

    const weapon = {
      shortDesc: 'test blade',
      damageType: 'slashing',
      rollDamage: () => 10,
    } as unknown as Weapon;

    (defender as Living & { getWieldedWeapons: () => { mainHand: Weapon; offHand: null } }).getWieldedWeapons = () => ({
      mainHand: weapon,
      offHand: null,
    });

    daemon.executeRiposte(attacker, defender);

    expect(defenderReceive).toHaveBeenCalledWith(
      expect.stringMatching(/^\{blue\}You riposte Attacker for \d+ damage\.\{\/\}\n$/)
    );
    expect(originalAttackerReceive).toHaveBeenCalledWith(
      expect.stringMatching(/^\{red\}Defender ripostes, hitting you for \d+ damage!\{\/\}\n$/)
    );
    expect(observerReceive).toHaveBeenCalledWith(
      expect.stringMatching(/^\{blue\}Defender ripostes Attacker for \d+ damage\.\{\/\}\n$/)
    );
  });

  it('includes explicit block wording in brief hit messages', () => {
    const result = makeAttackResult();
    result.blocked = true;
    result.critical = false;
    result.finalDamage = 6;

    daemon.setHitMessages(result);

    expect(result.attackerMessageBrief).toContain('partially blocks the hit');
    expect(result.defenderMessageBrief).toContain('You partially block the hit');
    expect(result.roomMessageBrief).toContain('partially blocks the hit');
  });
});
