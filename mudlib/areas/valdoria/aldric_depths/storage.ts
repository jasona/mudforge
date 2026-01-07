/**
 * Storage Chamber - An old storage area deep in the dungeon.
 */

import { Room, MudObject } from '../../../lib/std.js';

/**
 * The Storage Chamber.
 */
export class StorageChamber extends Room {
  constructor() {
    super();
    this.shortDesc = '{dim}Storage Chamber{/}';
    this.longDesc = `A large {dim}vaulted chamber{/} opens before you, its ceiling lost in shadow high
above. This was once a storage area for the dungeon - {yellow}wooden crates{/} and
{yellow}barrels{/} are stacked haphazardly throughout, most rotted and collapsed.

{dim}Stone shelves{/} line the walls, still holding clay pots and glass bottles,
their contents long since dried or evaporated. Cobwebs hang in thick sheets
from the rafters, and the air is thick with the smell of decay.

A set of {cyan}heavy chains{/} hangs from the ceiling in the center of the room,
swaying slightly despite the still air. This chamber may have served a more
sinister purpose than simple storage...

A narrow {dim}passageway{/} to the {green}north{/} leads deeper into the dungeon, while
the cellblock lies to the {green}south{/}.`;

    // Map coordinates - north of cellblock (lower Y)
    this.setMapCoordinates({ x: 0, y: 1, z: -1, area: '/areas/valdoria/aldric_depths' });
    this.setTerrain('dungeon');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('south', '/areas/valdoria/aldric_depths/cellblock');
    this.addExit('north', '/areas/valdoria/aldric_depths/depths');

    this.addAction('look', this.cmdLook.bind(this));
    this.addAction('open', this.cmdOpen.bind(this));
  }

  override async onCreate(): Promise<void> {
    console.log('[StorageChamber] The storage chamber has been initialized.');
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\nThe chains sway slightly as you enter, creaking softly.\n');
    }
    this.broadcast(`${obj.shortDesc} enters the storage chamber.`, { exclude: [obj] });
  }

  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    this.broadcast(`${obj.shortDesc} leaves the storage chamber.`, { exclude: [obj] });
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

    if (target === 'crates' || target === 'crate' || target === 'boxes') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe wooden crates have mostly collapsed into piles of rotted\n' +
            'wood. A few still hold their shape, though they crumble at a\n' +
            'touch. Whatever they once contained is long gone.\n'
        );
      }
      return true;
    }

    if (target === 'barrels' || target === 'barrel') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe barrels are in slightly better condition than the crates,\n' +
            'their iron bands still holding them together. Some contain the\n' +
            'dried remnants of wine or ale, now just a crusty residue at\n' +
            'the bottom.\n'
        );
      }
      return true;
    }

    if (target === 'chains' || target === 'chain') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nHeavy chains hang from the ceiling, ending in cruel-looking\n' +
            'hooks and shackles. Dark stains mark the floor beneath them.\n' +
            'This was clearly a place of torture as much as storage.\n' +
            'They continue to sway gently, though there is no wind.\n'
        );
      }
      return true;
    }

    if (target === 'shelves' || target === 'shelf' || target === 'bottles' || target === 'pots') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe stone shelves hold an assortment of old containers:\n' +
            '- Clay pots sealed with crumbling wax\n' +
            '- Glass bottles of various colors, mostly empty\n' +
            '- Small wooden boxes, their contents turned to dust\n' +
            'One bottle still holds a thick, viscous liquid...\n'
        );
      }
      return true;
    }

    if (target === 'passage' || target === 'passageway' || target === 'north') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe narrow passageway leads deeper into the dungeon. Cold air\n' +
            'flows from it, and you can hear strange sounds echoing from\n' +
            'somewhere in the depths. Few who went that way ever returned.\n'
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

  private cmdOpen(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const target = args.toLowerCase();
    const receiver = player as MudObject & { receive?: (msg: string) => void };

    if (target === 'crate' || target === 'crates') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nYou pry open one of the more intact crates. Inside, you find\n' +
            'only dust, old straw, and the desiccated body of a rat.\n'
        );
      }
      return true;
    }

    if (target === 'barrel' || target === 'barrels') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nYou manage to open one of the barrels. A terrible smell wafts\n' +
            'out - whatever was stored here has long since turned to\n' +
            'something truly unpleasant.\n'
        );
      }
      this.broadcast(`${player.shortDesc} opens a barrel and recoils from the smell.`, { exclude: [player] });
      return true;
    }

    if (typeof receiver.receive === 'function') {
      receiver.receive('\nOpen what?\n');
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

export default StorageChamber;
