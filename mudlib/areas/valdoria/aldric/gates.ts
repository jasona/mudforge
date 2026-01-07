/**
 * Town Gates - The southern entrance to the town.
 */

import { Room, MudObject } from '../../../lib/std.js';

/**
 * The Town Gates room.
 */
export class TownGates extends Room {
  constructor() {
    super();
    this.shortDesc = '{bold}{cyan}Town Gates{/}';
    this.longDesc = `You stand at the town's southern gates, a massive {dim}stone archway{/} flanked by
sturdy {cyan}guard towers{/}. The great {yellow}wooden doors{/} stand open during daylight hours,
allowing a steady stream of travelers, {magenta}merchants{/}, and farmers to pass through.

{magenta}Guards{/} in leather armor check the occasional wagon, collecting tolls and
inspecting cargo for contraband. A weathered {yellow}signpost{/} points the way to
various destinations: "{white}North Road - Capital, 3 days{/}" and "{white}East Road -
Coastal Villages, 1 day{/}."

Beyond the gates, the cobblestones give way to a dusty dirt road that winds
through {green}farmland{/} toward distant {blue}hills{/}. You can see travelers on the road,
their figures small against the vast landscape.

A small {dim}guardhouse{/} sits beside the gate, and a {yellow}stable{/} offers services to
those arriving on horseback. The bustle of the town center lies to the {green}north{/}.`;

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('north', '/areas/valdoria/aldric/center');
    // Could add 'south' to wilderness/roads later

    this.addAction('look', this.cmdLook.bind(this));
    this.addAction('read', this.cmdRead.bind(this));
  }

  override async onCreate(): Promise<void> {
    console.log('[TownGates] The town gates have been initialized.');
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\nThe guards glance at you as you approach the town gates.\n');
    }
    this.broadcast(`${obj.shortDesc} arrives at the town gates.`, { exclude: [obj] });
  }

  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    this.broadcast(`${obj.shortDesc} leaves the gates area.`, { exclude: [obj] });
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

    if (target === 'guards' || target === 'guard') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe gate guards look bored but alert. They wear practical leather\n' +
          'armor rather than the ceremonial plate of the castle guards, and\n' +
          'carry short swords and crossbows. One of them yawns while checking\n' +
          'a merchant\'s papers.\n'
        );
      }
      return true;
    }

    if (target === 'towers' || target === 'tower') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe guard towers are practical rather than elegant - squat stone\n' +
          'structures with narrow windows for archers. You can see guards\n' +
          'moving about inside, and the glint of a spyglass as someone\n' +
          'surveys the road.\n'
        );
      }
      return true;
    }

    if (target === 'signpost' || target === 'sign' || target === 'signs') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe weathered wooden signpost has multiple arms pointing in\n' +
          'different directions:\n' +
          '  North Road -> Capital City (3 days travel)\n' +
          '  East Road  -> Coastal Villages (1 day travel)\n' +
          '  West Road  -> Mountain Pass (2 days travel)\n' +
          'Someone has carved "Beware the forest" beneath the official signs.\n'
        );
      }
      return true;
    }

    if (target === 'guardhouse' || target === 'house') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe small guardhouse serves as the checkpoint for incoming traffic.\n' +
          'Through the window you can see a desk piled with papers, a rack\n' +
          'of weapons, and a guard eating his lunch. A notice on the door\n' +
          'lists the current toll rates.\n'
        );
      }
      return true;
    }

    if (target === 'stable' || target === 'stables') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe town stable is a long wooden building with a thatched roof.\n' +
          'The smell of hay and horses wafts from within. A stable hand\n' +
          'leads a fine chestnut mare to water while another brushes down\n' +
          'a travel-worn pony. A sign advertises boarding and horse sales.\n'
        );
      }
      return true;
    }

    if (target === 'road' || target === 'roads' || target === 'outside') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nBeyond the gates, the road stretches south through patchwork\n' +
          'farmland - golden wheat fields, green pastures dotted with sheep,\n' +
          'and the occasional farmhouse. In the distance, forested hills\n' +
          'rise against the sky, mysterious and inviting.\n'
        );
      }
      return true;
    }

    if (target === 'doors' || target === 'gate' || target === 'gates') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe town gates are massive wooden doors reinforced with iron bands\n' +
          'and studs. They\'re old but well-maintained, capable of being\n' +
          'sealed shut and barred from within. Deep grooves in the stone\n' +
          'archway show where a portcullis can be lowered in times of danger.\n'
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

  private cmdRead(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const target = args.toLowerCase();
    const receiver = player as MudObject & { receive?: (msg: string) => void };

    if (!target || target === 'notice' || target === 'tolls' || target === 'door') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\n=== TOLL RATES ===\n' +
          'By order of the Town Council:\n' +
          '  Pedestrians.................. FREE\n' +
          '  Horse and rider.............. 1 copper\n' +
          '  Cart or wagon................ 3 copper\n' +
          '  Merchant caravan............. 1 silver\n' +
          '  Livestock (per head)......... 1 copper\n\n' +
          'Toll exemptions for registered citizens and nobility.\n' +
          'Gates close at sunset. No exceptions.\n'
        );
      }
      return true;
    }

    if (target === 'signpost' || target === 'sign') {
      return this.cmdLook('signpost');
    }

    if (typeof receiver.receive === 'function') {
      receiver.receive("\nRead what?\n");
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

export default TownGates;
