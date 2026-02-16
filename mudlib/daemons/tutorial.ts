/**
 * Tutorial Daemon
 *
 * Manages the newbie tutorial state machine. Tracks each player's progress
 * through tutorial steps, delivers dialogue via timed messages, and handles
 * skip/completion logic.
 *
 * Architecture: Data-driven step definitions with gap numbering for future
 * chapters. Rooms/items/NPCs call daemon.notify(player, event) to advance
 * the state machine.
 *
 * Usage:
 *   const daemon = getTutorialDaemon();
 *   daemon.notify(player, 'arrived_at_camp');
 */

import { MudObject } from '../std/object.js';
import type { Living } from '../std/living.js';
import type { EngageOption } from '../std/player.js';

// ========== Step Constants ==========
// Chapter 1: The Conscription (steps 0-7)
// Future chapters use 10-17, 20-27, etc.

export const STEPS = {
  CH1_ARRIVED: 0,
  CH1_ENTERED_TENT: 1,
  CH1_GOT_GEAR: 2,
  CH1_WORE_ARMOR: 3,
  CH1_WIELDED: 4,
  CH1_ENTERED_YARD: 5,
  CH1_KILLED_DUMMY: 6,
  CH1_COMPLETE: 7,
} as const;

// ========== Types ==========

interface TutorialPlayer extends Living {
  name: string;
  getProperty(key: string): unknown;
  setProperty(key: string, value: unknown): void;
  receive(msg: string): void;
  moveTo(dest: MudObject | null): Promise<void>;
  gainExperience?(amount: number): void;
}

interface RoomExit {
  direction: string;
  destination: string | MudObject;
  description?: string;
  canPass?: (who: MudObject) => boolean | Promise<boolean>;
}

interface TutorialRoom extends MudObject {
  getExits?: () => RoomExit[];
  removeExit?: (direction: string) => void;
  addExit?: (direction: string, destination: string | MudObject, description?: string) => void;
  addConditionalExit?: (
    direction: string,
    destination: string | MudObject,
    canPass: (who: MudObject) => boolean | Promise<boolean>,
    description?: string
  ) => void;
}

interface TutorialInstance {
  owner: string;
  rooms: Map<string, MudObject>;
}

// ========== Dialogue Data ==========

const ENGAGE_TEXT_BY_STEP: Record<number, string> = {
  [STEPS.CH1_ARRIVED]: `So. You're the latest recruit the kingdom has scraped together. I am General Ironheart, and as of this moment, your life is mine.

The Shadowthorn horde has broken through the northern passes. Every village from here to the Silvermark River is burning. King Aldric has ordered a general conscription — and that means YOU.

First things first — get yourself equipped. Head {green}east{/} to the supply tent. Type {cyan}east{/} to move.`,
  [STEPS.CH1_ENTERED_TENT]: `This is what passes for an armory these days. Grab a sword, chainmail, and helm from the racks.

Type {cyan}get sword{/}, {cyan}get chainmail{/}, and {cyan}get helm{/} to pick them up.`,
  [STEPS.CH1_GOT_GEAR]: `Good. Now put that gear ON. Equipment in your pack won't stop an arrow.

Type {cyan}wear chainmail{/} and {cyan}wear helm{/} to put on your armor, then {cyan}wield sword{/} so you're battle-ready.`,
  [STEPS.CH1_WORE_ARMOR]: `Better. Now draw your weapon — type {cyan}wield sword{/}.`,
  [STEPS.CH1_WIELDED]: `You almost look like a soldier. Almost.

Type {cyan}score{/} to check your stats and {cyan}inventory{/} to see your gear. When you're ready, head {green}north{/} to the training yard.`,
  [STEPS.CH1_ENTERED_YARD]: `See that dummy? I want it in pieces. Show me you know which end of the sword to hold.

Type {cyan}kill dummy{/} to attack. Combat runs automatically — watch the output and learn the rhythm of battle.`,
  [STEPS.CH1_KILLED_DUMMY]: `Not pretty, but the dummy's dead and you're not. That's lesson one of warfare.

If you took hits, your health regenerates over time. Sitting ({cyan}sit{/}) or sleeping ({cyan}sleep{/}) heals faster.

You've got the basics, recruit. Head {green}east{/} through the camp gate. The town of Aldric is beyond — find the training hall if you want to improve.

Go with honor, soldier. Don't die.`,
};

// ========== Event → Step Transition Map ==========

interface Transition {
  fromStep: number;
  toStep: number;
  /** Custom check before advancing (return false to block) */
  check?: (player: TutorialPlayer) => boolean;
}

const TRANSITIONS: Record<string, Transition> = {
  arrived_at_camp: { fromStep: -1, toStep: STEPS.CH1_ARRIVED },
  entered_tent: { fromStep: STEPS.CH1_ARRIVED, toStep: STEPS.CH1_ENTERED_TENT },
  got_all_gear: { fromStep: STEPS.CH1_ENTERED_TENT, toStep: STEPS.CH1_GOT_GEAR },
  wore_armor: {
    fromStep: STEPS.CH1_GOT_GEAR,
    toStep: STEPS.CH1_WORE_ARMOR,
    check: (player) => {
      // Only advance when BOTH chainmail and helm are worn
      const living = player as Living & {
        getEquipped?: (slot: string) => unknown;
      };
      if (typeof living.getEquipped === 'function') {
        return !!living.getEquipped('chest') && !!living.getEquipped('head');
      }
      return false;
    },
  },
  wielded_weapon: { fromStep: STEPS.CH1_WORE_ARMOR, toStep: STEPS.CH1_WIELDED },
  entered_yard: { fromStep: STEPS.CH1_WIELDED, toStep: STEPS.CH1_ENTERED_YARD },
  killed_dummy: { fromStep: STEPS.CH1_ENTERED_YARD, toStep: STEPS.CH1_KILLED_DUMMY },
  entered_exit: { fromStep: STEPS.CH1_KILLED_DUMMY, toStep: STEPS.CH1_COMPLETE },
};

// ========== Constants ==========

const DEFAULT_LOCATION = '/areas/valdoria/aldric/center';
const TUTORIAL_START_LOCATION = '/areas/tutorial/war_camp';
const TUTORIAL_ROOM_PATHS = [
  '/areas/tutorial/war_camp',
  '/areas/tutorial/supply_tent',
  '/areas/tutorial/training_yard',
  '/areas/tutorial/camp_exit',
] as const;
const TUTORIAL_ITEMS = [
  '/areas/tutorial/items/recruits_sword',
  '/areas/tutorial/items/recruits_chainmail',
  '/areas/tutorial/items/recruits_helm',
];

// ========== Daemon ==========

export class TutorialDaemon extends MudObject {
  private instances: Map<string, TutorialInstance> = new Map();

  constructor() {
    super();
    this.shortDesc = 'Tutorial Daemon';
    this.longDesc = 'The tutorial daemon manages the newbie tutorial experience.';
  }

  private getInstanceKey(who: Living): string {
    return (who.name || '').toLowerCase();
  }

  private async cloneTutorialRoom(path: string): Promise<MudObject | null> {
    if (typeof efuns === 'undefined' || !efuns.cloneObject) return null;

    if (efuns.loadBlueprint) {
      await efuns.loadBlueprint(path);
    }

    try {
      return await efuns.cloneObject(path);
    } catch (error) {
      console.error(`[TUTORIAL] Failed to clone tutorial room ${path}:`, error);
      return null;
    }
  }

  private wireInstanceExits(instance: TutorialInstance): void {
    for (const room of instance.rooms.values()) {
      const tutorialRoom = room as TutorialRoom;
      if (
        typeof tutorialRoom.getExits !== 'function' ||
        typeof tutorialRoom.removeExit !== 'function' ||
        typeof tutorialRoom.addExit !== 'function' ||
        typeof tutorialRoom.addConditionalExit !== 'function'
      ) {
        continue;
      }

      const exits = tutorialRoom.getExits();
      for (const exit of exits) {
        if (typeof exit.destination !== 'string') continue;
        const instanceDestination = instance.rooms.get(exit.destination);
        if (!instanceDestination) continue;

        tutorialRoom.removeExit(exit.direction);
        if (exit.canPass) {
          tutorialRoom.addConditionalExit(
            exit.direction,
            instanceDestination,
            exit.canPass,
            exit.description
          );
        } else {
          tutorialRoom.addExit(exit.direction, instanceDestination, exit.description);
        }
      }
    }
  }

  private async createInstanceFor(who: Living): Promise<TutorialInstance | null> {
    const key = this.getInstanceKey(who);
    if (!key) return null;

    const rooms = new Map<string, MudObject>();
    for (const roomPath of TUTORIAL_ROOM_PATHS) {
      const room = await this.cloneTutorialRoom(roomPath);
      if (!room) {
        // Cleanup partial clones if creation failed.
        for (const created of rooms.values()) {
          try {
            await created.destruct();
          } catch {
            // Ignore cleanup errors.
          }
        }
        return null;
      }
      rooms.set(roomPath, room);
    }

    const instance: TutorialInstance = {
      owner: key,
      rooms,
    };
    this.wireInstanceExits(instance);
    this.instances.set(key, instance);
    return instance;
  }

  async clearInstanceFor(who: Living): Promise<void> {
    const key = this.getInstanceKey(who);
    const instance = this.instances.get(key);
    if (!instance) return;

    this.instances.delete(key);
    for (const room of instance.rooms.values()) {
      try {
        await room.destruct();
      } catch {
        // Ignore cleanup errors.
      }
    }
  }

  async getTutorialRoomForPlayer(
    who: Living,
    basePath: string = TUTORIAL_START_LOCATION,
    forceNew: boolean = false
  ): Promise<MudObject | undefined> {
    if (!basePath.startsWith('/areas/tutorial/')) {
      return undefined;
    }

    if (forceNew) {
      await this.clearInstanceFor(who);
    }

    const key = this.getInstanceKey(who);
    let instance = this.instances.get(key);
    if (!instance) {
      instance = await this.createInstanceFor(who) ?? undefined;
    }
    if (!instance) return undefined;

    return instance.rooms.get(basePath) ?? instance.rooms.get(TUTORIAL_START_LOCATION);
  }

  // ========== Step Management ==========

  getStep(player: TutorialPlayer): number {
    const step = player.getProperty('tutorial_step');
    return typeof step === 'number' ? step : -1;
  }

  private setStep(player: TutorialPlayer, step: number): void {
    player.setProperty('tutorial_step', step);
  }

  getEngagePromptForStep(step: number): string {
    switch (step) {
      case STEPS.CH1_ARRIVED:
        return '{bold}General Ironheart{/} watches you closely. Type {cyan}engage ironheart{/} for your orders.';
      case STEPS.CH1_ENTERED_TENT:
        return '{bold}General Ironheart{/} nods toward the racks. Type {cyan}engage ironheart{/} for instructions.';
      case STEPS.CH1_GOT_GEAR:
        return '{bold}General Ironheart{/} says, "Now wear your armor and wield your sword." Type {cyan}engage ironheart{/} if you need the exact steps.';
      case STEPS.CH1_WORE_ARMOR:
        return '{bold}General Ironheart{/} says, "Good. Now {cyan}wield sword{/}."';
      case STEPS.CH1_WIELDED:
      case STEPS.CH1_ENTERED_YARD:
      case STEPS.CH1_KILLED_DUMMY:
        return '{bold}General Ironheart{/} is waiting. Type {cyan}engage ironheart{/} for your next orders.';
      default:
        return '{bold}General Ironheart{/} says, "Type {cyan}engage ironheart{/} if you need orders."';
    }
  }

  getEngageContentForGeneral(who: Living): { text: string; actions: EngageOption[] } {
    const player = who as TutorialPlayer;
    const step = this.getStep(player);
    const text =
      ENGAGE_TEXT_BY_STEP[step] ??
      'Stay focused, recruit. Complete your current objective and report back.';

    const actions: EngageOption[] = [];

    if (step >= STEPS.CH1_ARRIVED && step < STEPS.CH1_COMPLETE) {
      actions.push({
        id: 'tutorial-acknowledge',
        label: `You reply, "Yes sir! I'm on it!"`,
        command: '__engage_close__',
        rewardText: 'Close dialogue and continue training',
      });

      actions.push({
        id: 'tutorial-skip',
        label: 'Skip Tutorial',
        command: 'say skip',
      });
    }

    if (step === STEPS.CH1_ARRIVED) {
      actions.push({
        id: 'tutorial-east',
        label: 'Go To Supply Tent',
        command: 'east',
      });
    } else if (step === STEPS.CH1_WIELDED) {
      actions.push({
        id: 'tutorial-north',
        label: 'Go To Training Yard',
        command: 'north',
      });
    } else if (step === STEPS.CH1_KILLED_DUMMY) {
      actions.push({
        id: 'tutorial-exit-east',
        label: 'Leave Camp',
        command: 'east',
      });
    }

    return { text, actions };
  }

  // ========== Core Event Handler ==========

  /**
   * Generic event handler called by rooms, items, and NPCs.
   * Looks up the transition and advances the step if conditions are met.
   */
  notify(who: Living, event: string): void {
    const player = who as TutorialPlayer;
    if (!player.getProperty || !player.setProperty || !player.receive) {
      console.error(`[TUTORIAL] notify(${event}): player missing required methods`);
      return;
    }

    // Already completed tutorial
    if (player.getProperty('tutorial_complete')) return;

    const transition = TRANSITIONS[event];
    if (!transition) {
      console.error(`[TUTORIAL] notify: unknown event "${event}"`);
      return;
    }

    const currentStep = this.getStep(player);

    // Guard: don't regress or repeat
    if (currentStep >= transition.toStep) return;

    // Guard: must be at or past the expected fromStep
    if (currentStep < transition.fromStep) {
      console.error(`[TUTORIAL] notify(${event}): step ${currentStep} < fromStep ${transition.fromStep}, blocked`);
      return;
    }

    // Custom check (e.g., both armor pieces worn)
    if (transition.check && !transition.check(player)) return;

    // Handle completion separately
    if (transition.toStep === STEPS.CH1_COMPLETE) {
      this.completeTutorial(player);
      return;
    }

    // Advance step and prompt engage-driven guidance
    console.log(`[TUTORIAL] ${player.name}: step ${currentStep} -> ${transition.toStep} (${event})`);
    this.setStep(player, transition.toStep);
    player.receive(`${this.getEngagePromptForStep(transition.toStep)}\n`);
  }

  /**
   * Called by login.ts when a new player first enters the war camp.
   */
  onPlayerArrivedAtCamp(player: Living): void {
    this.notify(player, 'arrived_at_camp');
  }

  /**
   * Called by login.ts when a returning player reconnects mid-tutorial.
   * Re-prompts them to engage for current-step guidance.
   */
  resumeTutorial(who: Living): void {
    const player = who as TutorialPlayer;
    if (!player.getProperty || !player.receive) return;
    if (player.getProperty('tutorial_complete')) return;

    const step = this.getStep(player);
    if (step >= 0 && step < STEPS.CH1_COMPLETE) {
      player.receive(`${this.getEngagePromptForStep(step)}\n`);
    }
  }

  // ========== Item Tracking ==========

  /**
   * Record that the player picked up a tutorial item and check if all
   * three have been collected. Called from item onTake hooks.
   *
   * Uses a property counter instead of inventory checks because onTake
   * fires before the item is moved into the player's inventory.
   */
  recordItemPickup(player: TutorialPlayer, itemType: string): void {
    const step = this.getStep(player);
    console.log(`[TUTORIAL] recordItemPickup: ${itemType}, step=${step}`);

    if (step !== STEPS.CH1_ENTERED_TENT) {
      console.log(`[TUTORIAL] recordItemPickup: skipping, step ${step} !== ${STEPS.CH1_ENTERED_TENT}`);
      return;
    }

    // Track which items have been picked up via a property
    const picked = (player.getProperty('tutorial_items_picked') as Record<string, boolean>) || {};
    picked[itemType] = true;
    player.setProperty('tutorial_items_picked', picked);

    console.log(`[TUTORIAL] recordItemPickup: items picked so far:`, picked);

    if (picked['sword'] && picked['chainmail'] && picked['helm']) {
      this.notify(player, 'got_all_gear');
    }
  }

  /**
   * Reconcile tutorial equipment milestones from current equipment state.
   * Useful for batch commands like "equip all" where wield/wear hooks may
   * fire in an order that doesn't match tutorial transition ordering.
   */
  reconcileEquipmentProgress(who: Living): void {
    const player = who as TutorialPlayer & { getEquipped?: (slot: string) => unknown };
    if (!player.getProperty || !player.getEquipped) return;
    if (player.getProperty('tutorial_complete')) return;

    const step = this.getStep(player);
    if (step < STEPS.CH1_GOT_GEAR || step > STEPS.CH1_WORE_ARMOR) {
      return;
    }

    const hasArmor = !!player.getEquipped('chest') && !!player.getEquipped('head');
    const hasMainHandWeapon = !!player.getEquipped('main_hand');

    if (step === STEPS.CH1_GOT_GEAR && hasArmor) {
      this.notify(player, 'wore_armor');
    }

    const updatedStep = this.getStep(player);
    if (updatedStep === STEPS.CH1_WORE_ARMOR && hasMainHandWeapon) {
      this.notify(player, 'wielded_weapon');
    }
  }

  // ========== Skip & Complete ==========

  /**
   * Skip the tutorial entirely. Gives starter gear if needed, then
   * teleports to Aldric town center.
   */
  async skipTutorial(who: Living): Promise<void> {
    const player = who as TutorialPlayer;
    if (!player.setProperty || !player.receive) return;

    player.setProperty('tutorial_complete', true);
    this.setStep(player, STEPS.CH1_COMPLETE);

    // Give starter gear if they don't have it
    await this.ensureStarterGear(player);

    // Teleport to Aldric
    await this.teleportToTown(player);
    await this.clearInstanceFor(player);
  }

  /**
   * Complete the tutorial normally. Awards XP and teleports to Aldric.
   */
  private async completeTutorial(player: TutorialPlayer): Promise<void> {
    this.setStep(player, STEPS.CH1_COMPLETE);
    player.setProperty('tutorial_complete', true);

    // Completion message
    player.receive(
      `\n{yellow}You follow the muddy road away from the camp. The walls of Aldric
rise ahead, promising safety — for now.{/}

{bold}[TUTORIAL COMPLETE]{/} Basic training finished!
You earned: {yellow}50 experience points{/}\n`
    );

    // Award XP
    if (typeof player.gainExperience === 'function') {
      player.gainExperience(50);
    }

    // Delayed teleport to let them read the message
    if (typeof efuns !== 'undefined' && efuns.callOut) {
      efuns.callOut(() => {
        this.teleportToTown(player)
          .then(() => this.clearInstanceFor(player))
          .catch(() => {});
      }, 2000);
    }
  }

  private async ensureStarterGear(player: TutorialPlayer): Promise<void> {
    if (typeof efuns === 'undefined' || !efuns.cloneObject) return;

    const inv = (player as Living & { inventory?: MudObject[] }).inventory;
    if (!inv) return;

    for (const itemPath of TUTORIAL_ITEMS) {
      // Check if player already has an item from this path
      let hasItem = false;
      for (const item of inv) {
        const blueprint = (item as MudObject & { blueprint?: { objectPath?: string } }).blueprint;
        if (blueprint?.objectPath === itemPath) {
          hasItem = true;
          break;
        }
      }
      if (!hasItem) {
        try {
          const item = await efuns.cloneObject(itemPath);
          if (item) {
            await item.moveTo(player as unknown as MudObject);
          }
        } catch {
          // Item clone failed
        }
      }
    }
  }

  private async teleportToTown(player: TutorialPlayer): Promise<void> {
    if (typeof efuns === 'undefined') return;

    const room = efuns.findObject(DEFAULT_LOCATION);
    if (room) {
      await player.moveTo(room as MudObject);

      // Execute look command
      if (efuns.executeCommand) {
        efuns.executeCommand(player as unknown as MudObject, 'look', 0).catch(() => {});
      }
    }
  }
}

// ========== Singleton ==========

let tutorialDaemon: TutorialDaemon | null = null;

export function getTutorialDaemon(): TutorialDaemon {
  if (!tutorialDaemon) {
    tutorialDaemon = new TutorialDaemon();
  }
  return tutorialDaemon;
}
