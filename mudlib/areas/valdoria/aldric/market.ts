/**
 * Market Square - The bustling merchant district.
 */

import { Room, MudObject } from '../../../lib/std.js';

/**
 * The Market Square room.
 */
export class MarketSquare extends Room {
  constructor() {
    super();
    this.shortDesc = '{bold}{yellow}Market Square{/}';
    this.longDesc = `You find yourself in the heart of the merchant district, a sprawling open-air
market that stretches in every direction. {YELLOW}Colorful awnings{/} shade countless
{yellow}stalls{/} and carts, each {magenta}vendor{/} crying out to attract customers to their wares.

The air is alive with competing scents: exotic {red}spices{/} from the east, fresh-cut
{magenta}flowers{/}, tanned leather, and the occasional whiff of something less pleasant
from the livestock pens nearby. Haggling voices rise and fall in an endless
symphony of commerce.

To your left, a row of permanent shops lines the street - a {cyan}tailor{/}, an
{green}apothecary{/}, and a {YELLOW}jeweler{/} with iron bars across its windows. To your right,
farmers display baskets of fresh {green}produce{/} while a {red}butcher{/} hawks cuts of meat
from a bloody stall.

A narrow alley to the {green}north{/} leads to the {yellow}bakery{/}. The {yellow}tannery{/} lies to the
{green}west{/}, its pungent smell occasionally drifting over. The town center lies to the {green}east{/}.
To the {green}northwest{/}, you can see the glow of a {red}forge{/} and hear the ring of a hammer on steel.
To the {green}south{/}, a cheerful sign reads "{green}Whiskers & Hooves Pet Emporium{/}".`;

    // Map coordinates - west of center
    this.setMapCoordinates({ x: -1, y: 0, z: 0, area: '/areas/valdoria/aldric' });
    this.setTerrain('town');
    this.setMapIcon('M');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('east', '/areas/valdoria/aldric/center');
    this.addExit('north', '/areas/valdoria/aldric/bakery');
    this.addExit('west', '/areas/valdoria/aldric/tannery');
    this.addExit('northwest', '/areas/valdoria/aldric/forge');
    this.addExit('south', '/areas/valdoria/aldric/pet_store');

    // Set NPCs that belong to this room - they'll respawn on reset if missing
    this.setNpcs(['/areas/valdoria/aldric/merchant']);

    this.addAction('look', this.cmdLook.bind(this));
    this.addAction('browse', this.cmdBrowse.bind(this));
    this.addAction('smell', this.cmdSmell.bind(this));
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Spawn NPCs defined via setNpcs()
    await this.spawnMissingNpcs();

    console.log('[MarketSquare] The market square has been initialized.');
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\nThe cacophony of the market engulfs you as you enter.\n');
    }
    this.broadcast(`${obj.shortDesc} wanders into the market.`, { exclude: [obj] });
  }

  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    this.broadcast(`${obj.shortDesc} disappears into the crowd.`, { exclude: [obj] });
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

    if (target === 'stalls' || target === 'vendors' || target === 'merchants') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe market stalls offer an incredible variety of goods:\n' +
          '- A cloth merchant displays bolts of silk and wool\n' +
          '- A spice trader\'s stall is a rainbow of colorful powders\n' +
          '- A weapon smith shows off gleaming blades and axes\n' +
          '- A potter arranges delicate ceramics on wooden shelves\n' +
          '- A strange hooded figure sells mysterious trinkets\n' +
          'Try "browse <merchant>" for more details.\n'
        );
      }
      return true;
    }

    if (target === 'tailor' || target === 'tailor shop') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe tailor\'s shop window displays elegant clothing - fine dresses,\n' +
          'nobleman\'s doublets, and practical traveling cloaks. A sign reads\n' +
          '"Master Thornwick\'s Fine Garments - Fitted While You Wait."\n'
        );
      }
      return true;
    }

    if (target === 'apothecary' || target === 'apothecary shop') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe apothecary\'s window is filled with mysterious bottles, dried\n' +
          'herbs hanging in bundles, and curious apparatus. A faded sign\n' +
          'promises "Remedies for All Ailments - Love Potions a Specialty."\n' +
          'The interior is dim and smells of strange things.\n'
        );
      }
      return true;
    }

    if (target === 'jeweler' || target === 'jeweler shop' || target === 'jewelry') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nHeavy iron bars protect the jeweler\'s windows, behind which gems\n' +
          'and precious metals glitter enticingly. A stern-faced dwarf can\n' +
          'be seen within, examining something through a magnifying lens.\n' +
          'A sign warns: "Thieves Will Be Prosecuted Vigorously."\n'
        );
      }
      return true;
    }

    if (target === 'produce' || target === 'farmers' || target === 'vegetables') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe farmers\' stalls overflow with the season\'s bounty: plump\n' +
          'tomatoes, leafy cabbages, strings of onions, baskets of apples,\n' +
          'and piles of root vegetables. The farmers chat among themselves,\n' +
          'weathered faces creased with good-natured wrinkles.\n'
        );
      }
      return true;
    }

    if (target === 'butcher' || target === 'meat') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe butcher\'s stall is not for the squeamish. Whole carcasses\n' +
          'hang from hooks, and the butcher himself - a massive man in a\n' +
          'blood-stained apron - cleaves through a side of beef with\n' +
          'practiced efficiency. Flies buzz lazily in the warm air.\n'
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

  private cmdBrowse(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };

    if (!args) {
      if (typeof receiver.receive === 'function') {
        receiver.receive('\nBrowse what? Try browsing the stalls, spices, weapons, or trinkets.\n');
      }
      return true;
    }

    const target = args.toLowerCase();

    if (target === 'spices' || target === 'spice') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe spice merchant gestures grandly at his wares:\n' +
          '"Finest spices from across the known world! Saffron from the\n' +
          'eastern kingdoms, pepper from the southern jungles, cinnamon\n' +
          'from the isles! Make your meals memorable, yes?"\n' +
          'The scents are almost overwhelming this close.\n'
        );
      }
      return true;
    }

    if (target === 'weapons' || target === 'weapon' || target === 'blades') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe weapon smith shows off his inventory with pride:\n' +
          '"All hand-forged, all battle-tested! Swords, axes, maces -\n' +
          'whatever suits your fighting style. That longsword there?\n' +
          'Killed a dozen orcs in the border wars, it did!"\n' +
          'The steel gleams wickedly in the sunlight.\n'
        );
      }
      return true;
    }

    if (target === 'trinkets' || target === 'mysterious' || target === 'hooded') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe hooded figure speaks in a rasping whisper:\n' +
          '"Ahh, a discerning customer. I have... special items. Charms\n' +
          'for luck, amulets for protection, talismans for... other things.\n' +
          'Nothing illegal, of course. The guards and I have an... understanding."\n' +
          'You notice a strange symbol tattooed on the merchant\'s wrist.\n'
        );
      }
      return true;
    }

    if (typeof receiver.receive === 'function') {
      receiver.receive('\nYou browse that stall but find nothing of particular interest.\n');
    }
    return true;
  }

  private cmdSmell(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive(
        '\nYour nose is assaulted by a complex tapestry of aromas:\n' +
        'The warm sweetness of fresh bread from the nearby bakery...\n' +
        'Sharp, exotic spices that make your eyes water...\n' +
        'Fresh-cut flowers mingling with earthy vegetables...\n' +
        'And underneath it all, the less pleasant scents of livestock,\n' +
        'fish, and too many people in too small a space.\n'
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

export default MarketSquare;
