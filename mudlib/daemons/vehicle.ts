/**
 * Vehicle Daemon - Registry and manager for all active vehicles.
 *
 * Tracks registered vehicles and provides lookup functionality.
 */

import { MudObject } from '../std/object.js';
import type { Vehicle } from '../std/vehicle.js';
import type { Room } from '../std/room.js';

/**
 * Vehicle Daemon class.
 */
export class VehicleDaemon extends MudObject {
  /** Registry of active vehicles by objectId */
  private _vehicles: Map<string, Vehicle> = new Map();

  constructor() {
    super();
    this.shortDesc = 'Vehicle Daemon';
    this.longDesc = 'The vehicle daemon manages all active vehicles in the game.';
  }

  /**
   * Register a vehicle with the daemon.
   * @param vehicle The vehicle to register
   */
  registerVehicle(vehicle: Vehicle): void {
    if (vehicle.objectId) {
      this._vehicles.set(vehicle.objectId, vehicle);
    }
  }

  /**
   * Unregister a vehicle from the daemon.
   * @param vehicle The vehicle to unregister
   */
  unregisterVehicle(vehicle: Vehicle): void {
    if (vehicle.objectId) {
      this._vehicles.delete(vehicle.objectId);
    }
  }

  /**
   * Find a vehicle by name (partial match).
   * @param name The name to search for
   * @returns The first matching vehicle, or null
   */
  findVehicleByName(name: string): Vehicle | null {
    const lowerName = name.toLowerCase();

    for (const vehicle of this._vehicles.values()) {
      // Check if the vehicle matches the name
      if (vehicle.id(lowerName)) {
        return vehicle;
      }
    }

    return null;
  }

  /**
   * Get all vehicles at a specific location.
   * @param room The room to check
   * @returns Array of vehicles docked at that room
   */
  getVehiclesAtLocation(room: Room): Vehicle[] {
    const result: Vehicle[] = [];

    for (const vehicle of this._vehicles.values()) {
      if (vehicle.currentLocation === room && vehicle.isDocked) {
        result.push(vehicle);
      }
    }

    return result;
  }

  /**
   * Get all registered vehicles.
   * @returns Array of all vehicles
   */
  getAllVehicles(): Vehicle[] {
    return Array.from(this._vehicles.values());
  }

  /**
   * Get all vehicles of a specific type.
   * @param type The vehicle type to filter by
   * @returns Array of matching vehicles
   */
  getVehiclesByType(type: string): Vehicle[] {
    return Array.from(this._vehicles.values()).filter(
      (vehicle) => vehicle.vehicleType === type
    );
  }

  /**
   * Get the count of registered vehicles.
   */
  get vehicleCount(): number {
    return this._vehicles.size;
  }
}

// Singleton instance
let _instance: VehicleDaemon | null = null;

/**
 * Get the vehicle daemon singleton instance.
 */
export function getVehicleDaemon(): VehicleDaemon {
  if (!_instance) {
    _instance = new VehicleDaemon();
  }
  return _instance;
}

export default VehicleDaemon;
