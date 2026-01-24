/**
 * The Rusty Blade - A mercenary pub where adventurers can hire fighters.
 */

import { Room, MudObject } from '../../../lib/std.js';

/**
 * The Pub room - mercenary hiring location.
 */
export class Pub extends Room {
  constructor() {
    super();
    this.shortDesc = '{bold}{red}The Rusty Blade{/}';
    this.longDesc = `You step into a dim, smoke-filled establishment that reeks of sweat,
leather, and steel. Unlike the friendly bustle of The Foaming Flagon, this place
has an edge to it - the patrons here are {bold}warriors for hire{/}.

Scarred veterans nurse drinks at rough wooden tables, their weapons always within
reach. A massive {yellow}notice board{/} dominates one wall, covered in job postings
and wanted posters. In the corner, a group of mercenaries dice and argue over past
battles.

Behind the bar, a {magenta}grizzled broker{/} keeps order with a heavy cudgel visible
under the counter. He arranges contracts between adventurers and sellswords for a
modest fee.

A heavy wooden {dim}door{/} leads back to the main {green}street{/} to the {green}northeast{/}.
Through a beaded curtain to the {green}south{/}, you can see a {dim}back room{/} where
private negotiations take place.`;

    // Map coordinates - southwest of center
    this.setMapCoordinates({ x: -1, y: 1, z: 0, area: '/areas/valdoria/aldric' });
    this.setTerrain('town');
    this.setMapIcon('P');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('northeast', '/areas/valdoria/aldric/center');

    // Set NPCs that belong to this room
    this.setNpcs(['/areas/valdoria/aldric/broker']);

    this.addAction('look', this.cmdLook.bind(this));
    this.addAction('read', this.cmdRead.bind(this));
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Spawn NPCs defined via setNpcs()
    await this.spawnMissingNpcs();

    console.log('[Pub] The Rusty Blade has been initialized.');
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\nThe smell of ale and the clatter of dice greet you as you enter.\n');
    }
    this.broadcast(`${obj.shortDesc} pushes through the heavy door.`, { exclude: [obj] });
  }

  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    this.broadcast(`${obj.shortDesc} heads out.`, { exclude: [obj] });
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

    if (target === 'board' || target === 'notice board' || target === 'noticeboard' || target === 'notices') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe notice board is cluttered with job postings:\n\n' +
          '  {yellow}WANTED:{/} Escort for merchant caravan - 50 gold\n' +
          '  {yellow}SEEKING:{/} Dungeon delvers, danger pay included\n' +
          '  {red}BOUNTY:{/} Goblin chief, dead or alive - 200 gold\n' +
          '  {dim}[TAKEN]{/} Guard duty at noble estate\n' +
          '  {yellow}HELP NEEDED:{/} Clear rats from cellar - 10 gold\n\n' +
          '{dim}Most jobs require a party. Talk to the broker to hire mercenaries.{/}\n'
        );
      }
      return true;
    }

    if (target === 'mercenaries' || target === 'mercs' || target === 'veterans' || target === 'warriors') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe mercenaries are a rough-looking bunch:\n' +
          '- A one-eyed swordsman sharpening his blade\n' +
          '- A robed figure muttering arcane words over a drink\n' +
          '- A lithe woman in dark leathers counting coins\n' +
          '- A heavily armored cleric polishing a holy symbol\n\n' +
          '{dim}To hire a mercenary, speak to the broker.{/}\n'
        );
      }
      return true;
    }

    if (target === 'bar' || target === 'counter') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe bar is stained and scarred from years of use. Behind it, shelves\n' +
          'hold various bottles and a heavy cudgel for troublemakers. The broker\n' +
          'stands ready to conduct business.\n'
        );
      }
      return true;
    }

    if (target === 'door') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe heavy wooden door is reinforced with iron bands. It leads back\n' +
          'to the streets of Aldric.\n'
        );
      }
      return true;
    }

    // Check inventory for NPCs
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

  private cmdRead(args: string): boolean {
    const target = args?.toLowerCase() || '';

    if (target === 'board' || target === 'notice board' || target === 'notices' || !target) {
      return this.cmdLook('board');
    }

    const player = this.findPlayerInRoom();
    if (player) {
      const receiver = player as MudObject & { receive?: (msg: string) => void };
      if (typeof receiver.receive === 'function') {
        receiver.receive("\nRead what?\n");
      }
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

export default Pub;
