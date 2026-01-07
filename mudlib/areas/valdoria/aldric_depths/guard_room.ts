/**
 * Guard Room - Where the dungeon guards once rested.
 */

import { Room, MudObject } from '../../../lib/std.js';

/**
 * The Guard Room.
 */
export class GuardRoom extends Room {
  constructor() {
    super();
    this.shortDesc = '{dim}Abandoned Guard Room{/}';
    this.longDesc = `This small chamber once served as a resting place for the {magenta}dungeon guards{/}.
A {dim}stone table{/} sits in the center, surrounded by overturned stools. Playing
cards and dice are scattered across the floor, left mid-game when the guards
departed for the last time.

A rusted {red}weapon rack{/} stands against one wall, though most of the weapons
have long since been taken or rusted into uselessness. A few {yellow}torches{/} in
sconces provide dim, flickering light.

An old {yellow}fireplace{/} dominates one corner, its hearth cold and filled with
ancient ashes. Above it hangs a faded {cyan}portrait{/} of some forgotten lord,
his stern gaze surveying the room.

The corridor lies to the {green}west{/}.`;

    // Map coordinates - east of corridor (same Y as corridor)
    this.setMapCoordinates({ x: 1, y: 3, z: -1, area: '/areas/valdoria/aldric_depths' });
    this.setTerrain('dungeon');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('west', '/areas/valdoria/aldric_depths/corridor');

    this.addAction('look', this.cmdLook.bind(this));
    this.addAction('play', this.cmdPlay.bind(this));
  }

  override async onCreate(): Promise<void> {
    console.log('[GuardRoom] The guard room has been initialized.');
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\nDust motes swirl in the stale air as you enter.\n');
    }
    this.broadcast(`${obj.shortDesc} enters the guard room.`, { exclude: [obj] });
  }

  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    this.broadcast(`${obj.shortDesc} leaves the guard room.`, { exclude: [obj] });
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

    if (target === 'table' || target === 'stone table') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe heavy stone table is scarred by years of knife marks and\n' +
            'drink rings. An abandoned hand of cards lies face-down, the\n' +
            'game never to be finished. A half-empty bottle of something\n' +
            'long since evaporated sits in the center.\n'
        );
      }
      return true;
    }

    if (target === 'cards' || target === 'dice') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe playing cards are yellowed and brittle with age, but you\n' +
            'can still make out the faded designs. The dice are carved from\n' +
            "bone - quite possibly human bone, given the location.\n"
        );
      }
      return true;
    }

    if (target === 'weapon rack' || target === 'rack' || target === 'weapons') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe weapon rack once held an impressive arsenal. Now only a few\n' +
            "rusted implements remain: a notched sword blade without a hilt,\n" +
            'a mace whose head has corroded into a lumpy mass, and what might\n' +
            'have once been a crossbow.\n'
        );
      }
      return true;
    }

    if (target === 'fireplace' || target === 'hearth' || target === 'fire') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe fireplace is cold and dark, its hearth filled with the grey\n' +
            "ashes of the last fire ever lit here. Soot stains the stones\n" +
            "above, and you notice scratches on the back wall - perhaps\n" +
            'someone tried to climb up the chimney.\n'
        );
      }
      return true;
    }

    if (target === 'portrait' || target === 'painting' || target === 'lord') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          "\nThe portrait depicts a stern-faced nobleman in archaic armor.\n" +
            'A brass plate beneath reads "Lord Aldric the Just" - the founder\n' +
            'of this castle, perhaps. His eyes seem to follow you around the\n' +
            'room with cold disapproval.\n'
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

  private cmdPlay(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive(
        '\nYou pick up the ancient dice and roll them across the table.\n' +
          'They clatter to a stop, showing snake eyes.\n' +
          'Somehow, that feels ominous.\n'
      );
    }
    this.broadcast(`${player.shortDesc} rolls some ancient dice.`, { exclude: [player] });
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

export default GuardRoom;
