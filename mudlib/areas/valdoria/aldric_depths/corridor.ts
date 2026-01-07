/**
 * Dungeon Corridor - A dark passageway in the castle dungeons.
 */

import { Room, MudObject } from '../../../lib/std.js';

/**
 * The Dungeon Corridor room.
 */
export class DungeonCorridor extends Room {
  constructor() {
    super();
    this.shortDesc = '{dim}Dark Corridor{/}';
    this.longDesc = `A long, {dim}narrow corridor{/} stretches into the gloom, its walls slick with
moisture and coated in patches of {green}sickly mold{/}. The ceiling is low enough
that tall folk must duck in places where the stones have shifted over the
centuries.

Weak {yellow}torchlight{/} illuminates the passage at irregular intervals, casting
long shadows that seem to move on their own. The floor is littered with
debris - bits of crumbled stone, old bones, and the occasional rusted {red}chain{/}.

To the {green}north{/}, you can make out what appears to be {cyan}iron bars{/} - perhaps
a cellblock. {green}South{/} leads back toward the entrance. A side passage opens
to the {green}east{/}.`;

    // Map coordinates - north of entrance (lower Y)
    this.setMapCoordinates({ x: 0, y: 3, z: -1, area: '/areas/valdoria/aldric_depths' });
    this.setTerrain('dungeon');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('south', '/areas/valdoria/aldric_depths/entrance');
    this.addExit('north', '/areas/valdoria/aldric_depths/cellblock');
    this.addExit('east', '/areas/valdoria/aldric_depths/guard_room');

    this.addAction('look', this.cmdLook.bind(this));
    this.addAction('listen', this.cmdListen.bind(this));
  }

  override async onCreate(): Promise<void> {
    console.log('[DungeonCorridor] The dungeon corridor has been initialized.');
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\nYour footsteps echo eerily in the confined space.\n');
    }
    this.broadcast(`${obj.shortDesc} emerges from the shadows.`, { exclude: [obj] });
  }

  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    this.broadcast(`${obj.shortDesc} disappears into the darkness.`, { exclude: [obj] });
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

    if (target === 'mold' || target === 'patches') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe mold grows in thick patches along the walls, its color an\n' +
            "unhealthy greenish-black. It's wet to the touch and has a faintly\n" +
            "sweet, rotting smell. You probably shouldn't breathe too deeply.\n"
        );
      }
      return true;
    }

    if (target === 'chains' || target === 'chain') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nRusted chains lie scattered about, their links corroded but still\n' +
            "heavy. Some are attached to rings set into the walls - prisoners\n" +
            'were once shackled here as they were led to their cells.\n'
        );
      }
      return true;
    }

    if (target === 'bones' || target === 'bone') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nBleached bones are scattered among the debris. Most look like they\n' +
            "came from rats or other small creatures, but a few are disturbingly\n" +
            'larger. You prefer not to think about their origin.\n'
        );
      }
      return true;
    }

    if (target === 'debris') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe floor is covered with centuries of accumulated debris:\n' +
            'crumbled mortar, bits of rotted wood, old bones, rusted metal,\n' +
            'and unidentifiable organic matter. Walking quietly is impossible.\n'
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

  private cmdListen(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive(
        '\nYou strain your ears in the oppressive silence:\n' +
          'The steady drip of water echoing from somewhere ahead...\n' +
          'The skittering of tiny claws in the darkness...\n' +
          'Your own heartbeat, loud in your ears...\n' +
          'And perhaps... was that a moan from the cellblock?\n'
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

export default DungeonCorridor;
