/**
 * Scheduler - Manages heartbeats and delayed calls (callOut).
 *
 * Provides timing services for the MUD:
 * - Heartbeat: Regular calls to objects that register for them
 * - callOut: Delayed execution of callbacks
 */

import type { MudObject } from './types.js';

export interface SchedulerConfig {
  /** Heartbeat interval in milliseconds */
  heartbeatIntervalMs: number;
}

export interface CallOutEntry {
  /** Unique ID for this callOut */
  id: number;
  /** The callback to execute */
  callback: () => void | Promise<void>;
  /** When to execute (timestamp) */
  executeAt: number;
  /** Whether this is recurring */
  recurring: boolean;
  /** Interval for recurring calls */
  intervalMs?: number | undefined;
}

/**
 * Manages heartbeats and scheduled callbacks.
 */
export class Scheduler {
  private config: SchedulerConfig;
  private heartbeatObjects: Set<MudObject> = new Set();
  private callOuts: Map<number, CallOutEntry> = new Map();
  private nextCallOutId: number = 1;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private callOutTimer: NodeJS.Timeout | null = null;
  private running: boolean = false;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 2000,
    };
  }

  /**
   * Start the scheduler.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleHeartbeat();
    this.scheduleCallOutCheck();
  }

  /**
   * Stop the scheduler.
   */
  stop(): void {
    this.running = false;
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.callOutTimer) {
      clearTimeout(this.callOutTimer);
      this.callOutTimer = null;
    }
  }

  /**
   * Register an object for heartbeat calls.
   */
  setHeartbeat(object: MudObject, enable: boolean): void {
    if (enable) {
      this.heartbeatObjects.add(object);
    } else {
      this.heartbeatObjects.delete(object);
    }
  }

  /**
   * Check if an object has heartbeat enabled.
   */
  hasHeartbeat(object: MudObject): boolean {
    return this.heartbeatObjects.has(object);
  }

  /**
   * Schedule a delayed callback.
   * @param callback The function to call
   * @param delayMs Delay in milliseconds
   * @returns The callOut ID (can be used to cancel)
   */
  callOut(callback: () => void | Promise<void>, delayMs: number): number {
    const id = this.nextCallOutId++;
    const entry: CallOutEntry = {
      id,
      callback,
      executeAt: Date.now() + delayMs,
      recurring: false,
    };
    this.callOuts.set(id, entry);
    return id;
  }

  /**
   * Schedule a recurring callback.
   * @param callback The function to call
   * @param intervalMs Interval in milliseconds
   * @returns The callOut ID (can be used to cancel)
   */
  callOutRepeat(callback: () => void | Promise<void>, intervalMs: number): number {
    const id = this.nextCallOutId++;
    const entry: CallOutEntry = {
      id,
      callback,
      executeAt: Date.now() + intervalMs,
      recurring: true,
      intervalMs,
    };
    this.callOuts.set(id, entry);
    return id;
  }

  /**
   * Cancel a scheduled callOut.
   * @param id The callOut ID to cancel
   * @returns true if cancelled, false if not found
   */
  removeCallOut(id: number): boolean {
    return this.callOuts.delete(id);
  }

  /**
   * Get information about a callOut.
   */
  getCallOut(id: number): CallOutEntry | undefined {
    return this.callOuts.get(id);
  }

  /**
   * Get the number of registered heartbeat objects.
   */
  get heartbeatCount(): number {
    return this.heartbeatObjects.size;
  }

  /**
   * Get the number of pending callOuts.
   */
  get callOutCount(): number {
    return this.callOuts.size;
  }

  /**
   * Check if the scheduler is running.
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Schedule the next heartbeat.
   */
  private scheduleHeartbeat(): void {
    if (!this.running) return;

    this.heartbeatTimer = setTimeout(async () => {
      await this.executeHeartbeat();
      this.scheduleHeartbeat();
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Execute heartbeat for all registered objects.
   */
  private async executeHeartbeat(): Promise<void> {
    const objects = Array.from(this.heartbeatObjects);

    for (const object of objects) {
      try {
        // Call the heartbeat method if it exists
        const objWithHeartbeat = object as MudObject & {
          heartbeat?: () => void | Promise<void>;
        };
        if (typeof objWithHeartbeat.heartbeat === 'function') {
          await objWithHeartbeat.heartbeat();
        }
      } catch (error) {
        // Log error but continue with other objects
        console.error(`Heartbeat error for ${object.objectId}:`, error);
      }
    }
  }

  /**
   * Schedule the next callOut check.
   */
  private scheduleCallOutCheck(): void {
    if (!this.running) return;

    // Check every 100ms for callOuts to execute
    this.callOutTimer = setTimeout(async () => {
      await this.executeCallOuts();
      this.scheduleCallOutCheck();
    }, 100);
  }

  /**
   * Execute any callOuts that are due.
   */
  private async executeCallOuts(): Promise<void> {
    const now = Date.now();
    const toExecute: CallOutEntry[] = [];

    // Find all callOuts that are due
    for (const entry of this.callOuts.values()) {
      if (entry.executeAt <= now) {
        toExecute.push(entry);
      }
    }

    // Execute and handle recurring
    for (const entry of toExecute) {
      try {
        await entry.callback();
      } catch (error) {
        console.error(`CallOut error:`, error);
      }

      if (entry.recurring && entry.intervalMs) {
        // Reschedule recurring callOut
        entry.executeAt = now + entry.intervalMs;
      } else {
        // Remove one-time callOut
        this.callOuts.delete(entry.id);
      }
    }
  }

  /**
   * Clear all callOuts and heartbeats.
   */
  clear(): void {
    this.heartbeatObjects.clear();
    this.callOuts.clear();
  }
}

// Singleton instance
let schedulerInstance: Scheduler | null = null;

/**
 * Get the global Scheduler instance.
 */
export function getScheduler(config?: Partial<SchedulerConfig>): Scheduler {
  if (!schedulerInstance) {
    schedulerInstance = new Scheduler(config);
  }
  return schedulerInstance;
}

/**
 * Reset the global scheduler. Used for testing.
 */
export function resetScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
    schedulerInstance.clear();
  }
  schedulerInstance = null;
}
