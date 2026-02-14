/**
 * Valdoria Harbor Dock - The main dock where ferries arrive and depart.
 */

import { Room, MudObject } from '../../../lib/std.js';
import { ResourceNode } from '../../../std/profession/resource-node.js';

/**
 * The Harbor Dock room.
 */
export class HarborDock extends Room {
  constructor() {
    super();
    this.shortDesc = '{bold}{cyan}Valdoria Harbor{/}';
    this.longDesc = `You stand on a weathered wooden dock that stretches out over the gently
lapping waters of the harbor. The planks creak underfoot, worn smooth by
countless footsteps over the years.

{cyan}Fishing boats{/} bob at anchor nearby, their nets hung out to dry in the salty
breeze. Gulls wheel overhead, crying out as they search for scraps from
the morning's catch.

To the {green}west{/}, a cobblestone path leads back toward the {yellow}residential streets{/} of Aldric.
A weathered {cyan}signpost{/} near the gangway lists the ferry schedule.

The smell of salt, fish, and tar fills the air. Sailors and dockworkers bustle
about, loading and unloading cargo from the various vessels moored here.`;

    // Map coordinates - east of residential area
    this.setMapCoordinates({ x: 5, y: 2, z: 0, area: '/areas/valdoria/aldric' });
    this.setTerrain('town');
    this.setMapIcon('H');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('west', '/areas/valdoria/aldric/room_7_4_0');

    this.addAction('read', this.cmdRead.bind(this));
    this.addAction('look', this.cmdLook.bind(this));
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    const coastalFishing = new ResourceNode();
    coastalFishing.initFromDefinition('coastal_fishing');
    await coastalFishing.moveTo(this);

    console.log('[HarborDock] The harbor dock has been initialized.');
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\nThe fresh sea breeze greets you as you approach the dock.\n');
    }
  }

  private cmdRead(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };
    const target = args?.toLowerCase() || '';

    if (target === 'signpost' || target === 'sign' || target === 'schedule') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\n{cyan}═══════════════════════════════════════{/}\n' +
          '{bold}{cyan}       VALDORIA HARBOR FERRY SCHEDULE{/}\n' +
          '{cyan}═══════════════════════════════════════{/}\n' +
          '\n' +
          '  {yellow}The Dawn Treader{/}\n' +
          '  Route: Valdoria Harbor <-> Isle of Dreams\n' +
          '  Schedule: Departs every 5 minutes\n' +
          '  Travel time: 2 minutes\n' +
          '\n' +
          '  {dim}Use "board ferry" to embark{/}\n' +
          '  {dim}Use "disembark" when docked to leave{/}\n' +
          '{cyan}═══════════════════════════════════════{/}\n'
        );
      }
      return true;
    }

    if (typeof receiver.receive === 'function') {
      receiver.receive('\nRead what? Try "read signpost".\n');
    }
    return true;
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

    if (target === 'boats' || target === 'fishing boats') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nSmall fishing boats rock gently at their moorings. Their colorful\n' +
          'paint is faded and weathered, but the vessels look seaworthy enough.\n' +
          'Nets, ropes, and fishing gear are piled on their decks.\n'
        );
      }
      return true;
    }

    if (target === 'gulls' || target === 'seagulls' || target === 'birds') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nWhite and grey gulls circle overhead, their cries echoing across\n' +
          'the harbor. They swoop down occasionally to snatch scraps from\n' +
          'the water or steal from unwary dockworkers.\n'
        );
      }
      return true;
    }

    if (target === 'signpost' || target === 'sign') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nA weathered wooden signpost stands near the gangway. It lists\n' +
          'the ferry schedule and destinations. Type "read signpost" to see it.\n'
        );
      }
      return true;
    }

    if (target === 'water' || target === 'harbor') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe harbor waters are relatively calm, protected from the open\n' +
          'sea by a stone breakwater. The water is a murky blue-green,\n' +
          'occasionally revealing flashes of fish swimming below.\n'
        );
      }
      return true;
    }

    // Check for vehicles/objects in the room
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

export default HarborDock;
