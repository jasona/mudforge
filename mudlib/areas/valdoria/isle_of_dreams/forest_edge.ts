/**
 * Isle of Dreams - Forest Edge
 * The entrance to the ethereal forest.
 */

import { Room, MudObject } from '../../../lib/std.js';

/**
 * The Forest Edge room on the Isle of Dreams.
 */
export class ForestEdge extends Room {
  constructor() {
    super();
    this.shortDesc = '{bold}{green}Ethereal Forest Edge{/}';
    this.longDesc = `You stand at the edge of a forest unlike any you've seen in the waking world.
The trees here are made of {yellow}gold{/} and {cyan}silver{/}, their metallic leaves
chiming softly in a breeze you cannot feel. Their trunks twist in impossible
spirals, reaching toward a sky that shifts between {magenta}purple{/}, {cyan}blue{/}, and
{yellow}amber{/} without any apparent pattern.

{magenta}Fireflies{/} - or perhaps something else entirely - drift between the branches,
leaving trails of sparkling light in their wake. The white stone path from
the dock continues into the forest depths, but branches lead in other
directions as well.

To the {green}south{/} lies the {cyan}dock{/} where the ferry arrives. The path continues
{green}north{/} deeper into the forest.

The ground beneath your feet seems to pulse with a subtle warmth, as if
the island itself is alive and breathing.`;

    this.setMapCoordinates({ x: 0, y: -1, z: 0, area: '/areas/valdoria/isle_of_dreams' });
    this.setTerrain('forest');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('south', '/areas/valdoria/isle_of_dreams/dock');
    // More exits could be added later as the area expands

    this.addAction('look', this.cmdLook.bind(this));
    this.addAction('listen', this.cmdListen.bind(this));
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();
    console.log('[ForestEdge] The ethereal forest edge has been initialized.');
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\n{dim}The metallic leaves chime a greeting as you enter...{/}\n');
    }
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

    if (target === 'trees' || target === 'gold' || target === 'silver') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe trees appear to be made of actual precious metals, yet they\n' +
          'sway and move as if alive. When you look closely at the bark,\n' +
          'you can see it shift and reform, as if the trees are constantly\n' +
          'dreaming themselves into new shapes.\n'
        );
      }
      return true;
    }

    if (target === 'fireflies' || target === 'lights' || target === 'sparks') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nAs you watch the floating lights, you realize they\'re not insects\n' +
          'at all. They\'re tiny fragments of thought and memory, drifting\n' +
          'free from dreamers somewhere in the waking world. If you focused\n' +
          'hard enough, you might be able to catch a glimpse of someone\'s dream...\n'
        );
      }
      return true;
    }

    if (target === 'sky') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe sky here obeys no natural law. Colors shift and blend like\n' +
          'watercolors dropped in water. There are stars visible, even though\n' +
          'it seems to be day - or is it night? The more you try to pin down\n' +
          'what you\'re seeing, the more uncertain you become.\n'
        );
      }
      return true;
    }

    if (target === 'ground' || target === 'path') {
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\nThe white stone path pulses gently with inner light, guiding\n' +
          'travelers through the dreamscape. The grass beside it is an\n' +
          'impossible shade of blue, and when you step on it, it makes\n' +
          'a sound like distant music.\n'
        );
      }
      return true;
    }

    if (typeof receiver.receive === 'function') {
      receiver.receive("\nYou gaze into the shifting dreamscape but find no such thing.\n");
    }
    return true;
  }

  private cmdListen(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive(
        '\n{dim}You close your eyes and listen...{/}\n\n' +
        'The metallic leaves chime in complex harmonies.\n' +
        'Distant voices seem to whisper just beyond understanding.\n' +
        'Somewhere, someone is singing a lullaby in a language\n' +
        'you\'ve never heard, yet somehow understand.\n' +
        '\n{magenta}"Dreams are doorways,"{/} whispers a voice that might be the wind.\n'
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

export default ForestEdge;
