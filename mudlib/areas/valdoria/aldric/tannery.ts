/**
 * The Tannery - Where leather goods are made from animal hides.
 */

import { Room, MudObject } from '../../../lib/std.js';

export class Tannery extends Room {
  constructor() {
    super();
    this.shortDesc = '{bold}{yellow}The Tannery{/}';
    this.longDesc = `The pungent smell of curing leather and tanning agents assaults your
nose as you enter this workman's shop. Great wooden {dim}vats{/} line one wall,
filled with mysterious liquids used in the leather-making process.

{yellow}Animal hides{/} in various stages of processing hang from hooks and
stretch across wooden frames. Finished {yellow}leather goods{/} - belts, pouches,
armor pieces, and boots - are displayed on {dim}shelves{/} near the entrance.

The floor is stained dark from years of work, and the walls are
decorated with {dim}tools{/} of the trade: curved knives, scrapers, and
awls of various sizes.

The {green}market square{/} lies to the {green}east{/}.`;

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('east', '/areas/valdoria/aldric/market');

    this.addAction('look', this.cmdLook.bind(this));
    this.addAction('smell', this.cmdSmell.bind(this));
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Spawn Tanner Gorik
    if (typeof efuns !== 'undefined' && efuns.cloneObject) {
      try {
        const tanner = await efuns.cloneObject('/areas/valdoria/aldric/tanner');
        if (tanner && typeof tanner.moveTo === 'function') {
          await tanner.moveTo(this);
        }
      } catch (e) {
        console.error('[Tannery] Failed to spawn tanner:', e);
      }
    }

    console.log('[Tannery] The tannery has been initialized.');
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\nThe strong smell of leather and chemicals fills your nostrils.\n');
    }
    this.broadcast(`${obj.shortDesc} enters the tannery.`, { exclude: [obj] });
  }

  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    this.broadcast(`${obj.shortDesc} leaves the tannery.`, { exclude: [obj] });
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

    if (target === 'vats' || target === 'vat') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe wooden vats contain various tanning solutions:\n' +
          '- One holds a murky brown liquid that smells of oak bark\n' +
          '- Another contains a yellowish mixture with an acrid smell\n' +
          '- A third is filled with what appears to be salt water\n' +
          'The tanner would know the purpose of each.\n'
        );
      }
      return true;
    }

    if (target === 'hides' || target === 'hide' || target === 'leather') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nHides in various stages of processing line the walls:\n' +
          '- Fresh hides, still stiff and hairy\n' +
          '- Half-processed hides, scraped clean of hair\n' +
          '- Supple finished leather, ready for crafting\n' +
          'The transformation from raw hide to fine leather is remarkable.\n'
        );
      }
      return true;
    }

    if (target === 'tools' || target === 'tool') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe tools of the tanning trade hang in orderly rows:\n' +
          '- Curved fleshing knives for scraping hides\n' +
          '- Awls and needles for stitching leather\n' +
          '- Burnishing tools for finishing edges\n' +
          '- Stamping dies for creating patterns\n' +
          'Each shows signs of years of careful use.\n'
        );
      }
      return true;
    }

    if (target === 'goods' || target === 'shelves' || target === 'products') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe finished goods on display include:\n' +
          '- Sturdy leather belts with bronze buckles\n' +
          '- Pouches and satchels of various sizes\n' +
          '- Leather armor pieces - bracers, jerkins, greaves\n' +
          '- Well-crafted boots meant for travel\n' +
          'The craftsmanship is evident in each piece.\n'
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

  private cmdSmell(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive(
        '\nThe smell is... complex. And not entirely pleasant:\n' +
        'The sharp, chemical tang of tanning agents...\n' +
        'The earthy scent of oak bark and other natural materials...\n' +
        'The musky smell of raw and curing hides...\n' +
        'And underneath it all, an organic odor best not thought about.\n' +
        'Tanners must have strong stomachs.\n'
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

export default Tannery;
