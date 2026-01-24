/**
 * The Forge - Grond's blacksmith shop.
 */

import { Room, MudObject } from '../../../lib/std.js';
import { markRoomAsStation } from '../../../std/profession/station.js';

export class Forge extends Room {
  constructor() {
    super();
    this.shortDesc = "{bold}{yellow}Grond's Forge{/}";
    this.longDesc = `The heat hits you like a wall as you enter the blacksmith's forge. A
massive stone {red}furnace{/} dominates the center of the room, its flames
casting dancing shadows across the soot-stained walls. The air is thick
with the smell of hot metal, coal smoke, and honest sweat.

{yellow}Weapons{/} and {cyan}armor{/} line the walls on wooden racks - swords, axes,
shields, and helms of various sizes and quality. A heavy {dim}anvil{/} sits
near the furnace, its surface scarred from countless hammer blows. Tools
of the trade hang from hooks: tongs, hammers, files, and quenching
buckets.

{dim}This forge can be used for blacksmithing and smelting.{/}

A doorway to the {green}southeast{/} leads back to the market square.`;

    // Map coordinates - northwest of market
    this.setMapCoordinates({ x: -2, y: -1, z: 0, area: '/areas/valdoria/aldric' });
    this.setTerrain('town');
    this.setMapIcon('F');

    // Mark this room as a forge crafting station (Tier 2 - Quality)
    markRoomAsStation(this, 'forge', 2);

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('southeast', '/areas/valdoria/aldric/market');

    // Set NPCs that belong to this room
    this.setNpcs(['/areas/valdoria/aldric/blacksmith']);

    this.addAction('look', this.cmdLook.bind(this));
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();
    await this.spawnMissingNpcs();
    console.log("[Forge] Grond's forge has been initialized.");
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\nA wave of heat washes over you as you enter the forge.\n');
    }
    this.broadcast(`${obj.shortDesc} enters the forge.`, { exclude: [obj] });
  }

  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    this.broadcast(`${obj.shortDesc} leaves the forge.`, { exclude: [obj] });
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

    if (target === 'furnace' || target === 'forge' || target === 'fire') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe furnace roars with intense heat, its flames a brilliant orange-white.\n' +
            'Bellows on either side keep the fire fed with air, and a chimney above\n' +
            'carries the smoke up and out of the building. You can feel the heat\n' +
            'radiating from several feet away.\n'
        );
      }
      return true;
    }

    if (target === 'anvil') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe anvil is a massive block of iron, its surface worn smooth and\n' +
            'marked with countless small dents from years of use. The horn curves\n' +
            "gracefully, perfect for shaping curved pieces. It's clearly the heart\n" +
            'of the smithing operation.\n'
        );
      }
      return true;
    }

    if (target === 'weapons' || target === 'weapon' || target === 'swords') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nRacks of weapons line one wall: swords of various lengths, daggers,\n' +
            'axes, and maces. Some are plain and functional, others show more\n' +
            "decorative touches. All of them look well-made. Say 'shop' to browse!\n"
        );
      }
      return true;
    }

    if (target === 'armor' || target === 'armour' || target === 'shields') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nArmor and shields hang from the opposite wall. Leather vests,\n' +
            'chainmail shirts, iron helms, and round shields of various sizes.\n' +
            "Each piece is crafted with care. Say 'shop' to see what's for sale!\n"
        );
      }
      return true;
    }

    if (target === 'tools') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe tools of a blacksmith hang from hooks near the anvil: heavy\n' +
            'hammers for shaping, lighter ones for detail work, long tongs for\n' +
            'handling hot metal, files for smoothing edges, and buckets of water\n' +
            'and oil for quenching.\n'
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

export default Forge;
