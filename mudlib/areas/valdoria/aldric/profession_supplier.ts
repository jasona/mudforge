/**
 * Profession Supplier
 *
 * Sells starter gathering tools.
 */

import { Merchant } from '../../../lib/std.js';

export class ProfessionSupplier extends Merchant {
  constructor() {
    super();
    this.name = 'Quartermaster Tamsin';
    this.shortDesc = 'Quartermaster Tamsin';
    this.longDesc = `Quartermaster Tamsin is a practical veteran with calloused hands and a keen
eye for worn equipment. She moves with the brisk confidence of someone who has
fitted a thousand adventurers with exactly what they need and nothing they
don't.`;
    this.setLevel(8, 'normal');
    this.maxHealth = 90;
    this.health = 90;
    this.gender = 'female';

    this.setMerchant({
      name: 'Quartermaster Tamsin',
      shopName: "Tamsin's Field Outfitters",
      shopDescription: 'Starter tools for gathering professions.',
      buyRate: 0.45,
      sellRate: 1.0,
      acceptedTypes: ['all'],
      shopGold: 1500,
      charismaEffect: 0.01,
    });

    this.setupStock();
    this.setupChats();
    this.setupResponses();
  }

  private setupStock(): void {
    this.addStock('/areas/valdoria/aldric/items/starter_pickaxe', 'Crude Pickaxe', 10, -1, 'tool');
    this.addStock('/areas/valdoria/aldric/items/starter_herbalism_kit', 'Crude Herbalism Kit', 10, -1, 'tool');
    this.addStock('/areas/valdoria/aldric/items/starter_fishing_rod', 'Crude Fishing Rod', 10, -1, 'tool');
    this.addStock('/areas/valdoria/aldric/items/starter_logging_axe', 'Crude Logging Axe', 10, -1, 'tool');
    this.addStock('/areas/valdoria/aldric/items/starter_skinning_knife', 'Crude Skinning Knife', 10, -1, 'tool');
  }

  private setupChats(): void {
    this.addChat('checks the edge on a skinning knife with a practiced thumb.', 'emote');
    this.addChat('No fancy relics here. Just reliable tools that do the job.', 'say');
    this.addChat('re-wraps a fishing rod handle with fresh cord.', 'emote');
  }

  private setupResponses(): void {
    this.addResponse(
      /hello|hi|greetings|hey/i,
      'Need a tool to get started? Say "shop" and pick your trade.',
      'say'
    );
    this.addResponse(
      /herb|herbalism|mine|mining|fish|fishing|log|logging|skin|skinning/i,
      'I stock all the starter tools: pickaxe, herbalism kit, fishing rod, logging axe, and skinning knife.',
      'say'
    );
    this.addResponse(
      /shop|buy|sell|trade|wares|browse/i,
      'Open the shop and I will set you up.',
      'say'
    );
  }
}

export default ProfessionSupplier;

