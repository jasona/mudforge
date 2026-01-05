/**
 * Center of Town - The main hub where players begin their adventures.
 *
 * A bustling town square at the heart of a medieval fantasy town.
 */

import { Room } from '../../std/room.js';
import { MudObject } from '../../std/object.js';

/**
 * The Center of Town room.
 */
export class CenterOfTown extends Room {
  constructor() {
    super();
    this.shortDesc = 'Center of Town!';
    this.longDesc = `You stand in the heart of a bustling medieval town square. {dim}Cobblestones worn
smooth by countless feet spread out in all directions{/}, and a magnificent {cyan}stone
fountain{/} dominates the center, its {CYAN}crystal waters{/} catching the sunlight.

{yellow}Merchants{/} hawk their wares from colorful stalls lining the square's edges, their
voices mingling with the clatter of horse hooves and the chatter of townsfolk.
The aroma of {yellow}fresh bread{/} wafts from a nearby bakery, competing with the earthy
scent of the {red}blacksmith's forge{/}.

To the {green}north{/}, the imposing walls of the {bold}castle{/} rise above the rooftops. An old
{yellow}tavern{/} with a weathered sign creaks in the breeze to the {green}east{/}. The {green}western{/} road
leads toward the merchant district, while {green}southward{/} lies the town gates and the
wilderness beyond.

A {magenta}town crier{/} stands near the fountain, occasionally announcing the day's news to
anyone who will listen.`;

    this.setupRoom();
  }

  /**
   * Set up the room's exits and actions.
   */
  private setupRoom(): void {
    // Add exits to surrounding areas
    this.addExit('north', '/areas/town/castle');
    this.addExit('east', '/areas/town/tavern');
    this.addExit('west', '/areas/town/market');
    this.addExit('south', '/areas/town/gates');

    // Add actions
    this.addAction('look', this.cmdLook.bind(this));
    this.addAction('listen', this.cmdListen.bind(this));
    this.addAction('drink', this.cmdDrink.bind(this));
  }

  /**
   * Called when the room is created.
   */
  override async onCreate(): Promise<void> {
    console.log('[CenterOfTown] The town square has been initialized.');
  }

  /**
   * Called when someone enters the town square.
   */
  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\nYou emerge into the bustling town square.\n');
    }

    // Notify others
    this.broadcast(`${obj.shortDesc} arrives in the square.`, { exclude: [obj] });
  }

  /**
   * Called when someone leaves the town square.
   */
  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    this.broadcast(`${obj.shortDesc} leaves the square.`, { exclude: [obj] });
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

    const target = args.toLowerCase();
    const receiver = player as MudObject & { receive?: (msg: string) => void };

    if (target === 'fountain' || target === 'water') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe fountain is carved from pale marble, depicting a heroic knight\n' +
          'slaying a fearsome dragon. Crystal-clear water arcs gracefully from\n' +
          'the dragon\'s mouth, splashing into the wide basin below. Copper coins\n' +
          'glint at the bottom, wishes cast by hopeful townsfolk.\n'
        );
      }
      return true;
    }

    if (target === 'merchants' || target === 'stalls' || target === 'market') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nColorful canvas awnings shade the merchant stalls. You see vendors\n' +
          'selling everything from fresh vegetables and salted meats to bolts of\n' +
          'cloth and simple tools. A few specialized traders offer more exotic\n' +
          'wares: potions, scrolls, and curious trinkets from distant lands.\n'
        );
      }
      return true;
    }

    if (target === 'crier' || target === 'town crier') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe town crier is a stout man in a faded blue coat, his voice\n' +
          'surprisingly powerful for his size. A brass bell hangs at his belt,\n' +
          'which he rings before each announcement. He notices your gaze and\n' +
          'gives you a friendly nod.\n'
        );
      }
      return true;
    }

    if (target === 'castle') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe castle towers above the town, its gray stone walls standing\n' +
          'sentinel for generations. Colorful banners flutter from the\n' +
          'battlements, and you can just make out the gleam of guards\' armor\n' +
          'on the ramparts. The road north leads to its imposing gates.\n'
        );
      }
      return true;
    }

    if (target === 'tavern' || target === 'sign') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe tavern\'s sign depicts a golden tankard overflowing with foam,\n' +
          'beneath which the words "The Foaming Flagon" are carved in bold\n' +
          'letters. Warm light spills from its windows, and the muffled sounds\n' +
          'of laughter and music hint at the merriment within.\n'
        );
      }
      return true;
    }

    // Look at inventory or room contents
    for (const obj of this.inventory) {
      if (obj.id(target)) {
        if (typeof receiver.receive === 'function') {
          receiver.receive(`\n${obj.longDesc}\n`);
        }
        return true;
      }
    }

    if (typeof receiver.receive === 'function') {
      receiver.receive("\nYou don't see that here.\n");
    }
    return true;
  }

  /**
   * Listen command - hear the sounds of the town.
   */
  private cmdListen(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive(
        '\nYou pause and listen to the symphony of town life:\n' +
        'The splash of the fountain, the cries of merchants advertising their\n' +
        'wares, the rhythmic clang of the blacksmith\'s hammer, children\n' +
        'laughing as they chase each other through the square, and beneath it\n' +
        'all, the gentle murmur of countless conversations.\n'
      );
    }
    return true;
  }

  /**
   * Drink command - drink from the fountain.
   */
  private cmdDrink(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const target = args.toLowerCase();
    const receiver = player as MudObject & { receive?: (msg: string) => void };

    if (!target || target === 'water' || target === 'fountain') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nYou cup your hands in the fountain\'s cool water and drink deeply.\n' +
          'The water is fresh and pure, fed by mountain springs. You feel\n' +
          'refreshed and invigorated.\n'
        );
      }
      this.broadcast(`${player.shortDesc} drinks from the fountain.`, { exclude: [player] });

      // Could heal the player here
      const living = player as MudObject & { heal?: (amount: number) => void };
      if (typeof living.heal === 'function') {
        living.heal(2);
      }
      return true;
    }

    if (typeof receiver.receive === 'function') {
      receiver.receive("\nDrink what?\n");
    }
    return true;
  }

  /**
   * Find a player in the room (the one executing commands).
   */
  private findPlayerInRoom(): MudObject | undefined {
    for (const obj of this.inventory) {
      const player = obj as MudObject & { isConnected?: () => boolean };
      if (typeof player.isConnected === 'function') {
        return obj;
      }
    }
    return this.inventory[0];
  }
}

export default CenterOfTown;
