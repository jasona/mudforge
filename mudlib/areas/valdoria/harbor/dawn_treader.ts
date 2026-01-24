/**
 * The Dawn Treader - A ferry that runs between Valdoria Harbor and the Isle of Dreams.
 */

import { Ferry, type FerryStop } from '../../../std/ferry.js';
import { MudObject } from '../../../std/object.js';

/**
 * The Dawn Treader ferry.
 */
export class DawnTreader extends Ferry {
  constructor() {
    super();
    this.shortDesc = 'The Dawn Treader';
    this.name = 'dawn treader';
    this.longDesc = `You are aboard the Dawn Treader, a sturdy wooden ferry built for passenger
comfort. The vessel is about forty feet long, with {yellow}polished oak planks{/}
forming the deck and {cyan}brass railings{/} lining the sides for safety.

{yellow}Wooden benches{/} with cushioned seats line both sides of the ferry, offering
passengers a place to rest during the voyage. A small {cyan}covered cabin{/} near
the stern provides shelter from the elements.

The {red}captain's wheel{/} stands at the bow, currently unmanned as the ferry
follows its enchanted route. {cyan}Lanterns{/} hang from poles at each corner,
providing light during the twilight crossings.

A sense of calm pervades the vessel, as if the ferry itself protects its
passengers from the mysteries of the waters they cross.`;

    // Add identifiers for the ferry
    this.addId('ferry');
    this.addId('boat');
    this.addId('dawn');
    this.addId('treader');
    this.addId('vessel');
    this.addId('ship');

    this._vehicleType = 'ferry';
    this._capacity = 20;

    // Set up the route
    const route: FerryStop[] = [
      { roomPath: '/areas/valdoria/harbor/dock', name: 'Valdoria Harbor' },
      { roomPath: '/areas/valdoria/isle_of_dreams/dock', name: 'Isle of Dreams' },
    ];
    this.setRoute(route);

    // Set up the schedule
    // Travel: 2 minutes, Dock: 5 minutes, Warnings at 5m, 1m, 10s
    this.setSchedule({
      travelTime: 120000,      // 2 minutes travel
      dockTime: 300000,        // 5 minutes at dock
      warningTimes: [300000, 60000, 10000], // 5 min, 1 min, 10 sec warnings
    });

    this.setupRoom();
  }

  private setupRoom(): void {
    // Add actions for interacting with the ferry
    this.addAction('look', this.cmdLook.bind(this));
    this.addAction('sit', this.cmdSit.bind(this));
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Start docked at Valdoria Harbor
    const harborPath = '/areas/valdoria/harbor/dock';

    try {
      if (typeof efuns !== 'undefined' && efuns.loadBlueprint) {
        const harbor = await efuns.loadBlueprint(harborPath);
        if (harbor) {
          await this.dock(harbor as import('../../../std/room.js').Room);
        }
      }
    } catch (error) {
      console.error('[DawnTreader] Failed to dock at harbor:', error);
    }

    // Start the ferry schedule
    await this.startSchedule();

    console.log('[DawnTreader] The Dawn Treader ferry has been initialized and schedule started.');
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

    if (target === 'benches' || target === 'seats' || target === 'bench') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe benches are made of sturdy oak, with thick cushions covered\n' +
          'in sea-blue fabric. They\'re worn but comfortable, bearing the\n' +
          'marks of countless travelers who have crossed these waters.\n'
        );
      }
      return true;
    }

    if (target === 'cabin' || target === 'shelter') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe covered cabin offers shelter from rain and spray. Inside,\n' +
          'a few more benches line the walls, and a small stove provides\n' +
          'warmth on cold crossings. Maps and nautical charts adorn the walls.\n'
        );
      }
      return true;
    }

    if (target === 'wheel' || target === "captain's wheel" || target === 'helm') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe brass-bound captain\'s wheel gleams in the light. It turns\n' +
          'slightly on its own, guided by whatever enchantment allows the\n' +
          'ferry to follow its route without a captain. You probably\n' +
          'shouldn\'t touch it.\n'
        );
      }
      return true;
    }

    if (target === 'lanterns' || target === 'lantern' || target === 'lights') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe brass lanterns flicker with a steady, warm flame that\n' +
          'never seems to gutter despite the sea breeze. Magic, perhaps,\n' +
          'or simply excellent craftsmanship.\n'
        );
      }
      return true;
    }

    if (target === 'railing' || target === 'railings' || target === 'brass') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe brass railings are polished to a bright shine, showing\n' +
          'the care the ferry\'s maintenance crew puts into the vessel.\n' +
          'They\'re sturdy enough to lean on while watching the waters.\n'
        );
      }
      return true;
    }

    if (target === 'water' || target === 'sea' || target === 'waves') {
      if (typeof receiver.receive === 'function') {
        if (this._docked) {
          receiver.receive(
            '\nThe harbor waters lap gently against the ferry\'s hull.\n' +
            'From here you can see the dock and the town beyond.\n'
          );
        } else {
          receiver.receive(
            '\nThe waters stretch endlessly around you. Strange lights\n' +
            'occasionally glimmer in the depths, and the waves seem\n' +
            'to carry whispers from distant shores.\n'
          );
        }
      }
      return true;
    }

    if (typeof receiver.receive === 'function') {
      receiver.receive("\nYou don't see that on the ferry.\n");
    }
    return true;
  }

  private cmdSit(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive(
        '\nYou settle onto one of the cushioned benches. The gentle\n' +
        'rocking of the ferry is surprisingly soothing.\n'
      );
    }

    // Broadcast to others
    const playerName = player.name || 'Someone';
    this.broadcast(`${playerName} sits down on one of the benches.`, { exclude: [player] });

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

export default DawnTreader;
