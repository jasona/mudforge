/**
 * Bank of Aldric - A sturdy financial institution where adventurers can safely store their gold.
 *
 * Players can deposit and withdraw gold here. Banked gold is safe from death.
 */

import { Room, MudObject } from '../../../lib/std.js';

/**
 * Player interface for banking operations.
 */
interface BankablePlayer extends MudObject {
  gold: number;
  bankedGold: number;
  depositGold(amount: number | 'all'): number;
  withdrawGold(amount: number | 'all'): number;
  receive?(msg: string): void;
}

/**
 * The Bank of Aldric room.
 */
export class BankOfAldric extends Room {
  constructor() {
    super();
    this.shortDesc = '{yellow}Bank of Aldric{/}';
    this.longDesc = `You stand in the {bold}Bank of Aldric{/}, a sturdy stone building with thick walls
and iron-barred windows. The interior is surprisingly elegant - polished {cyan}marble
floors{/} gleam beneath a {yellow}crystal chandelier{/}, and rich {red}velvet curtains{/} frame
the windows.

A long {yellow}wooden counter{/} separates the public area from the vault, behind which
stands a prim {magenta}bank teller{/} in formal attire. Massive {dim}iron doors{/} lead to
the vault chamber deeper in the building, though they remain firmly shut.

{yellow}Paintings{/} of past bank founders line the walls, their stern gazes watching
over every transaction. A {cyan}brass plaque{/} on the wall lists the bank's services.

The exit leads {green}northwest{/} back to the town center.`;

    // Map coordinates - southeast of center
    this.setMapCoordinates({ x: 1, y: 1, z: 0, area: '/areas/valdoria/aldric' });
    this.setTerrain('town');
    this.setMapIcon('$');

    this.setupRoom();
  }

  /**
   * Set up the room's exits and actions.
   */
  private setupRoom(): void {
    this.addExit('northwest', '/areas/valdoria/aldric/center');

    // Bank commands
    this.addAction('deposit', this.cmdDeposit.bind(this));
    this.addAction('withdraw', this.cmdWithdraw.bind(this));
    this.addAction('balance', this.cmdBalance.bind(this));

    // Look actions
    this.addAction('look', this.cmdLook.bind(this));
  }

  /**
   * Called when the room is created.
   */
  override async onCreate(): Promise<void> {
    console.log('[BankOfAldric] The bank has opened for business.');
  }

  /**
   * Called when someone enters the bank.
   */
  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\nThe teller looks up and nods politely at your arrival.\n');
    }
    this.broadcast(`${obj.shortDesc} enters the bank.`, { exclude: [obj] });
  }

  /**
   * Called when someone leaves the bank.
   */
  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    this.broadcast(`${obj.shortDesc} leaves the bank.`, { exclude: [obj] });
  }

  /**
   * Deposit gold into the bank.
   */
  private cmdDeposit(args: string): boolean {
    const player = this.findPlayerInRoom() as BankablePlayer | undefined;
    if (!player) return false;

    if (!args) {
      player.receive?.('\n{dim}Usage: deposit <amount> or deposit all{/}\n');
      return true;
    }

    const arg = args.toLowerCase().trim();
    let amount: number | 'all';

    if (arg === 'all') {
      amount = 'all';
    } else {
      amount = parseInt(arg, 10);
      if (isNaN(amount) || amount <= 0) {
        player.receive?.('\n{red}Please specify a valid amount to deposit.{/}\n');
        return true;
      }
    }

    const deposited = player.depositGold(amount);

    if (deposited === -1) {
      player.receive?.('\n{red}You don\'t have that much gold to deposit.{/}\n');
      return true;
    }

    if (deposited === 0) {
      player.receive?.('\n{red}You don\'t have any gold to deposit.{/}\n');
      return true;
    }

    player.receive?.(`\n{yellow}The teller counts your coins and deposits ${deposited} gold into your account.{/}\n`);
    player.receive?.(`{dim}Your account balance is now ${player.bankedGold} gold.{/}\n`);

    this.broadcast(`${player.shortDesc} makes a deposit at the bank.`, { exclude: [player] });
    return true;
  }

  /**
   * Withdraw gold from the bank.
   */
  private cmdWithdraw(args: string): boolean {
    const player = this.findPlayerInRoom() as BankablePlayer | undefined;
    if (!player) return false;

    if (!args) {
      player.receive?.('\n{dim}Usage: withdraw <amount> or withdraw all{/}\n');
      return true;
    }

    const arg = args.toLowerCase().trim();
    let amount: number | 'all';

    if (arg === 'all') {
      amount = 'all';
    } else {
      amount = parseInt(arg, 10);
      if (isNaN(amount) || amount <= 0) {
        player.receive?.('\n{red}Please specify a valid amount to withdraw.{/}\n');
        return true;
      }
    }

    const withdrawn = player.withdrawGold(amount);

    if (withdrawn === -1) {
      player.receive?.('\n{red}You don\'t have that much gold in your account.{/}\n');
      return true;
    }

    if (withdrawn === 0) {
      player.receive?.('\n{red}Your account is empty.{/}\n');
      return true;
    }

    player.receive?.(`\n{yellow}The teller counts out ${withdrawn} gold coins and slides them across the counter.{/}\n`);
    player.receive?.(`{dim}Your account balance is now ${player.bankedGold} gold.{/}\n`);

    this.broadcast(`${player.shortDesc} makes a withdrawal at the bank.`, { exclude: [player] });
    return true;
  }

  /**
   * Check bank balance.
   */
  private cmdBalance(args: string): boolean {
    const player = this.findPlayerInRoom() as BankablePlayer | undefined;
    if (!player) return false;

    player.receive?.('\n{cyan}═══════════════════════════════════════{/}\n');
    player.receive?.('           {bold}BANK OF ALDRIC{/}\n');
    player.receive?.('{cyan}═══════════════════════════════════════{/}\n');
    player.receive?.('\n');
    player.receive?.(`  {bold}Account Holder:{/}  ${player.shortDesc}\n`);
    player.receive?.(`  {bold}Account Balance:{/} {yellow}${player.bankedGold}{/} gold\n`);
    player.receive?.(`  {bold}Gold on Hand:{/}    {yellow}${player.gold}{/} gold\n`);
    player.receive?.('\n');
    player.receive?.('{cyan}═══════════════════════════════════════{/}\n');

    return true;
  }

  /**
   * Look at things in the bank.
   */
  private cmdLook(args: string): boolean {
    const player = this.findPlayerInRoom();
    if (!player) return false;

    if (!args) {
      this.look(player);
      return true;
    }

    const target = args.toLowerCase();
    const receiver = player as MudObject & { receive?: (msg: string) => void };

    if (target === 'teller' || target === 'bank teller' || target === 'clerk') {
      receiver.receive?.(
        '\nThe bank teller is a stern-looking individual in a crisp uniform.\n' +
        'They regard you with professional detachment, ready to assist with\n' +
        'any deposits or withdrawals you might need to make.\n'
      );
      return true;
    }

    if (target === 'counter' || target === 'wooden counter') {
      receiver.receive?.(
        '\nThe polished wooden counter is worn smooth by years of use. Small\n' +
        'brass scales sit ready for weighing coins, and a locked cash box\n' +
        'waits to receive deposits.\n'
      );
      return true;
    }

    if (target === 'vault' || target === 'doors' || target === 'iron doors') {
      receiver.receive?.(
        '\nThe massive iron vault doors are nearly a foot thick and covered\n' +
        'in complex locks and magical wards. Whatever lies beyond is clearly\n' +
        'very well protected.\n'
      );
      return true;
    }

    if (target === 'plaque' || target === 'brass plaque' || target === 'services') {
      receiver.receive?.(
        '\n{cyan}╔═══════════════════════════════════════╗{/}\n' +
        '{cyan}║{/}      {bold}BANK OF ALDRIC SERVICES{/}        {cyan}║{/}\n' +
        '{cyan}╠═══════════════════════════════════════╣{/}\n' +
        '{cyan}║{/}                                       {cyan}║{/}\n' +
        '{cyan}║{/}  {yellow}deposit <amount>{/}  - Store gold     {cyan}║{/}\n' +
        '{cyan}║{/}  {yellow}withdraw <amount>{/} - Retrieve gold  {cyan}║{/}\n' +
        '{cyan}║{/}  {yellow}balance{/}          - Check account   {cyan}║{/}\n' +
        '{cyan}║{/}                                       {cyan}║{/}\n' +
        '{cyan}║{/}  {dim}Banked gold is protected from{/}       {cyan}║{/}\n' +
        '{cyan}║{/}  {dim}loss upon death.{/}                    {cyan}║{/}\n' +
        '{cyan}║{/}                                       {cyan}║{/}\n' +
        '{cyan}╚═══════════════════════════════════════╝{/}\n'
      );
      return true;
    }

    if (target === 'chandelier' || target === 'crystal chandelier') {
      receiver.receive?.(
        '\nThe crystal chandelier sparkles brilliantly, its many facets\n' +
        'catching and scattering light throughout the room. It must be\n' +
        'worth a small fortune itself.\n'
      );
      return true;
    }

    if (target === 'paintings' || target === 'founders') {
      receiver.receive?.(
        '\nPortraits of past bank founders hang on the walls. Each one seems\n' +
        'more stern and wealthy-looking than the last. They all share a\n' +
        'certain calculating look in their eyes.\n'
      );
      return true;
    }

    // Check inventory for other objects
    for (const obj of this.inventory) {
      if (obj.id(target)) {
        receiver.receive?.(`\n${obj.longDesc}\n`);
        return true;
      }
    }

    receiver.receive?.("\nYou don't see that here.\n");
    return true;
  }

  /**
   * Find a player in the room.
   */
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

export default BankOfAldric;
