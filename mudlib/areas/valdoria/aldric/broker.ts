/**
 * Grimjaw - The mercenary broker at The Rusty Blade.
 *
 * Players can talk to Grimjaw to hire mercenaries.
 */

import { NPC } from '../../../std/npc.js';
import { MudObject } from '../../../std/object.js';
import { openMercenaryModal } from '../../../lib/mercenary-modal.js';
import type { GUIClientMessage } from '../../../lib/gui-types.js';

interface Player extends MudObject {
  name: string;
  gold: number;
  level: number;
  objectId: string;
  receive(message: string): void;
  removeGold(amount: number): boolean;
  onGUIResponse?: (msg: GUIClientMessage) => Promise<void>;
}

/**
 * The Mercenary Broker NPC.
 */
export class Broker extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'Grimjaw',
      shortDesc: 'Grimjaw the mercenary broker',
      longDesc: `A broad-shouldered man with a face that looks like it's been used as a
punching bag more than once. Deep scars crisscross his bald head, and his
nose has been broken so many times it's nearly flat. Despite his fearsome
appearance, his eyes are sharp and calculating - the eyes of a businessman.

He wears a stained leather apron over a chain shirt, and keeps a heavy
cudgel within easy reach. A thick ledger sits open on the counter before
him, filled with contracts and accounts.

{dim}Try: 'hire', 'talk grimjaw', or 'shop'{/}`,
      gender: 'male',
      level: 25,
    });

    // Grimjaw doesn't fight - he's neutral
    this.setBehavior({
      mode: 'defensive',
      role: 'generic',
    });

    this.setupActions();
  }

  private setupActions(): void {
    // Responses to various commands
    this.addAction('hire', this.cmdHire.bind(this));
    this.addAction('shop', this.cmdHire.bind(this));
    this.addAction('mercenary', this.cmdHire.bind(this));
    this.addAction('mercs', this.cmdHire.bind(this));
    this.addAction('talk', this.cmdTalk.bind(this));
    this.addAction('ask', this.cmdTalk.bind(this));
    this.addAction('list', this.cmdList.bind(this));
  }

  private cmdHire(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    // Open the mercenary hiring modal
    openMercenaryModal(player as unknown as Player, 'Grimjaw\'s Mercenaries');
    return true;
  }

  private cmdList(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const receiver = player as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive(
        '\n{bold}Grimjaw grunts and gestures at the mercenaries lounging about.{/}\n\n' +
        '"Got four types of sellswords for ye:"\n\n' +
        '  {red}Fighters{/} - Tank types. They\'ll draw the enemy\'s attention\n' +
        '           and protect your hide. Good with sword and shield.\n\n' +
        '  {magenta}Mages{/}    - Arcane blasters. They stand back and rain fire\n' +
        '           on your enemies. Fragile but deadly.\n\n' +
        '  {green}Thieves{/}  - Sneaky bastards. They strike from the shadows\n' +
        '           and poison their blades. Quick and dirty.\n\n' +
        '  {yellow}Clerics{/}  - Holy healers. They\'ll keep you alive and bless\n' +
        '           your weapons. Worth their weight in gold.\n\n' +
        '{dim}"Say \'hire\' when you\'re ready to do business."{/}\n'
      );
    }
    return true;
  }

  private cmdTalk(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    const target = args?.toLowerCase() || '';

    // Check if talking to this NPC
    if (!target || target === 'grimjaw' || target === 'broker' || target === 'man') {
      const receiver = player as MudObject & { receive?: (msg: string) => void };
      if (typeof receiver.receive === 'function') {
        receiver.receive(
          '\n{bold}Grimjaw looks you up and down with a practiced eye.{/}\n\n' +
          '"Lookin\' for some muscle, are ye? I run a clean operation here.\n' +
          'My sellswords are professional - they fight for coin, not glory.\n' +
          'They\'ll follow your orders and watch your back."\n\n' +
          '{dim}He taps a thick ledger on the counter.{/}\n\n' +
          '"Cost depends on how skilled ye want \'em. A green recruit\'s cheap,\n' +
          'but a veteran\'ll cost ye. Higher level mercs know more tricks."\n\n' +
          '"Say {cyan}\'hire\'{/} to see what\'s available, or {cyan}\'list\'{/} for details."\n'
        );
      }
      return true;
    }

    return false;
  }

  private findPlayerInRoom(): MudObject | undefined {
    const room = this.environment;
    if (!room) return undefined;

    for (const obj of room.inventory) {
      const player = obj as MudObject & { isConnected?: () => boolean };
      if (typeof player.isConnected === 'function' && player.isConnected()) {
        return obj;
      }
    }
    return undefined;
  }

  /**
   * React when a player enters the room.
   */
  override async onRoomEnter(who: MudObject): Promise<void> {
    // Greet players who enter
    const isPlayer = 'isConnected' in who && typeof (who as { isConnected: () => boolean }).isConnected === 'function';
    if (isPlayer) {
      const room = this.environment;
      if (room && 'broadcast' in room) {
        // Small delay for immersion
        setTimeout(() => {
          const broadcast = (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void }).broadcast.bind(room);
          broadcast('{dim}Grimjaw nods curtly in acknowledgment.{/}');
        }, 500);
      }
    }
  }
}

export default Broker;
