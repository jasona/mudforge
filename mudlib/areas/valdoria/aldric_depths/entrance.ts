/**
 * Dungeon Entrance - The entry to the castle dungeons.
 *
 * A dark and foreboding stairway leading down beneath the castle.
 */

import { Room, MudObject } from '../../../lib/std.js';
import { LightLevel } from '../../../std/visibility/types.js';

/**
 * The Dungeon Entrance room.
 */
export class DungeonEntrance extends Room {
  constructor() {
    super();
    this.shortDesc = '{bold}{dim}Dungeon Entrance{/}';
    this.longDesc = `You stand at the top of a {dim}worn stone stairway{/} that spirals down into
darkness. The air here is noticeably cooler and carries a damp, musty scent
that speaks of age and neglect. Torches in rusted iron sconces flicker
weakly, their flames barely pushing back the oppressive gloom.

The {cyan}castle walls{/} rise behind you, solid and reassuring. Ahead, the stairs
descend into shadow, each step worn smooth by centuries of feet. {yellow}Cobwebs{/}
hang in thick curtains from the ceiling, and you can hear the distant
{dim}drip... drip... drip{/} of water somewhere below.

A heavy {yellow}iron door{/} stands open, its hinges groaning when touched. Scratched
into the stone beside it are tally marks - perhaps counting days, perhaps
something else entirely.

A dark corridor stretches {green}north{/} into the dungeon depths.`;

    // Map coordinates for dungeon (underground, so negative z)
    // Y=4 because entrance is at the "south" end - you enter from castle and go north to explore deeper
    this.setMapCoordinates({ x: 0, y: 4, z: -1, area: '/areas/valdoria/aldric_depths' });
    this.setTerrain('dungeon');
    this.setMapIcon('↓');

    // Dim lighting from flickering torches
    this.lightLevel = LightLevel.DIM;

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('up', '/areas/valdoria/aldric/castle');
    this.addExit('north', '/areas/valdoria/aldric_depths/corridor');

    this.addAction('look', this.cmdLook.bind(this));
  }

  override async onCreate(): Promise<void> {
    console.log('[DungeonEntrance] The dungeon entrance has been initialized.');
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      if (from?.objectPath?.includes('castle')) {
        receiver.receive('\nA chill runs down your spine as you descend into the dungeon.\n');
      } else {
        receiver.receive('\nYou emerge from the depths, grateful for the relative warmth.\n');
      }
    }
    this.broadcast(`${obj.shortDesc} arrives at the dungeon entrance.`, { exclude: [obj] });
  }

  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    if (to?.objectPath?.includes('corridor')) {
      this.broadcast(`${obj.shortDesc} descends deeper into the dungeon.`, { exclude: [obj] });
    } else {
      this.broadcast(`${obj.shortDesc} climbs back toward the castle.`, { exclude: [obj] });
    }
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

    if (target === 'door' || target === 'iron door') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe iron door is ancient and pitted with rust, but still sturdy.\n' +
            'Its hinges creak ominously. Strange scratches mark its surface -\n' +
            "some look like claw marks, others like desperate fingernails.\n"
        );
      }
      return true;
    }

    if (target === 'stairs' || target === 'stairway') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe spiral stairway descends into darkness. Each step is worn\n' +
            'into a smooth curve by countless feet over the centuries. The\n' +
            'stones are slick with moisture and green with patches of moss.\n'
        );
      }
      return true;
    }

    if (target === 'tally' || target === 'marks' || target === 'tally marks') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          "\nHundreds of tally marks are scratched into the stone, grouped in\n" +
            "sets of five. They seem to continue around the corner and down\n" +
            "the stairs. Whoever made them had a lot of time on their hands...\n" +
            'or perhaps no other way to mark the passing of days.\n'
        );
      }
      return true;
    }

    if (target === 'cobwebs' || target === 'web' || target === 'webs') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThick cobwebs hang everywhere, some containing the desiccated\n' +
            'husks of unfortunate insects. Whatever spiders made these are\n' +
            "either long gone or lurking somewhere in the shadows.\n"
        );
      }
      return true;
    }

    if (target === 'torches' || target === 'torch') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe torches burn with an unnatural steadiness, their flames a\n' +
            "sickly yellow-green. They've clearly been enchanted to burn\n" +
            'indefinitely - though the magic seems to be fading after all\n' +
            'these years, leaving the light dim and flickering.\n'
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

export default DungeonEntrance;
