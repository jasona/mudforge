/**
 * Cellblock - The old prison cells of the castle dungeon.
 */

import { Room, MudObject } from '../../../lib/std.js';
import { LightLevel } from '../../../std/visibility/types.js';

/**
 * The Cellblock room.
 */
export class Cellblock extends Room {
  constructor() {
    super();
    this.shortDesc = '{dim}Ancient Cellblock{/}';
    this.longDesc = `You stand in a grim {dim}cellblock{/}, where rows of {cyan}iron-barred cells{/} line both
sides of a central walkway. The cells are small and cramped, barely large
enough for a person to lie down. Most stand empty, their doors hanging open
on rusted hinges.

{yellow}Shackles{/} are bolted to the back walls of each cell, and the stone floors
are worn smooth where prisoners once paced. Scratchings and crude drawings
cover the walls - desperate attempts to maintain sanity in the endless
darkness.

A few cells still contain their occupants - or rather, what remains of them.
{dim}Skeletal figures{/} slump in corners, their chains still attached, forgotten
by the living world above.

The corridor leads {green}south{/}. Deeper into the cellblock to the {green}north{/}, you can
see a larger chamber.`;

    // Map coordinates - north of corridor (lower Y)
    this.setMapCoordinates({ x: 0, y: 2, z: -1, area: '/areas/valdoria/aldric_depths' });
    this.setTerrain('dungeon');

    // Very dark with minimal light
    this.lightLevel = LightLevel.VERY_DARK;

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('south', '/areas/valdoria/aldric_depths/corridor');
    this.addExit('north', '/areas/valdoria/aldric_depths/storage');

    this.addAction('look', this.cmdLook.bind(this));
    this.addAction('search', this.cmdSearch.bind(this));
  }

  override async onCreate(): Promise<void> {
    console.log('[Cellblock] The cellblock has been initialized.');
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\nThe weight of suffering seems to press down on you here.\n');
    }
    this.broadcast(`${obj.shortDesc} enters the cellblock.`, { exclude: [obj] });
  }

  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    this.broadcast(`${obj.shortDesc} leaves the cellblock.`, { exclude: [obj] });
  }

  private cmdLook(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    if (!args) {
      this.look(player);
      return true;
    }

    const target = args.toLowerCase();
    const receiver = player as MudObject & { receive?: (msg: string) => void };

    if (target === 'cells' || target === 'cell' || target === 'bars') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe cells are tiny - perhaps six feet by four. The iron bars are\n' +
            "thick and closely spaced, designed to prevent even the slimmest\n" +
            "prisoner from squeezing through. Many still bear the marks of\n" +
            'desperate attempts to escape.\n'
        );
      }
      return true;
    }

    if (target === 'shackles' || target === 'chains') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nHeavy iron shackles are bolted to each cell wall, designed to\n' +
            "restrain prisoners who were deemed especially dangerous. Some\n" +
            "still hold bones within their rusted grip.\n"
        );
      }
      return true;
    }

    if (target === 'skeletons' || target === 'skeleton' || target === 'bones' || target === 'remains') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          "\nThe skeletal remains of forgotten prisoners occupy several cells.\n" +
            'They sit in the corners where they died, shackled and alone,\n' +
            "left to rot when the dungeon was abandoned. Their empty eye\n" +
            'sockets seem to watch you as you pass.\n'
        );
      }
      return true;
    }

    if (target === 'drawings' || target === 'scratchings' || target === 'walls') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe cell walls are covered with scratchings made by desperate\n' +
            'fingers: tally marks counting days, crude pictures of the sun\n' +
            "and sky, names that have faded beyond reading, and prayers to\n" +
            'gods who never answered.\n'
        );
      }
      return true;
    }

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

  private cmdSearch(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive(
        '\nYou search through the cells carefully:\n' +
          "Most contain nothing but dust and old bones.\n" +
          'In one cell, you find a crude knife made from a sharpened bone.\n' +
          'Another holds a small pile of stones - perhaps used for counting.\n' +
          'Beneath a pile of rotted straw, you spot something glinting...\n'
      );
    }
    this.broadcast(`${player.shortDesc} searches through the cells.`, { exclude: [player] });
    return true;
  }

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

export default Cellblock;
