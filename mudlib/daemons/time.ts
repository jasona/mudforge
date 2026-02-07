/**
 * Time Daemon - In-game day/night cycle.
 *
 * Provides an accelerated game clock where 1 real hour = 24 game hours.
 * The cycle affects outdoor room lighting via the visibility system.
 *
 * Phases:
 *   Dawn  (5:00-7:00)   - light modifier -20
 *   Day   (7:00-18:00)  - light modifier 0
 *   Dusk  (18:00-20:00) - light modifier -20
 *   Night (20:00-5:00)  - light modifier -40
 *
 * Usage:
 *   const td = getTimeDaemon();
 *   td.getPhase();        // 'dawn' | 'day' | 'dusk' | 'night'
 *   td.getLightModifier(); // 0, -20, or -40
 */

import { MudObject } from '../std/object.js';
import { getConfigDaemon } from './config.js';

/**
 * Game time phase.
 */
export type TimePhase = 'dawn' | 'day' | 'dusk' | 'night';

/**
 * Game time information.
 */
export interface GameTime {
  hour: number;   // 0-23
  minute: number; // 0-59
}

/**
 * Light modifiers per phase.
 */
const PHASE_LIGHT_MODIFIERS: Record<TimePhase, number> = {
  dawn: -20,
  day: 0,
  dusk: -20,
  night: -40,
};

/**
 * Phase transition broadcast messages.
 */
const PHASE_MESSAGES: Record<TimePhase, string> = {
  dawn: '{yellow}The first light of dawn breaks over the horizon.{/}',
  day: '{bold}{yellow}The sun rises fully, bathing the world in daylight.{/}',
  dusk: '{#FFA500}The sun sinks low, casting long shadows as dusk settles in.{/}',
  night: '{blue}Darkness falls as night claims the land. Stars appear overhead.{/}',
};

/**
 * Default cycle duration: 60 real minutes = 24 game hours.
 */
const DEFAULT_CYCLE_DURATION_MINUTES = 60;

/**
 * Time Daemon class.
 */
export class TimeDaemon extends MudObject {
  /** Real-world timestamp (ms) when game time was epoch (hour 0, minute 0) */
  private _epochMs: number = Date.now();
  /** Duration of one full game day in milliseconds */
  private _cycleDurationMs: number = DEFAULT_CYCLE_DURATION_MINUTES * 60 * 1000;
  /** Last known phase (for detecting transitions) */
  private _lastPhase: TimePhase = 'day';
  /** callOut ID for the tick timer */
  private _tickId: number | null = null;
  /** Whether the daemon is running */
  private _running: boolean = false;

  constructor() {
    super();
    this.name = 'time_daemon';
    this._cycleDurationMs = this.getConfiguredCycleDurationMs();
    this._lastPhase = this.getPhase();
  }

  /**
   * Read cycle duration from config daemon.
   */
  private getConfiguredCycleDurationMs(): number {
    try {
      const config = getConfigDaemon();
      const minutes = config.get<number>('time.cycleDurationMinutes');
      if (minutes && minutes > 0) {
        return minutes * 60 * 1000;
      }
    } catch {
      // Config daemon not available yet, use default
    }
    return DEFAULT_CYCLE_DURATION_MINUTES * 60 * 1000;
  }

  /**
   * Start the time daemon tick loop.
   */
  start(): void {
    if (this._running) return;
    this._running = true;
    this._lastPhase = this.getPhase();
    this.scheduleTick();
  }

  /**
   * Stop the time daemon.
   */
  stop(): void {
    this._running = false;
    if (this._tickId !== null && typeof efuns !== 'undefined' && efuns.removeCallOut) {
      efuns.removeCallOut(this._tickId);
      this._tickId = null;
    }
  }

  /**
   * Schedule the next tick.
   * Ticks every game hour (~2.5 real minutes at default speed).
   */
  private scheduleTick(): void {
    if (!this._running) return;
    if (typeof efuns === 'undefined' || !efuns.callOut) return;

    // One game hour in real milliseconds
    const gameHourMs = this._cycleDurationMs / 24;

    this._tickId = efuns.callOut(() => {
      this.tick();
    }, gameHourMs);
  }

  /**
   * Called every game hour. Checks for phase transitions and broadcasts.
   */
  private tick(): void {
    this._tickId = null;
    if (!this._running) return;

    const currentPhase = this.getPhase();

    if (currentPhase !== this._lastPhase) {
      this.onPhaseChange(this._lastPhase, currentPhase);
      this._lastPhase = currentPhase;
    }

    this.scheduleTick();
  }

  /**
   * Handle a phase transition.
   */
  private onPhaseChange(_oldPhase: TimePhase, newPhase: TimePhase): void {
    if (typeof efuns === 'undefined') return;

    // Broadcast message to all players
    const message = PHASE_MESSAGES[newPhase];
    if (message && efuns.allPlayers) {
      const players = efuns.allPlayers();
      for (const player of players) {
        try {
          efuns.send(player, `\n${message}\n`);

          // Send updated game time protocol message
          if (efuns.sendGameTime) {
            efuns.sendGameTime(player, this.getGameTimeData());
          }
        } catch {
          // Player may have disconnected
        }
      }
    }
  }

  /**
   * Get the current game time.
   */
  getGameTime(): GameTime {
    const elapsed = Date.now() - this._epochMs;
    const cycleProgress = (elapsed % this._cycleDurationMs) / this._cycleDurationMs;
    const totalMinutes = cycleProgress * 24 * 60; // total game minutes in the day
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minute = Math.floor(totalMinutes % 60);
    return { hour, minute };
  }

  /**
   * Get the current phase based on game hour.
   */
  getPhase(): TimePhase {
    const { hour } = this.getGameTime();
    if (hour >= 5 && hour < 7) return 'dawn';
    if (hour >= 7 && hour < 18) return 'day';
    if (hour >= 18 && hour < 20) return 'dusk';
    return 'night';
  }

  /**
   * Whether it's daytime (dawn, day, or dusk).
   */
  isDaytime(): boolean {
    const phase = this.getPhase();
    return phase !== 'night';
  }

  /**
   * Whether it's nighttime.
   */
  isNighttime(): boolean {
    return this.getPhase() === 'night';
  }

  /**
   * Check if the time system is enabled via config.
   */
  isEnabled(): boolean {
    try {
      const config = getConfigDaemon();
      const enabled = config.get<boolean>('time.enabled');
      return enabled !== false; // Default to true
    } catch {
      return true;
    }
  }

  /**
   * Get the light modifier for the current phase.
   * Applied to outdoor rooms only. Returns 0 if time system is disabled.
   */
  getLightModifier(): number {
    if (!this.isEnabled()) return 0;
    return PHASE_LIGHT_MODIFIERS[this.getPhase()];
  }

  /**
   * Get the full cycle duration in milliseconds.
   */
  getCycleDurationMs(): number {
    return this._cycleDurationMs;
  }

  /**
   * Get game time data suitable for protocol messages.
   */
  getGameTimeData(): { hour: number; minute: number; phase: TimePhase; cycleDurationMs: number } {
    const { hour, minute } = this.getGameTime();
    return {
      hour,
      minute,
      phase: this.getPhase(),
      cycleDurationMs: this._cycleDurationMs,
    };
  }
}

// Singleton instance
let timeDaemon: TimeDaemon | null = null;

/**
 * Get the time daemon singleton.
 * Auto-starts the tick loop on first access.
 */
export function getTimeDaemon(): TimeDaemon {
  if (!timeDaemon) {
    timeDaemon = new TimeDaemon();
    timeDaemon.start();
  }
  return timeDaemon;
}

/**
 * Reset the time daemon (for testing).
 */
export function resetTimeDaemon(): void {
  if (timeDaemon) {
    timeDaemon.stop();
    timeDaemon = null;
  }
}
