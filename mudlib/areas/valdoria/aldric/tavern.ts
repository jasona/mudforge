/**
 * The Foaming Flagon - A warm and welcoming tavern.
 */

import { Room, MudObject } from '../../../lib/std.js';

/**
 * The Tavern room.
 */
export class Tavern extends Room {
  constructor() {
    super();
    this.shortDesc = '{bold}{yellow}The Foaming Flagon{/}';
    this.longDesc = `You step into the warmth and noise of {bold}{yellow}The Foaming Flagon{/}, the town's most
popular tavern. A great stone {red}fireplace{/} dominates one wall, its {RED}crackling
flames{/} casting dancing shadows across the room. Rough-hewn oak tables and
benches fill the common room, most occupied by locals nursing tankards of {yellow}ale{/}.

The bar stretches along the back wall, behind which a stout {magenta}innkeeper{/} polishes
glasses while keeping a watchful eye on the crowd. Shelves behind him display
an impressive array of bottles, casks, and kegs. A {dim}chalkboard{/} lists the day's
fare and drink prices.

A wooden {dim}staircase{/} in the corner leads up to the guest rooms, while a doorway
near the bar offers glimpses of a busy kitchen. The air is thick with the
scent of roasting meat, spilled ale, and pipe smoke. A {magenta}bard{/} in the corner
strums a lute, adding melody to the general din.

The exit to the town square lies to the {green}west{/}.`;

    // Map coordinates - east of center
    this.setMapCoordinates({ x: 1, y: 0, z: 0, area: '/areas/valdoria/aldric' });
    this.setTerrain('town');
    this.setMapIcon('T');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('west', '/areas/valdoria/aldric/center');
    // Could add 'up' to guest rooms later

    this.addAction('look', this.cmdLook.bind(this));
    this.addAction('order', this.cmdOrder.bind(this));
    this.addAction('buy', this.cmdOrder.bind(this));
    this.addAction('listen', this.cmdListen.bind(this));
  }

  override async onCreate(): Promise<void> {
    console.log('[Tavern] The Foaming Flagon has been initialized.');
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\nWarm air and the smell of ale greet you as you enter the tavern.\n');
    }
    this.broadcast(`${obj.shortDesc} pushes through the tavern door.`, { exclude: [obj] });
  }

  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    this.broadcast(`${obj.shortDesc} heads out into the street.`, { exclude: [obj] });
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

    if (target === 'innkeeper' || target === 'keeper' || target === 'barkeep') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe innkeeper is a barrel-chested man with a magnificent handlebar\n' +
          'mustache and arms like tree trunks. Despite his intimidating size,\n' +
          'his eyes twinkle with good humor. He wipes down the bar with a\n' +
          'practiced hand while chatting with the regulars.\n'
        );
      }
      return true;
    }

    if (target === 'fireplace' || target === 'fire') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe great stone fireplace is large enough to roast a whole boar -\n' +
          'and from the smell, that might be exactly what\'s happening. Orange\n' +
          'flames dance merrily, casting a warm glow across the common room\n' +
          'and providing a welcome respite from the chill outside.\n'
        );
      }
      return true;
    }

    if (target === 'bard' || target === 'musician') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe bard is a willowy elf with long silver hair and fingers that\n' +
          'dance across the lute strings with supernatural grace. She seems\n' +
          'lost in her music, eyes half-closed, a faint smile on her lips.\n' +
          'A hat at her feet holds a modest collection of coins.\n'
        );
      }
      return true;
    }

    if (target === 'menu' || target === 'chalkboard' || target === 'board') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\n=== THE FOAMING FLAGON MENU ===\n' +
          'Drinks:\n' +
          '  Ale (pint)............. 2 copper\n' +
          '  Mead................... 5 copper\n' +
          '  Wine (glass)........... 8 copper\n' +
          '  Dwarven Stout.......... 1 silver\n\n' +
          'Food:\n' +
          '  Bread & Cheese......... 3 copper\n' +
          '  Meat Pie............... 6 copper\n' +
          '  Roast Boar Platter..... 2 silver\n' +
          '  Traveler\'s Stew........ 4 copper\n'
        );
      }
      return true;
    }

    if (target === 'stairs' || target === 'staircase') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe wooden staircase creaks with age but looks sturdy enough. A\n' +
          'small sign at the bottom reads "Rooms: 5 silver per night. Inquire\n' +
          'with the innkeeper." You can hear footsteps and muffled conversation\n' +
          'from the floor above.\n'
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

  private cmdOrder(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };

    if (!args) {
      if (typeof receiver.receive === 'function') {
        receiver.receive('\nOrder what? Try looking at the menu.\n');
      }
      return true;
    }

    const item = args.toLowerCase();

    if (item.includes('ale')) {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe innkeeper slides a foaming tankard of ale across the bar to you.\n' +
          '"Two copper," he says with a friendly nod. The ale is cold and\n' +
          'refreshing, with a slightly bitter finish.\n'
        );
      }
      this.broadcast(`${player.shortDesc} orders a pint of ale.`, { exclude: [player] });
      return true;
    }

    if (item.includes('mead')) {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe innkeeper pours you a goblet of golden mead from a ceramic jug.\n' +
          '"Five copper for the honey wine," he says. The mead is sweet and\n' +
          'warming, with hints of clover and summer flowers.\n'
        );
      }
      this.broadcast(`${player.shortDesc} orders a goblet of mead.`, { exclude: [player] });
      return true;
    }

    if (item.includes('stew')) {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nA serving girl brings you a steaming bowl of traveler\'s stew, thick\n' +
          'with vegetables, potatoes, and chunks of mystery meat. A hunk of\n' +
          'crusty bread accompanies it. "Four copper," she says cheerfully.\n'
        );
      }
      this.broadcast(`${player.shortDesc} tucks into a bowl of stew.`, { exclude: [player] });
      return true;
    }

    if (typeof receiver.receive === 'function') {
      receiver.receive('\nThe innkeeper shrugs. "We don\'t have that. Check the menu."\n');
    }
    return true;
  }

  private cmdListen(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive(
        '\nYou tune into the various conversations around you:\n' +
        '"...heard there\'s trouble on the northern road again..."\n' +
        '"...the harvest looks good this year, thank the gods..."\n' +
        '"...my cousin saw something in the old ruins, I swear..."\n' +
        'The bard\'s song weaves between the chatter, a melancholy tune about\n' +
        'a knight and his lost love.\n'
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

export default Tavern;
