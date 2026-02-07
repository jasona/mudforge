/**
 * ClockPanel - Displays server time and game time in the header.
 *
 * Server time periods match the in-game `time` command:
 * - midnight (0)
 * - dead of night (1-4)
 * - dawn (5-6)
 * - morning (7-11)
 * - midday (12)
 * - afternoon (13-16)
 * - dusk (17-18)
 * - evening (19-21)
 * - night (22-23)
 *
 * Game time shows the accelerated in-game day/night cycle phase.
 */

import type { TimeMessage, GameTimeMessage } from './websocket-client.js';

interface TimePeriod {
  name: string;
  color: 'blue' | 'yellow' | 'orange' | 'magenta';
}

/**
 * Get time period info based on hour (matches _time.ts logic).
 */
function getTimePeriod(hour: number): TimePeriod {
  if (hour === 0) {
    return { name: 'Midnight', color: 'blue' };
  } else if (hour >= 1 && hour < 5) {
    return { name: 'Night', color: 'blue' };
  } else if (hour >= 5 && hour < 7) {
    return { name: 'Dawn', color: 'yellow' };
  } else if (hour >= 7 && hour < 12) {
    return { name: 'Morning', color: 'yellow' };
  } else if (hour >= 12 && hour < 13) {
    return { name: 'Midday', color: 'yellow' };
  } else if (hour >= 13 && hour < 17) {
    return { name: 'Afternoon', color: 'yellow' };
  } else if (hour >= 17 && hour < 19) {
    return { name: 'Dusk', color: 'orange' };
  } else if (hour >= 19 && hour < 22) {
    return { name: 'Evening', color: 'magenta' };
  } else {
    return { name: 'Night', color: 'blue' };
  }
}

/**
 * Phase color mapping for game time display.
 */
const PHASE_COLORS: Record<string, string> = {
  dawn: 'yellow',
  day: 'yellow',
  dusk: 'orange',
  night: 'blue',
};

/**
 * Phase display names.
 */
const PHASE_NAMES: Record<string, string> = {
  dawn: 'Dawn',
  day: 'Day',
  dusk: 'Dusk',
  night: 'Night',
};

/**
 * Format time to 12-hour format with AM/PM.
 */
function formatTime12Hour(date: Date): string {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

/**
 * Format game time as H:MM (24-hour game time).
 */
function formatGameTime(hour: number, minute: number): string {
  return `${hour}:${minute.toString().padStart(2, '0')}`;
}

/**
 * ClockPanel displays server time and game time with fantasy theming.
 */
export class ClockPanel {
  private container: HTMLElement;
  private periodElement: HTMLElement;
  private timeElement: HTMLElement;
  private gameTimeContainer: HTMLElement;
  private gamePhaseElement: HTMLElement;
  private gameTimeElement: HTMLElement;
  private updateInterval: number | null = null;

  // Server time sync state
  private serverTimestamp: number = 0;
  private localSyncTime: number = 0;
  private timezoneAbbreviation: string = '';

  // Game time sync state
  private gameTimeHour: number = 0;
  private gameTimeMinute: number = 0;
  private gameTimePhase: string = 'day';
  private gameTimeCycleDurationMs: number = 3600000; // default 1 hour
  private gameTimeSyncTime: number = 0;
  private hasGameTime: boolean = false;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Clock container #${containerId} not found`);
    }
    this.container = container;

    // Create server clock elements
    this.periodElement = document.createElement('span');
    this.periodElement.className = 'clock-period';

    this.timeElement = document.createElement('span');
    this.timeElement.className = 'clock-time';

    this.container.appendChild(this.periodElement);
    this.container.appendChild(this.timeElement);

    // Create game time elements (hidden until first game time message)
    this.gameTimeContainer = document.createElement('span');
    this.gameTimeContainer.className = 'clock-gametime';
    this.gameTimeContainer.style.display = 'none';

    this.gamePhaseElement = document.createElement('span');
    this.gamePhaseElement.className = 'clock-period';

    this.gameTimeElement = document.createElement('span');
    this.gameTimeElement.className = 'clock-time';

    this.gameTimeContainer.appendChild(this.gamePhaseElement);
    this.gameTimeContainer.appendChild(this.gameTimeElement);
    this.container.appendChild(this.gameTimeContainer);

    // Start the local update loop
    this.startUpdateLoop();
  }

  /**
   * Handle a time message from the server.
   */
  handleMessage(message: TimeMessage): void {
    this.serverTimestamp = message.timestamp;
    this.localSyncTime = Date.now();
    this.timezoneAbbreviation = message.timezone.abbreviation;

    // Immediately update display
    this.updateDisplay();
  }

  /**
   * Handle a game time message from the server.
   */
  handleGameTimeMessage(message: GameTimeMessage): void {
    this.gameTimeHour = message.hour;
    this.gameTimeMinute = message.minute;
    this.gameTimePhase = message.phase;
    this.gameTimeCycleDurationMs = message.cycleDurationMs;
    this.gameTimeSyncTime = Date.now();
    this.hasGameTime = true;

    // Show the game time section
    this.gameTimeContainer.style.display = '';

    // Immediately update display
    this.updateGameTimeDisplay();
  }

  /**
   * Start the local update loop (every second).
   */
  private startUpdateLoop(): void {
    if (this.updateInterval !== null) {
      return;
    }

    this.updateInterval = window.setInterval(() => {
      this.updateDisplay();
      if (this.hasGameTime) {
        this.updateGameTimeDisplay();
      }
    }, 1000);
  }

  /**
   * Stop the update loop.
   */
  stop(): void {
    if (this.updateInterval !== null) {
      window.clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Get the current interpolated time based on server sync.
   */
  private getCurrentTime(): Date {
    if (this.serverTimestamp === 0) {
      // No server time yet, use local time
      return new Date();
    }

    // Calculate elapsed time since last server sync
    const elapsedMs = Date.now() - this.localSyncTime;
    const currentTimestamp = this.serverTimestamp + Math.floor(elapsedMs / 1000);

    return new Date(currentTimestamp * 1000);
  }

  /**
   * Get the current interpolated game time.
   * Game time advances at 24x real time (configurable via cycleDurationMs).
   */
  private getCurrentGameTime(): { hour: number; minute: number; phase: string } {
    if (!this.hasGameTime) {
      return { hour: this.gameTimeHour, minute: this.gameTimeMinute, phase: this.gameTimePhase };
    }

    // How many real ms have elapsed since last sync
    const elapsedMs = Date.now() - this.gameTimeSyncTime;

    // Convert to game minutes elapsed
    // cycleDurationMs = one full game day (24 game hours = 1440 game minutes)
    const gameMinutesPerMs = 1440 / this.gameTimeCycleDurationMs;
    const elapsedGameMinutes = elapsedMs * gameMinutesPerMs;

    // Add to synced time
    const totalMinutes = this.gameTimeHour * 60 + this.gameTimeMinute + elapsedGameMinutes;
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minute = Math.floor(totalMinutes % 60);

    // Recalculate phase from interpolated hour
    let phase: string;
    if (hour >= 5 && hour < 7) phase = 'dawn';
    else if (hour >= 7 && hour < 18) phase = 'day';
    else if (hour >= 18 && hour < 20) phase = 'dusk';
    else phase = 'night';

    return { hour, minute, phase };
  }

  /**
   * Update the server time display.
   */
  private updateDisplay(): void {
    const now = this.getCurrentTime();
    const period = getTimePeriod(now.getHours());
    const timeStr = formatTime12Hour(now);
    const tzStr = this.timezoneAbbreviation || '';

    // Update period display
    this.periodElement.textContent = period.name;
    this.periodElement.className = `clock-period clock-period-${period.color}`;

    // Update time display
    this.timeElement.textContent = tzStr ? `${timeStr} ${tzStr}` : timeStr;
  }

  /**
   * Update the game time display.
   */
  private updateGameTimeDisplay(): void {
    const { hour, minute, phase } = this.getCurrentGameTime();
    const color = PHASE_COLORS[phase] || 'yellow';
    const phaseName = PHASE_NAMES[phase] || phase;

    this.gamePhaseElement.textContent = phaseName;
    this.gamePhaseElement.className = `clock-period clock-period-${color}`;
    this.gameTimeElement.textContent = formatGameTime(hour, minute);
  }
}

export default ClockPanel;
