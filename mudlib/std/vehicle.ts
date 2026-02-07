/**
 * Vehicle - Base class for mobile rooms like boats, airships, etc.
 *
 * Vehicles are rooms that can move between locations. Players "board" vehicles
 * and their environment becomes the vehicle. Vehicles track their world position
 * via _currentLocation (the dock/harbor room they're at).
 */

import { Room, type BroadcastOptions } from './room.js';
import { MudObject } from './object.js';
import type { Living } from './living.js';

/**
 * Vehicle type identifier.
 */
export type VehicleType = 'boat' | 'ferry' | 'airship' | 'cart' | 'ship' | string;

/**
 * Base class for vehicles.
 */
export class Vehicle extends Room {
  readonly isVehicle: boolean = true;

  /** The room where this vehicle is currently docked */
  protected _currentLocation: Room | null = null;

  /** Whether passengers can board/disembark */
  protected _docked: boolean = true;

  /** Type of vehicle (affects terrain bypass) */
  protected _vehicleType: VehicleType = 'boat';

  /** Maximum passenger capacity */
  protected _capacity: number = 10;

  /** Who controls this vehicle (for player-owned vehicles) */
  protected _captain: Living | null = null;

  constructor() {
    super();
    this.shortDesc = 'A vehicle';
    this.longDesc = 'You are aboard a vehicle.';
  }

  // ========== Properties ==========

  /**
   * Get the vehicle type.
   */
  get vehicleType(): VehicleType {
    return this._vehicleType;
  }

  /**
   * Set the vehicle type.
   */
  set vehicleType(value: VehicleType) {
    this._vehicleType = value;
  }

  /**
   * Get passenger capacity.
   */
  get capacity(): number {
    return this._capacity;
  }

  /**
   * Set passenger capacity.
   */
  set capacity(value: number) {
    this._capacity = Math.max(1, value);
  }

  /**
   * Check if the vehicle is docked.
   */
  get isDocked(): boolean {
    return this._docked;
  }

  /**
   * Get the current dock location.
   */
  get currentLocation(): Room | null {
    return this._currentLocation;
  }

  /**
   * Get the captain (controller) of this vehicle.
   */
  get captain(): Living | null {
    return this._captain;
  }

  /**
   * Set the captain (controller) of this vehicle.
   */
  set captain(value: Living | null) {
    this._captain = value;
  }

  /**
   * Get the number of passengers currently aboard.
   */
  get passengerCount(): number {
    return this.inventory.filter((obj) => {
      const living = obj as Living & { isLiving?: boolean };
      return living.isLiving === true;
    }).length;
  }

  /**
   * Check if the vehicle has room for more passengers.
   */
  get hasCapacity(): boolean {
    return this.passengerCount < this._capacity;
  }

  // ========== Docking ==========

  /**
   * Dock the vehicle at a room.
   * Adds the vehicle to the room's inventory so it's visible.
   * @param room The room to dock at
   */
  async dock(room: Room): Promise<boolean> {
    if (this._currentLocation === room && this._docked) {
      return true; // Already docked here
    }

    // Remove from previous location if any
    if (this._currentLocation) {
      await this.undock();
    }

    // Add to new location
    this._currentLocation = room;
    this._docked = true;

    // Move vehicle into the room's inventory so players can see/board it
    await this.moveTo(room);

    return true;
  }

  /**
   * Undock the vehicle from current location.
   */
  async undock(): Promise<void> {
    if (!this._docked) return;

    // Remove from room's inventory
    await this.moveTo(null);

    this._docked = false;
    // Keep _currentLocation until we dock somewhere new (for reference)
  }

  // ========== Movement ==========

  /**
   * Move the vehicle to a new destination.
   * Handles undocking, travel, and redocking with announcements.
   * @param destination The room to move to
   * @param options Movement options
   */
  async moveVehicle(
    destination: Room,
    options: {
      departureMessage?: string;
      travelMessage?: string;
      arrivalMessage?: string;
    } = {}
  ): Promise<boolean> {
    const {
      departureMessage = 'The vehicle begins to move.',
      travelMessage,
      arrivalMessage = 'The vehicle comes to a stop.',
    } = options;

    // Announce departure
    if (departureMessage) {
      this.broadcast(departureMessage);
    }

    // Undock from current location
    await this.undock();

    // Optional travel message
    if (travelMessage) {
      this.broadcast(travelMessage);
    }

    // Dock at new location
    await this.dock(destination);

    // Announce arrival
    if (arrivalMessage) {
      this.broadcast(arrivalMessage);
    }

    return true;
  }

  // ========== Passenger Management ==========

  /**
   * Board a passenger onto the vehicle.
   * @param who The living being boarding
   * @returns true if boarding succeeded
   */
  async boardPassenger(who: Living): Promise<boolean> {
    if (!this._docked) {
      const receiver = who as Living & { receive?: (msg: string) => void };
      if (receiver.receive) {
        receiver.receive("The vehicle is not docked. You can't board.\n");
      }
      return false;
    }

    if (!this.hasCapacity) {
      const receiver = who as Living & { receive?: (msg: string) => void };
      if (receiver.receive) {
        receiver.receive('The vehicle is full.\n');
      }
      return false;
    }

    // Get the room they're coming from
    const fromRoom = who.environment as Room | null;

    // Move the passenger into the vehicle
    const moved = await who.moveTo(this);
    if (!moved) {
      return false;
    }

    // Announce in the vehicle
    const name = who.name || 'Someone';
    this.broadcast(`${name} boards the ${this.shortDesc}.`, { exclude: [who] });

    // Announce in the dock room
    if (fromRoom && 'broadcast' in fromRoom) {
      (fromRoom as Room).broadcast(`${name} boards ${this.shortDesc}.`, { exclude: [who] });
    }

    return true;
  }

  /**
   * Disembark a passenger from the vehicle.
   * @param who The living being disembarking
   * @returns true if disembarking succeeded
   */
  async disembarkPassenger(who: Living): Promise<boolean> {
    if (!this._docked) {
      const receiver = who as Living & { receive?: (msg: string) => void };
      if (receiver.receive) {
        receiver.receive("The vehicle is moving. You can't disembark yet.\n");
      }
      return false;
    }

    if (!this._currentLocation) {
      const receiver = who as Living & { receive?: (msg: string) => void };
      if (receiver.receive) {
        receiver.receive("There's nowhere to disembark to.\n");
      }
      return false;
    }

    // Move the passenger to the dock
    const moved = await who.moveTo(this._currentLocation);
    if (!moved) {
      return false;
    }

    // Announce in the vehicle
    const name = who.name || 'Someone';
    this.broadcast(`${name} disembarks from the ${this.shortDesc}.`);

    // Announce in the dock room
    if ('broadcast' in this._currentLocation) {
      this._currentLocation.broadcast(`${name} disembarks from ${this.shortDesc}.`, {
        exclude: [who],
      });
    }

    return true;
  }

  // ========== Description Override ==========

  /**
   * Get the full room description including docking status.
   * @param viewer The object viewing the room
   */
  override getFullDescription(viewer?: MudObject): string {
    const baseDesc = super.getFullDescription(viewer);

    const lines: string[] = [baseDesc];

    // Add docking status
    if (this._docked && this._currentLocation) {
      lines.push('');
      lines.push(`{dim}Currently docked at: ${this._currentLocation.shortDesc}{/}`);
    } else if (!this._docked) {
      lines.push('');
      lines.push('{dim}The vehicle is currently underway.{/}');
    }

    // Add passenger count
    const count = this.passengerCount;
    if (count > 0) {
      lines.push(`{dim}Passengers: ${count}/${this._capacity}{/}`);
    }

    return lines.join('\n');
  }

  // ========== Vehicle Registration ==========

  /**
   * Called when vehicle is created.
   * Override to register with the vehicle daemon.
   */
  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Register with vehicle daemon
    try {
      const { getVehicleDaemon } = await import('../daemons/vehicle.js');
      const daemon = getVehicleDaemon();
      daemon.registerVehicle(this);
    } catch {
      // Vehicle daemon not available
    }
  }

  /**
   * Called when vehicle is destroyed.
   * Override to unregister from the vehicle daemon.
   */
  async onDestroy(): Promise<void> {
    // Unregister from vehicle daemon
    try {
      const { getVehicleDaemon } = await import('../daemons/vehicle.js');
      const daemon = getVehicleDaemon();
      daemon.unregisterVehicle(this);
    } catch {
      // Vehicle daemon not available
    }
  }
}

export default Vehicle;
