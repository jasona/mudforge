/**
 * Isle of Dreams Dock - A mysterious island's arrival point.
 */

import { Room, MudObject } from '../../lib/std.js';

/**
 * The Isle of Dreams Dock room.
 */
export class IsleOfDreamsDock extends Room {
  constructor() {
    super();
    this.shortDesc = '{bold}{magenta}Isle of Dreams - Dock{/}';
    this.longDesc = `You stand on an ancient stone pier that juts out into waters of an
impossible, shimmering {magenta}violet{/} hue. Unlike the weathered wood of Valdoria's
harbor, this dock seems to be carved from a single piece of {cyan}moonstone{/},
its surface cool and smooth beneath your feet.

Strange {magenta}luminescent flowers{/} grow in the cracks between the stones, their
petals pulsing with a soft inner light. The air here is thick with the
scent of jasmine and something else... something that makes your thoughts
drift toward half-remembered {yellow}dreams{/}.

To the {green}north{/}, a winding path of white stones leads into an ethereal
{green}forest{/} where the trees seem to whisper secrets in an unknown tongue.

A crystalline {cyan}signpost{/} stands nearby, its letters shifting and rearranging
themselves as you watch.`;

    // Map coordinates - separate area for the island
    this.setMapCoordinates({ x: 0, y: 0, z: 0, area: '/areas/isle_of_dreams' });
    this.setTerrain('town');
    this.setMapIcon('D');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('north', '/areas/isle_of_dreams/forest_edge');

    this.addAction('read', this.cmdRead.bind(this));
    this.addAction('look', this.cmdLook.bind(this));
    this.addAction('smell', this.cmdSmell.bind(this));
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();
    console.log('[IsleOfDreamsDock] The Isle of Dreams dock has been initialized.');
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\n{magenta}A strange sense of peace washes over you as you arrive...{/}\n');
    }
  }

  private cmdRead(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };
    const target = args?.toLowerCase() || '';

    if (target === 'signpost' || target === 'sign') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\n{magenta}═══════════════════════════════════════{/}\n' +
          '{bold}{magenta}        WELCOME TO THE ISLE OF DREAMS{/}\n' +
          '{magenta}═══════════════════════════════════════{/}\n' +
          '\n' +
          '  {dim}Here, the boundary between waking{/}\n' +
          '  {dim}and dreaming grows thin...{/}\n' +
          '\n' +
          '  {cyan}The ferry returns to Valdoria Harbor{/}\n' +
          '  {cyan}on a regular schedule.{/}\n' +
          '\n' +
          '  {yellow}Beware what you wish for here,{/}\n' +
          '  {yellow}for dreams have power.{/}\n' +
          '{magenta}═══════════════════════════════════════{/}\n'
        );
      }
      return true;
    }

    if (typeof receiver.receive === 'function') {
      receiver.receive('\nRead what? The crystalline signpost catches your eye.\n');
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

    if (target === 'water' || target === 'waters' || target === 'violet') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe water here defies natural law. It shimmers with an inner\n' +
          'violet light, and you could swear you see shapes moving in\n' +
          'its depths - but when you look directly at them, they vanish.\n' +
          'You have the distinct feeling the water is looking back at you.\n'
        );
      }
      return true;
    }

    if (target === 'flowers' || target === 'luminescent flowers') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe flowers pulse gently, as if breathing. Their light seems\n' +
          'to respond to your presence, growing slightly brighter as you\n' +
          'approach. You feel an urge to touch them, to pluck one and\n' +
          'keep it... but something warns you that might not be wise.\n'
        );
      }
      return true;
    }

    if (target === 'pier' || target === 'dock' || target === 'moonstone') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe pier is carved from a single massive piece of moonstone,\n' +
          'impossibly large. The surface is covered in faint runes that\n' +
          'shift when you\'re not looking directly at them. They seem\n' +
          'old - older perhaps than the world itself.\n'
        );
      }
      return true;
    }

    if (target === 'forest' || target === 'trees' || target === 'path') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe forest ahead seems to exist in a permanent twilight,\n' +
          'though there\'s no sun in the sky to set. The white stone\n' +
          'path winds between trees of silver and gold, their leaves\n' +
          'tinkling like wind chimes in the ethereal breeze.\n'
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
      receiver.receive("\nYou don't see that here... or perhaps you do, but only from the corner of your eye.\n");
    }
    return true;
  }

  private cmdSmell(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive(
        '\n{magenta}The air is thick with the scent of night-blooming jasmine,{/}\n' +
        '{magenta}vanilla, and something that reminds you of childhood dreams{/}\n' +
        '{magenta}you can no longer quite remember. It makes you slightly drowsy...{/}\n'
      );
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

export default IsleOfDreamsDock;
