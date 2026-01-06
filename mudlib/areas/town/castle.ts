/**
 * Castle Gate - The imposing entrance to the lord's castle.
 */

import { Room, MudObject } from '../../lib/std.js';

/**
 * The Castle Gate room.
 */
export class CastleGate extends Room {
  constructor() {
    super();
    this.shortDesc = '{bold}{cyan}Castle Gate{/}';
    this.longDesc = `You stand before the massive {dim}iron-bound gates{/} of the {bold}castle{/}. {cyan}Twin towers{/} flank
the entrance, their crenellated tops patrolled by watchful {magenta}guards{/} in gleaming
armor. The {dim}portcullis{/} is raised, revealing a glimpse of the cobblestone
courtyard beyond, though stern-faced {magenta}sentries{/} bar casual entry.

The castle walls stretch away to either side, ancient stones fitted together
with masterful precision. Colorful {yellow}banners{/} bearing the lord's heraldry - a
{YELLOW}golden lion{/} on a field of {blue}blue{/} - snap in the breeze from atop the towers.

A weathered {yellow}notice board{/} stands beside the gate, covered in official
proclamations and wanted posters. The town square lies to the {green}south{/}, its
distant fountain visible past the crowds of petitioners waiting to enter.`;

    this.setupRoom();
  }

  /**
   * Set up the room's exits and actions.
   */
  private setupRoom(): void {
    this.addExit('south', '/areas/town/center');
    // Could add 'enter' or 'north' to castle interior later

    this.addAction('look', this.cmdLook.bind(this));
    this.addAction('read', this.cmdRead.bind(this));
  }

  override async onCreate(): Promise<void> {
    console.log('[CastleGate] The castle gate has been initialized.');
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\nThe guards eye you warily as you approach the castle gate.\n');
    }
    this.broadcast(`${obj.shortDesc} approaches the castle gate.`, { exclude: [obj] });
  }

  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    this.broadcast(`${obj.shortDesc} departs from the castle gate.`, { exclude: [obj] });
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

    if (target === 'guards' || target === 'sentries' || target === 'guard') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe castle guards stand at rigid attention, their polished armor\n' +
          'reflecting the sunlight. Each carries a halberd and wears the lord\'s\n' +
          'livery. Their eyes follow every movement near the gate with\n' +
          'professional suspicion.\n'
        );
      }
      return true;
    }

    if (target === 'towers' || target === 'tower') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe twin gate towers rise some forty feet into the air, their gray\n' +
          'stone weathered by centuries of wind and rain. Arrow slits dot their\n' +
          'surfaces, and you can see the silhouettes of archers watching the\n' +
          'approach to the castle.\n'
        );
      }
      return true;
    }

    if (target === 'banners' || target === 'banner' || target === 'heraldry') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe lord\'s banners display a magnificent golden lion rampant on a\n' +
          'field of royal blue. The craftsmanship is exquisite, the gold thread\n' +
          'catching the light as the fabric ripples in the wind.\n'
        );
      }
      return true;
    }

    if (target === 'board' || target === 'notice' || target === 'notice board') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe notice board is cluttered with official documents:\n' +
          '- A proclamation declaring the upcoming harvest festival\n' +
          '- Several wanted posters for bandits plaguing the roads\n' +
          '- A notice seeking able-bodied adventurers for "discreet work"\n' +
          '- Tax collection schedules for the various districts\n' +
          'Try "read board" for more details.\n'
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

    if (!target || target === 'board' || target === 'notice board' || target === 'notice') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\n=== OFFICIAL PROCLAMATION ===\n' +
          'By order of Lord Aldric, the Harvest Festival shall commence on the\n' +
          'first day of autumn. All citizens are expected to participate in the\n' +
          'celebrations. Merchants may apply for festival stall permits at the\n' +
          'castle steward\'s office.\n\n' +
          '=== WANTED ===\n' +
          'The Black Wolf Gang - 50 gold pieces for information leading to their\n' +
          'capture. Last seen on the northern trade road. Approach with caution.\n\n' +
          '=== ADVENTURERS SOUGHT ===\n' +
          'Discreet individuals needed for important work. Inquire at the castle\n' +
          'steward\'s office. Generous compensation guaranteed.\n'
        );
      }
      return true;
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

export default CastleGate;
