/**
 * ClockPanel - Displays server time in the header.
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
 */

import type { TimeMessage } from './websocket-client.js';

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
 * ClockPanel displays server time with fantasy theming.
 */
export class ClockPanel {
  private container: HTMLElement;
  private periodElement: HTMLElement;
  private timeElement: HTMLElement;
  private updateInterval: number | null = null;

  // Server time sync state
  private serverTimestamp: number = 0;
  private localSyncTime: number = 0;
  private timezoneAbbreviation: string = '';

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
   * Start the local update loop (every second).
   */
  private startUpdateLoop(): void {
    if (this.updateInterval !== null) {
      return;
    }

    this.updateInterval = window.setInterval(() => {
      this.updateDisplay();
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
}

export default ClockPanel;
