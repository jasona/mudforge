/**
 * Ferry - Automated vehicle that follows a scheduled route.
 *
 * Ferries move between stops on a timed schedule, announcing warnings
 * before departure and arrival messages at each stop.
 */

import { Vehicle } from './vehicle.js';
import { Room } from './room.js';

/**
 * A stop on the ferry route.
 */
export interface FerryStop {
  /** Path to the room where this stop is */
  roomPath: string;
  /** Display name for announcements (e.g., "Valdoria Harbor") */
  name: string;
}

/**
 * Ferry schedule configuration.
 */
export interface FerrySchedule {
  /** Time spent traveling between stops (milliseconds) */
  travelTime: number;
  /** Time spent docked at each stop (milliseconds) */
  dockTime: number;
  /** Warning times before departure (milliseconds before departure) */
  warningTimes: number[];
}

/**
 * Ferry state machine states.
 */
export type FerryState = 'docked' | 'departing' | 'traveling' | 'arriving';

/**
 * Default ferry messages.
 */
const DEFAULT_MESSAGES = {
  warnings: [
    { time: 300000, message: 'The ferry will depart in 5 minutes.' },
    { time: 60000, message: 'The ferry will depart in 1 minute.' },
    { time: 10000, message: '{yellow}The ferry is departing in 10 seconds!{/}' },
  ],
  departing: [
    'The ferry lurches as it pulls away from the dock.',
    'You feel the vessel begin to move.',
  ],
  traveling: [
    'The ferry rocks gently as it crosses the water.',
    'Seagulls circle overhead as you travel.',
    'Waves lap against the hull.',
    'The horizon stretches endlessly before you.',
  ],
  arriving: [
    'The ferry slows as land comes into view.',
  ],
  arrived: 'The ferry has arrived at {stopName}. You may now disembark.',
};

/**
 * Automated ferry that follows a scheduled route.
 */
export class Ferry extends Vehicle {
  /** The route this ferry follows */
  protected _route: FerryStop[] = [];

  /** Current stop index */
  protected _currentStopIndex: number = 0;

  /** Direction of travel (forward or backward through route) */
  protected _direction: 'forward' | 'backward' = 'forward';

  /** Current ferry state */
  protected _state: FerryState = 'docked';

  /** Time spent traveling between stops */
  protected _travelTime: number = 120000; // 2 minutes

  /** Time spent docked at each stop */
  protected _dockTime: number = 300000; // 5 minutes

  /** Warning times before departure (ms before departure) */
  protected _warningTimes: number[] = [300000, 60000, 10000]; // 5m, 1m, 10s

  /** Current timer ID for scheduled events */
  protected _timerId: number | null = null;

  /** Track which warnings have been sent this dock cycle */
  protected _warningSentFlags: boolean[] = [];

  /** Ambient message timer */
  protected _ambientTimerId: number | null = null;

  /** Watchdog timer to detect and recover from stalled schedules */
  protected _watchdogTimerId: number | null = null;

  /** Timestamp of last state change (for watchdog) */
  protected _lastStateChangeTime: number = 0;

  constructor() {
    super();
    this._vehicleType = 'ferry';
    this.shortDesc = 'a ferry';
    this.longDesc = 'You are aboard a sturdy ferry designed for passenger transport.';
  }

  // ========== Route Configuration ==========

  /**
   * Set the ferry route.
   * @param stops Array of ferry stops
   */
  setRoute(stops: FerryStop[]): void {
    if (stops.length < 2) {
      throw new Error('Ferry route must have at least 2 stops');
    }
    this._route = [...stops];
  }

  /**
   * Get the ferry route.
   */
  getRoute(): FerryStop[] {
    return [...this._route];
  }

  /**
   * Set the ferry schedule.
   * @param schedule Schedule configuration
   */
  setSchedule(schedule: Partial<FerrySchedule>): void {
    if (schedule.travelTime !== undefined) {
      this._travelTime = Math.max(1000, schedule.travelTime);
    }
    if (schedule.dockTime !== undefined) {
      this._dockTime = Math.max(1000, schedule.dockTime);
    }
    if (schedule.warningTimes !== undefined) {
      // Sort in descending order (largest first)
      this._warningTimes = [...schedule.warningTimes].sort((a, b) => b - a);
    }
  }

  // ========== State Access ==========

  /**
   * Get the current ferry state.
   */
  get state(): FerryState {
    return this._state;
  }

  /**
   * Get the current stop.
   */
  getCurrentStop(): FerryStop | null {
    if (this._route.length === 0) return null;
    return this._route[this._currentStopIndex];
  }

  /**
   * Get the next stop.
   */
  getNextStop(): FerryStop | null {
    if (this._route.length === 0) return null;
    const nextIndex = this.getNextStopIndex();
    return this._route[nextIndex];
  }

  /**
   * Calculate the next stop index based on direction.
   */
  private getNextStopIndex(): number {
    if (this._direction === 'forward') {
      if (this._currentStopIndex >= this._route.length - 1) {
        // At end, will reverse
        return this._currentStopIndex - 1;
      }
      return this._currentStopIndex + 1;
    } else {
      if (this._currentStopIndex <= 0) {
        // At start, will reverse
        return 1;
      }
      return this._currentStopIndex - 1;
    }
  }

  // ========== Schedule Control ==========

  /**
   * Start the ferry schedule.
   * The ferry should already be docked at its first stop.
   */
  async startSchedule(): Promise<void> {
    if (this._route.length < 2) {
      console.error('[Ferry] Cannot start schedule: route not configured');
      return;
    }

    // Dock at first stop if not already docked
    if (!this._currentLocation) {
      const firstStop = this._route[0];
      const room = await this.loadRoom(firstStop.roomPath);
      if (room) {
        await this.dock(room);
        this._currentStopIndex = 0;
      }
    }

    this._state = 'docked';
    this._lastStateChangeTime = Date.now();
    this.scheduleNext();

    // Start watchdog to detect and recover from stalled schedules
    this.startWatchdog();
  }

  /**
   * Stop the ferry schedule.
   */
  stopSchedule(): void {
    if (this._timerId !== null && typeof efuns !== 'undefined') {
      efuns.removeCallOut(this._timerId);
      this._timerId = null;
    }
    if (this._ambientTimerId !== null && typeof efuns !== 'undefined') {
      efuns.removeCallOut(this._ambientTimerId);
      this._ambientTimerId = null;
    }
    if (this._watchdogTimerId !== null && typeof efuns !== 'undefined') {
      efuns.removeCallOut(this._watchdogTimerId);
      this._watchdogTimerId = null;
    }
  }

  /**
   * Schedule the next state transition.
   */
  private scheduleNext(): void {
    if (typeof efuns === 'undefined' || !efuns.callOut) return;

    // Track state changes for watchdog
    this._lastStateChangeTime = Date.now();

    switch (this._state) {
      case 'docked':
        this.scheduleDeparture();
        break;
      case 'departing':
        this.handleDeparting();
        break;
      case 'traveling':
        this.scheduleArrival();
        break;
      case 'arriving':
        this.handleArriving().catch((error) => {
          console.error('[Ferry] Unhandled error in handleArriving:', error);
        });
        break;
    }
  }

  /**
   * Schedule departure warnings and actual departure.
   */
  private scheduleDeparture(): void {
    // Reset warning flags
    this._warningSentFlags = this._warningTimes.map(() => false);

    // Start the warning/departure cycle
    this.checkAndSendWarnings();
  }

  /**
   * Check time and send appropriate warnings, or depart if time.
   */
  private checkAndSendWarnings(): void {
    if (typeof efuns === 'undefined' || !efuns.callOut) return;

    // Calculate time until departure
    const timeRemaining = this._dockTime;

    // Find next action (warning or departure)
    let nextActionTime = timeRemaining; // Default: depart
    let nextWarningIndex = -1;

    for (let i = 0; i < this._warningTimes.length; i++) {
      if (!this._warningSentFlags[i] && this._warningTimes[i] <= timeRemaining) {
        // This warning should fire
        nextWarningIndex = i;
        nextActionTime = timeRemaining - this._warningTimes[i];
        break;
      }
    }

    if (nextWarningIndex >= 0) {
      // Schedule warning
      this._timerId = efuns.callOut(() => {
        this.sendWarning(nextWarningIndex);
        this._warningSentFlags[nextWarningIndex] = true;

        // Continue checking for more warnings/departure
        // Calculate remaining dock time
        const elapsed = this._dockTime - this._warningTimes[nextWarningIndex];
        this.scheduleRemainingDockTime(this._warningTimes[nextWarningIndex]);
      }, nextActionTime);
    } else {
      // Schedule departure
      this._timerId = efuns.callOut(() => {
        this._state = 'departing';
        this.scheduleNext();
      }, timeRemaining);
    }
  }

  /**
   * Schedule remaining dock time after a warning.
   */
  private scheduleRemainingDockTime(remainingTime: number): void {
    if (typeof efuns === 'undefined' || !efuns.callOut) return;

    // Find next warning or departure
    let nextActionTime = remainingTime;
    let nextWarningIndex = -1;

    for (let i = 0; i < this._warningTimes.length; i++) {
      if (!this._warningSentFlags[i] && this._warningTimes[i] < remainingTime) {
        nextWarningIndex = i;
        nextActionTime = remainingTime - this._warningTimes[i];
        break;
      }
    }

    if (nextWarningIndex >= 0) {
      this._timerId = efuns.callOut(() => {
        this.sendWarning(nextWarningIndex);
        this._warningSentFlags[nextWarningIndex] = true;
        this.scheduleRemainingDockTime(this._warningTimes[nextWarningIndex]);
      }, nextActionTime);
    } else {
      // Schedule departure
      this._timerId = efuns.callOut(() => {
        this._state = 'departing';
        this.scheduleNext();
      }, remainingTime);
    }
  }

  /**
   * Send a departure warning.
   */
  private sendWarning(index: number): void {
    const warningTime = this._warningTimes[index];
    const defaultWarning = DEFAULT_MESSAGES.warnings.find((w) => w.time === warningTime);
    const message = defaultWarning?.message || `The ferry will depart soon.`;
    this.broadcast(`{yellow}${message}{/}\n`);
  }

  /**
   * Handle the departing state - undock and start travel.
   */
  private handleDeparting(): void {
    if (typeof efuns === 'undefined' || !efuns.callOut) return;

    // Send departure message
    try {
      const departMsg =
        DEFAULT_MESSAGES.departing[Math.floor(Math.random() * DEFAULT_MESSAGES.departing.length)];
      this.broadcast(`${departMsg}\n`);
    } catch (error) {
      console.error('[Ferry] Error broadcasting departure message:', error);
    }

    // Undock
    this.undock().then(() => {
      this._state = 'traveling';

      // Start ambient messages during travel
      this.scheduleAmbientMessage();

      // Schedule arrival
      this.scheduleNext();
    }).catch((error) => {
      console.error('[Ferry] Error during undock, forcing travel state:', error);
      this._state = 'traveling';
      this.scheduleAmbientMessage();
      this.scheduleNext();
    });
  }

  /**
   * Schedule arrival at the next stop.
   */
  private scheduleArrival(): void {
    if (typeof efuns === 'undefined' || !efuns.callOut) return;

    this._timerId = efuns.callOut(() => {
      this._state = 'arriving';
      this.scheduleNext();
    }, this._travelTime);
  }

  /**
   * Schedule ambient messages during travel.
   */
  private scheduleAmbientMessage(): void {
    if (typeof efuns === 'undefined' || !efuns.callOut) return;
    if (this._state !== 'traveling') return;

    // Schedule ambient message every 20-40 seconds during travel
    const delay = 20000 + Math.floor(Math.random() * 20000);

    this._ambientTimerId = efuns.callOut(() => {
      if (this._state === 'traveling') {
        const msg =
          DEFAULT_MESSAGES.traveling[
            Math.floor(Math.random() * DEFAULT_MESSAGES.traveling.length)
          ];
        this.broadcast(`{dim}${msg}{/}\n`);

        // Schedule next ambient message
        this.scheduleAmbientMessage();
      }
    }, delay);
  }

  /**
   * Handle arriving at the next stop.
   */
  private async handleArriving(): Promise<void> {
    try {
      // Stop ambient messages
      if (this._ambientTimerId !== null && typeof efuns !== 'undefined') {
        efuns.removeCallOut(this._ambientTimerId);
        this._ambientTimerId = null;
      }

      // Advance to next stop
      this.advanceToNextStop();

      const currentStop = this.getCurrentStop();
      if (!currentStop) {
        console.error('[Ferry] No current stop after advancing - restarting schedule');
        this._currentStopIndex = 0;
        this._direction = 'forward';
      }

      if (currentStop) {
        // Send arriving message
        try {
          const arriveMsg =
            DEFAULT_MESSAGES.arriving[Math.floor(Math.random() * DEFAULT_MESSAGES.arriving.length)];
          this.broadcast(`${arriveMsg}\n`);
        } catch (error) {
          console.error('[Ferry] Error broadcasting arrival message:', error);
        }

        // Load and dock at new location
        const room = await this.loadRoom(currentStop.roomPath);
        if (room) {
          await this.dock(room);

          // Send arrived message
          try {
            const arrivedMsg = DEFAULT_MESSAGES.arrived.replace('{stopName}', currentStop.name);
            this.broadcast(`{green}${arrivedMsg}{/}\n`);
          } catch (error) {
            console.error('[Ferry] Error broadcasting arrived message:', error);
          }
        } else {
          console.error(`[Ferry] Failed to load room ${currentStop.roomPath} - continuing schedule`);
        }
      }
    } catch (error) {
      console.error('[Ferry] Error in handleArriving:', error);
    }

    // ALWAYS transition to docked state and continue schedule
    this._state = 'docked';

    if (typeof efuns !== 'undefined' && efuns.callOut) {
      this._timerId = efuns.callOut(() => {
        this.scheduleNext();
      }, 1000); // Brief pause before starting dock timer
    }
  }

  /**
   * Advance to the next stop index, reversing direction at endpoints.
   */
  private advanceToNextStop(): void {
    if (this._direction === 'forward') {
      if (this._currentStopIndex >= this._route.length - 1) {
        // Reached end, reverse direction
        this._direction = 'backward';
        this._currentStopIndex--;
      } else {
        this._currentStopIndex++;
      }
    } else {
      if (this._currentStopIndex <= 0) {
        // Reached start, reverse direction
        this._direction = 'forward';
        this._currentStopIndex++;
      } else {
        this._currentStopIndex--;
      }
    }
  }

  /**
   * Load a room by path.
   */
  private async loadRoom(path: string): Promise<Room | null> {
    if (typeof efuns === 'undefined') return null;

    try {
      // Try to find already-loaded room first
      let room = efuns.findObject(path);
      if (room) return room as Room;

      // Load the blueprint
      if (efuns.loadBlueprint) {
        room = await efuns.loadBlueprint(path);
        return room as Room;
      }
    } catch (error) {
      console.error(`[Ferry] Failed to load room ${path}:`, error);
    }

    return null;
  }

  // ========== Watchdog ==========

  /**
   * Start the watchdog timer that detects stalled schedules.
   * Checks every 60 seconds. If no state change has occurred in longer than
   * a full cycle (dockTime + travelTime + buffer), restart the schedule.
   */
  private startWatchdog(): void {
    if (typeof efuns === 'undefined' || !efuns.callOut) return;

    const checkInterval = 60000; // Check every 60 seconds

    this._watchdogTimerId = efuns.callOut(() => {
      this.watchdogCheck();
    }, checkInterval);
  }

  /**
   * Watchdog check - restart schedule if stalled.
   */
  private watchdogCheck(): void {
    if (typeof efuns === 'undefined' || !efuns.callOut) return;

    const now = Date.now();
    // Max expected time for any single state: dockTime + generous buffer
    const maxStateTime = this._dockTime + this._travelTime + 60000;
    const elapsed = now - this._lastStateChangeTime;

    if (this._lastStateChangeTime > 0 && elapsed > maxStateTime) {
      console.error(
        `[Ferry] Watchdog: Schedule appears stalled (state=${this._state}, ` +
        `elapsed=${Math.round(elapsed / 1000)}s). Restarting schedule.`
      );

      // Cancel any pending timers
      if (this._timerId !== null) {
        efuns.removeCallOut(this._timerId);
        this._timerId = null;
      }
      if (this._ambientTimerId !== null) {
        efuns.removeCallOut(this._ambientTimerId);
        this._ambientTimerId = null;
      }

      // Restart schedule
      this._state = 'docked';
      this._lastStateChangeTime = now;
      this.startSchedule().catch((error) => {
        console.error('[Ferry] Watchdog: Failed to restart schedule:', error);
      });
    }

    // Reschedule watchdog
    this._watchdogTimerId = efuns.callOut(() => {
      this.watchdogCheck();
    }, 60000);
  }

  // ========== Lifecycle ==========

  /**
   * Called when ferry is created.
   */
  override async onCreate(): Promise<void> {
    await super.onCreate();
    // Schedule will be started manually by calling startSchedule()
  }

  /**
   * Called when ferry is destroyed.
   */
  override async onDestroy(): Promise<void> {
    this.stopSchedule();
    await super.onDestroy();
  }
}

export default Ferry;
