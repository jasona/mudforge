/**
 * The Void - Starting room for all players.
 *
 * This is the nexus point where players first enter the game world.
 * It serves as a hub connecting to various areas.
 */

import { Room, MudObject } from '../../lib/std.js';

/**
 * The Void starting room.
 */
export class Void extends Room {
  constructor() {
    super();
    this.shortDesc = 'The Void';
    this.longDesc = `You float in an endless expanse of swirling mist and darkness. This is the Void,
the nexus point between worlds. Ethereal tendrils of light dance around you, and you
feel the hum of countless possibilities vibrating through the air.

A shimmering portal pulses with inviting light to the north, promising adventure
beyond. To the south, a faint glow suggests a place of rest and reflection.

Despite the apparent emptiness, you sense this place is alive with latent power,
waiting for brave souls to step through and shape their destinies.`;

    this.setupRoom();
  }

  /**
   * Set up the room's exits and actions.
   */
  private setupRoom(): void {
    // Add exits (these would connect to actual areas)
    // For now, they're placeholders
    // this.addExit('north', '/areas/town/square');
    // this.addExit('south', '/areas/inn/lobby');

    this.addExit('north', '/areas/town/center');

    // Add actions
    this.addAction('meditate', this.cmdMeditate.bind(this));
    this.addAction('look', this.cmdLook.bind(this));
  }

  /**
   * Called when the room is created.
   */
  override async onCreate(): Promise<void> {
    console.log('[Void] The Void has been initialized.');
  }

  /**
   * Called when someone enters the Void.
   */
  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    // Welcome message for players
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\nThe mists part as you materialize in the Void...\n');
    }

    // Notify others
    this.broadcast(`The mists swirl and ${obj.shortDesc} appears.`, { exclude: [obj] });
  }

  /**
   * Called when someone leaves the Void.
   */
  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    this.broadcast(`${obj.shortDesc} fades into the mists.`, { exclude: [obj] });
  }

  /**
   * Meditate command - restores a bit of health/mana.
   */
  private cmdMeditate(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive(
        '\nYou close your eyes and let the energy of the Void flow through you.\n' +
        'Peace fills your mind, and you feel refreshed.\n'
      );
    }

    this.broadcast(`${player.shortDesc} sits in quiet meditation.`, { exclude: [player] });

    // Could heal the player here
    const living = player as MudObject & { heal?: (amount: number) => void };
    if (typeof living.heal === 'function') {
      living.heal(5);
    }

    return true;
  }

  /**
   * Look command - look at the room or something specific.
   */
  private cmdLook(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    if (!args) {
      this.look(player);
      return true;
    }

    // Look at something specific
    const target = args.toLowerCase();

    // Check room features
    if (target === 'mist' || target === 'mists') {
      const receiver = player as MudObject & { receive?: (msg: string) => void };
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe mists swirl endlessly, forming and reforming into shapes that\n' +
          'seem almost familiar before dissolving back into formlessness.\n' +
          'Occasionally, you catch glimpses of distant places within their depths.\n'
        );
      }
      return true;
    }

    if (target === 'portal' || target === 'light') {
      const receiver = player as MudObject & { receive?: (msg: string) => void };
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe portal pulses with a warm, inviting light. Through it, you can\n' +
          'faintly make out the cobblestones of a town square, the bustle of\n' +
          'daily life just beyond reach.\n'
        );
      }
      return true;
    }

    // Look at inventory or room contents
    for (const obj of this.inventory) {
      if (obj.id(target)) {
        const receiver = player as MudObject & { receive?: (msg: string) => void };
        if (typeof receiver.receive === 'function') {
          receiver.receive(`\n${obj.longDesc}\n`);
        }
        return true;
      }
    }

    const receiver = player as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive("\nYou don't see that here.\n");
    }
    return true;
  }

  /**
   * Find a player in the room (the one executing commands).
   * In a real implementation, this would use thisPlayer() from efuns.
   */
  private findPlayerInRoom(): MudObject | undefined {
    // Find the first player-like object in the room
    for (const obj of this.inventory) {
      const player = obj as MudObject & { isConnected?: () => boolean };
      if (typeof player.isConnected === 'function') {
        return obj;
      }
    }
    return this.inventory[0];
  }
}

export default Void;
