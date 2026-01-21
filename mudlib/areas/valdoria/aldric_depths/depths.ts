/**
 * The Depths - The deepest, darkest part of the dungeon.
 */

import { Room, MudObject } from '../../../lib/std.js';
import { LightLevel } from '../../../std/visibility/types.js';

/**
 * The Depths room.
 */
export class TheDepths extends Room {
  constructor() {
    super();
    this.shortDesc = '{RED}{bold}The Depths{/}';
    this.longDesc = `You have reached {RED}The Depths{/} - the lowest, most forbidden part of the
castle dungeon. The air here is ice cold and carries a {red}coppery tang{/} that
makes your throat tight. {dim}Ancient runes{/} are carved into the walls, their
meaning lost to time but their power still palpable.

This chamber is vast and circular, its walls curving away into impenetrable
darkness. A massive {cyan}iron grate{/} dominates the center of the floor, its bars
thick as a man's wrist. {RED}Darkness{/} seems to flow up from whatever lies below,
a darkness so complete it seems to drink the light from your torch.

{magenta}Strange whispers{/} echo from the shadows, speaking in a language that predates
human civilization. The very stones seem to pulse with a slow, rhythmic
energy, as if something immense and ancient breathes somewhere far below.

Those with any sense would flee back {green}south{/} to the relative safety of the
storage chamber.`;

    // Map coordinates - northernmost, deepest point (lowest Y)
    this.setMapCoordinates({ x: 0, y: 0, z: -1, area: '/areas/valdoria/aldric_depths' });
    this.setTerrain('dungeon');
    this.setMapIcon('†');

    // Pitch black - the darkness itself seems to consume light
    this.lightLevel = LightLevel.PITCH_BLACK;

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('south', '/areas/valdoria/aldric_depths/storage');

    this.addAction('look', this.cmdLook.bind(this));
    this.addAction('listen', this.cmdListen.bind(this));
  }

  override async onCreate(): Promise<void> {
    console.log('[TheDepths] The Depths have been initialized.');
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive(
        '\n{RED}A terrible chill grips you as you enter this forsaken place.{/}\n' +
          '{dim}Something stirs in the darkness below...{/}\n'
      );
    }
    this.broadcast(`${obj.shortDesc} foolishly enters The Depths.`, { exclude: [obj] });
  }

  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    this.broadcast(`${obj.shortDesc} flees back toward the light.`, { exclude: [obj] });
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

    if (target === 'runes' || target === 'carvings' || target === 'symbols') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe runes glow faintly with an inner light when you focus on\n' +
            "them. They're written in no language you recognize - not elvish,\n" +
            'not dwarvish, not any human tongue. Some seem to writhe when\n' +
            "you're not looking directly at them.\n"
        );
      }
      return true;
    }

    if (target === 'grate' || target === 'iron grate' || target === 'bars') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe iron grate covers a pit of unknown depth. The bars are\n' +
            'forged with symbols similar to those on the walls, and are\n' +
            "warm to the touch despite the chill. You cannot see the\n" +
            'bottom - only darkness, impenetrable and absolute.\n' +
            '\n{dim}Something seems to be looking back up at you.{/}\n'
        );
      }
      return true;
    }

    if (target === 'darkness' || target === 'pit' || target === 'below' || target === 'down') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nYou peer into the darkness below the grate. It is impossibly\n' +
            'deep - or perhaps the darkness itself is a physical thing,\n' +
            "filling the pit like black water. You feel a terrible urge\n" +
            "to reach down and touch it...\n" +
            '\n{RED}Something brushes against your mind, curious and hungry.{/}\n'
        );
      }
      return true;
    }

    if (target === 'walls' || target === 'chamber') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe curved walls of the chamber are unnaturally smooth, as\n' +
            "if melted rather than carved. The runes pulse in a slow\n" +
            'rhythm, like a heartbeat. You notice scratches near the\n' +
            'entrance - claw marks made by desperate fingers.\n'
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
        '\nYou strain to make out the whispers:\n' +
          '\n{dim}...coming soon...{/}\n' +
          '{dim}...the seal weakens...{/}\n' +
          '{dim}...so hungry...{/}\n' +
          '{dim}...let us out...{/}\n' +
          '\n{RED}You feel as if something immense has just noticed you.{/}\n'
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

export default TheDepths;
