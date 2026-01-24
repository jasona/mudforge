/**
 * Campfire - A craftable campfire that provides warmth bonus for resting.
 *
 * Campfires boost healing when sitting or sleeping near them.
 * They consume fuel over time and eventually burn out.
 */

import { Item } from './item.js';
import { Living } from './living.js';

/**
 * Default campfire fuel duration in seconds (30 minutes).
 */
export const DEFAULT_FUEL_DURATION = 1800;

/**
 * Warning threshold when fuel is running low (5 minutes).
 */
export const LOW_FUEL_WARNING = 300;

/**
 * Heartbeat interval in milliseconds.
 */
const HEARTBEAT_INTERVAL = 2000;

/**
 * A campfire that provides warmth and light.
 */
export class Campfire extends Item {
  /** Flag to identify campfire objects */
  readonly isCampfire: boolean = true;

  private _isLit: boolean = true;
  private _fuelRemaining: number = DEFAULT_FUEL_DURATION;
  private _maxFuel: number = DEFAULT_FUEL_DURATION;
  private _hasWarnedLowFuel: boolean = false;
  private _heartbeatId: number | null = null;

  constructor() {
    super();
    this.shortDesc = 'a crackling campfire';
    this.longDesc = 'A warm campfire crackles merrily, its flames dancing in the air. It provides warmth and light to those nearby.';
    this.size = 'immovable';
    this.takeable = false;
    this.dropable = false;

    // Set as light source
    this.setLightSource({
      lightRadius: 40,
      fuelRemaining: -1, // We manage fuel ourselves
      activeWhenDropped: true,
    });

    // Add actions
    this.setupActions();
  }

  /**
   * Set up campfire actions.
   */
  private setupActions(): void {
    this.addAction('extinguish', async () => this.extinguish());
    this.addAction('douse', async () => this.extinguish());
    this.addAction('light', async () => this.light());
    this.addAction('rekindle', async () => this.light());
  }

  // ========== Properties ==========

  /**
   * Check if the campfire is currently lit.
   */
  get isLit(): boolean {
    return this._isLit;
  }

  /**
   * Get remaining fuel in seconds.
   */
  get fuelRemaining(): number {
    return this._fuelRemaining;
  }

  /**
   * Get maximum fuel capacity in seconds.
   */
  get maxFuel(): number {
    return this._maxFuel;
  }

  // ========== Fuel Management ==========

  /**
   * Add fuel to the campfire.
   * @param seconds Amount of fuel to add in seconds
   */
  addFuel(seconds: number): void {
    this._fuelRemaining = Math.min(this._fuelRemaining + seconds, this._maxFuel);
    this._hasWarnedLowFuel = false;

    // Relight if extinguished
    if (!this._isLit && this._fuelRemaining > 0) {
      this._isLit = true;
      this.updateDescription();
      this.startHeartbeat();
    }
  }

  /**
   * Process fuel consumption and state changes.
   * Called every heartbeat.
   */
  private processFuel(): void {
    if (!this._isLit) return;

    // Consume fuel (2 seconds per heartbeat)
    this._fuelRemaining -= HEARTBEAT_INTERVAL / 1000;

    // Warn when fuel is low
    if (this._fuelRemaining <= LOW_FUEL_WARNING && !this._hasWarnedLowFuel) {
      this._hasWarnedLowFuel = true;
      this.broadcastToRoom('{yellow}The campfire is burning low...{/}\n');
    }

    // Burn out when fuel is depleted
    if (this._fuelRemaining <= 0) {
      this._fuelRemaining = 0;
      this.burnOut();
    }
  }

  /**
   * Called when the campfire burns out completely.
   */
  private burnOut(): void {
    this._isLit = false;
    this.stopHeartbeat();
    this.updateDescription();
    this.broadcastToRoom('{dim}The campfire flickers and dies, leaving only cold ashes.{/}\n');
  }

  /**
   * Update the campfire's description based on its state.
   */
  private updateDescription(): void {
    if (this._isLit) {
      if (this._fuelRemaining <= LOW_FUEL_WARNING) {
        this.shortDesc = 'a dying campfire';
        this.longDesc = 'A campfire burns low, its flames weak and flickering. It could use more fuel.';
      } else {
        this.shortDesc = 'a crackling campfire';
        this.longDesc = 'A warm campfire crackles merrily, its flames dancing in the air. It provides warmth and light to those nearby.';
      }
      // Update light radius
      this.setLightSource({ lightRadius: 40 });
    } else {
      this.shortDesc = 'a pile of cold ashes';
      this.longDesc = 'A pile of cold ashes marks where a campfire once burned. It could be rekindled with tinder.';
      // No light when unlit
      this.setLightSource({ lightRadius: 0 });
    }
  }

  // ========== Actions ==========

  /**
   * Extinguish the campfire.
   */
  async extinguish(): Promise<boolean> {
    const user = this.findUserInRoom();
    if (!user) return false;

    if (!this._isLit) {
      user.receive('The campfire is already out.\n');
      return false;
    }

    this._isLit = false;
    this.stopHeartbeat();
    this.updateDescription();

    user.receive('You carefully extinguish the campfire.\n');
    this.broadcastToRoom(`${this.capitalize(user.name)} extinguishes the campfire.\n`, user);
    return true;
  }

  /**
   * Light or rekindle the campfire.
   */
  async light(): Promise<boolean> {
    const user = this.findUserInRoom();
    if (!user) return false;

    if (this._isLit) {
      user.receive('The campfire is already burning.\n');
      return false;
    }

    // Check if campfire has fuel
    if (this._fuelRemaining <= 0) {
      // Look for tinder in user's inventory
      const tinder = this.findTinder(user);
      if (!tinder) {
        user.receive('You need tinder to rekindle the fire.\n');
        return false;
      }

      // Consume tinder and add some fuel
      if (typeof efuns !== 'undefined' && efuns.destruct) {
        await efuns.destruct(tinder);
      }
      this._fuelRemaining = 600; // 10 minutes from tinder alone
      user.receive('You use tinder to rekindle the fire.\n');
    }

    this._isLit = true;
    this._hasWarnedLowFuel = false;
    this.updateDescription();
    this.startHeartbeat();

    user.receive('The campfire springs to life, crackling warmly.\n');
    this.broadcastToRoom(`${this.capitalize(user.name)} lights the campfire.\n`, user);
    return true;
  }

  /**
   * Find tinder in user's inventory.
   */
  private findTinder(user: Living): Item | null {
    for (const item of user.inventory) {
      if (item instanceof Item && item.id && item.id('tinder')) {
        return item;
      }
    }
    return null;
  }

  // ========== Heartbeat ==========

  /**
   * Start the fuel consumption heartbeat.
   */
  private startHeartbeat(): void {
    if (this._heartbeatId !== null) return;
    if (typeof efuns !== 'undefined' && efuns.setHeartbeat) {
      efuns.setHeartbeat(this, true);
    }
  }

  /**
   * Stop the fuel consumption heartbeat.
   */
  private stopHeartbeat(): void {
    if (typeof efuns !== 'undefined' && efuns.setHeartbeat) {
      efuns.setHeartbeat(this, false);
    }
    this._heartbeatId = null;
  }

  /**
   * Heartbeat handler for fuel consumption.
   */
  heartbeat(): void {
    this.processFuel();
  }

  // ========== Helpers ==========

  /**
   * Find a user in the same room as this campfire.
   */
  private findUserInRoom(): Living | null {
    const room = this.environment;
    if (!room) return null;

    for (const obj of room.inventory) {
      if (obj instanceof Living) {
        return obj;
      }
    }
    return null;
  }

  /**
   * Broadcast a message to the room.
   */
  private broadcastToRoom(message: string, exclude?: Living): void {
    const room = this.environment;
    if (room && 'broadcast' in room) {
      const opts = exclude ? { exclude: [exclude] } : undefined;
      (room as { broadcast: (msg: string, opts?: { exclude?: Living[] }) => void })
        .broadcast(message, opts);
    }
  }

  /**
   * Capitalize a string.
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Override onExamine to show fuel info.
   */
  override onExamine(): string {
    let desc = this.longDesc;
    if (this._isLit) {
      const minutes = Math.ceil(this._fuelRemaining / 60);
      desc += `\n\nIt looks like it will burn for about ${minutes} more minute${minutes !== 1 ? 's' : ''}.`;
    }
    return desc;
  }

  /**
   * Called when placed in a room.
   */
  override async onMove(from: Living | null, to: Living | null): Promise<void> {
    // Start heartbeat when placed
    if (this._isLit && to) {
      this.startHeartbeat();
    }
  }
}

export default Campfire;
