/**
 * The Bakery - A warm shop filled with the aroma of fresh bread.
 */

import { Room } from '../../std/room.js';
import { MudObject } from '../../std/object.js';

/**
 * The Bakery room.
 */
export class Bakery extends Room {
  constructor() {
    super();
    this.shortDesc = 'The Bakery';
    this.longDesc = `You step into a small but cozy bakery, immediately enveloped by the heavenly
aroma of fresh-baked bread. The warmth from the great stone oven in the back
provides a welcome respite from the outside air.

Wooden shelves line the walls, displaying the baker's wares: crusty loaves of
various sizes, sweet pastries glistening with honey glaze, meat pies with
golden crusts, and delicate cakes decorated with candied fruits.

A flour-dusted counter separates the shop from the kitchen area, where you
can see the baker - a plump, cheerful woman with rosy cheeks - pulling a
fresh batch of rolls from the oven. Her young apprentice kneads dough at
a wooden table, flour up to his elbows.

A narrow alley leads south back to the market square.`;

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('south', '/areas/town/market');

    this.addAction('look', this.cmdLook.bind(this));
    this.addAction('buy', this.cmdBuy.bind(this));
    this.addAction('smell', this.cmdSmell.bind(this));
  }

  override async onCreate(): Promise<void> {
    console.log('[Bakery] The bakery has been initialized.');
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\nA bell chimes as you enter. The baker looks up with a warm smile.\n');
    }
    this.broadcast(`The bell chimes as ${obj.shortDesc} enters the bakery.`, { exclude: [obj] });
  }

  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    this.broadcast(`${obj.shortDesc} leaves the bakery.`, { exclude: [obj] });
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

    if (target === 'baker' || target === 'woman') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe baker is a stout woman in her middle years, with kind eyes and\n' +
          'strong, capable hands. Her apron is dusted with flour, and a few\n' +
          'wisps of gray hair escape from under her cap. She hums cheerfully\n' +
          'as she works, clearly loving her craft.\n'
        );
      }
      return true;
    }

    if (target === 'apprentice' || target === 'boy' || target === 'lad') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe apprentice is a gangly youth of perhaps fourteen summers, all\n' +
          'elbows and earnestness. He attacks the dough with determined\n' +
          'concentration, occasionally glancing at the baker for approval.\n' +
          'Flour covers nearly every inch of him.\n'
        );
      }
      return true;
    }

    if (target === 'oven' || target === 'ovens') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe great stone oven is the heart of the bakery, its fire kept\n' +
          'burning day and night. Heat radiates from its iron door, and you\n' +
          'can see the orange glow of coals within. Generations of bakers\n' +
          'have used this oven - the stones are blackened with age.\n'
        );
      }
      return true;
    }

    if (target === 'bread' || target === 'loaves' || target === 'loaf') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe bread selection includes:\n' +
          '- Round peasant loaves with thick, crusty shells\n' +
          '- Long baguettes, perfect with butter\n' +
          '- Dark rye bread, dense and flavorful\n' +
          '- Seed-topped rolls, still warm from the oven\n' +
          'Each looks absolutely delicious.\n'
        );
      }
      return true;
    }

    if (target === 'pastries' || target === 'pastry' || target === 'sweets') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe pastry selection makes your mouth water:\n' +
          '- Honey-glazed buns studded with dried fruit\n' +
          '- Flaky fruit tarts with latticed tops\n' +
          '- Cinnamon twists dusted with sugar\n' +
          '- Rich butter cookies in various shapes\n' +
          'The baker clearly has a gift for sweets.\n'
        );
      }
      return true;
    }

    if (target === 'pies' || target === 'pie' || target === 'meat pies') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nSavory meat pies line one shelf, their golden crusts\n' +
          'hiding hearty fillings within:\n' +
          '- Chicken and leek pie\n' +
          '- Beef and mushroom pie\n' +
          '- Shepherd\'s pie with a potato crust\n' +
          'Perfect fare for a hungry traveler.\n'
        );
      }
      return true;
    }

    if (target === 'cakes' || target === 'cake') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe cakes are works of art:\n' +
          '- A towering honey cake with cream layers\n' +
          '- A fruit-studded celebration cake\n' +
          '- Small individual cakes topped with icing flowers\n' +
          'The baker beams with pride when she notices you looking.\n'
        );
      }
      return true;
    }

    if (target === 'shelves' || target === 'wares') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe shelves are arranged with care, displaying the full range\n' +
          'of the bakery\'s offerings. Fresh bread dominates the lower\n' +
          'shelves, while pastries and sweets occupy the higher ones.\n' +
          'Everything looks fresh and inviting.\n'
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

  private cmdBuy(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };

    if (!args) {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe baker smiles. "What would you like, dear? We have fresh bread,\n' +
          'pastries, meat pies, and cakes. All made fresh this morning!"\n'
        );
      }
      return true;
    }

    const item = args.toLowerCase();

    if (item.includes('bread') || item.includes('loaf')) {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe baker wraps a warm loaf in cloth and hands it to you.\n' +
          '"That\'ll be two coppers, dear. Enjoy!"\n' +
          'The bread is still warm, and the smell is divine.\n'
        );
      }
      this.broadcast(`${player.shortDesc} buys a loaf of bread.`, { exclude: [player] });
      return true;
    }

    if (item.includes('pastry') || item.includes('bun') || item.includes('sweet')) {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe baker selects a honey-glazed bun and wraps it carefully.\n' +
          '"Three coppers for the sweet bun. Made with real honey!"\n' +
          'The glaze sticks slightly to your fingers. Delicious.\n'
        );
      }
      this.broadcast(`${player.shortDesc} buys a sweet pastry.`, { exclude: [player] });
      return true;
    }

    if (item.includes('pie')) {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe baker hands you a substantial meat pie, still warm.\n' +
          '"Five coppers for the pie. That\'ll keep you going all day!"\n' +
          'The crust is golden and flaky, the filling rich and savory.\n'
        );
      }
      this.broadcast(`${player.shortDesc} buys a meat pie.`, { exclude: [player] });
      return true;
    }

    if (item.includes('cake')) {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe baker carefully boxes a small decorated cake.\n' +
          '"Eight coppers for the cake, dear. Special occasion?"\n' +
          'The icing flowers are almost too pretty to eat. Almost.\n'
        );
      }
      this.broadcast(`${player.shortDesc} buys a decorated cake.`, { exclude: [player] });
      return true;
    }

    if (typeof receiver.receive === 'function') {
      receiver.receive('\nThe baker shakes her head. "I\'m afraid we don\'t have that, dear."\n');
    }
    return true;
  }

  private cmdSmell(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive(
        '\nYou close your eyes and breathe deeply. The aroma is intoxicating:\n' +
        'Fresh-baked bread, warm and yeasty...\n' +
        'Sweet honey and cinnamon from the pastries...\n' +
        'Savory meat and herbs from the pies...\n' +
        'And underlying it all, the comforting scent of woodsmoke from\n' +
        'the great oven. It smells like home.\n'
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

export default Bakery;
