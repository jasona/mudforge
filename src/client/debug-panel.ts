/**
 * DebugPanel - Floating debug console for the MudForge client.
 *
 * Features:
 * - Captures console.log/warn/error via logger
 * - Displays logs with timestamps and severity colors
 * - Filter tabs for log levels
 * - Connection state and metrics display
 * - Copy All and Clear buttons
 * - Bug report generation
 * - Draggable and collapsible
 * - Position saved to localStorage
 */

import { logger, LogEntry, LogLevel } from './logger.js';

/**
 * Game/driver configuration from /api/config.
 */
interface GameConfig {
  game: {
    name: string;
    tagline: string;
    version: string;
    description: string;
    establishedYear: number;
    website: string;
  };
  driver: {
    name: string;
    version: string;
  };
  hasBugReports?: boolean;
}

/**
 * Bug report structure.
 */
interface BugReport {
  timestamp: string;
  gameVersion: string;
  driverVersion: string;
  browser: string;
  platform: string;
  connectionState: string;
  uptime: number;
  playerName?: string;
  recentLogs: LogEntry[];
}

/**
 * Debug panel options.
 */
interface DebugPanelOptions {
  onSendBugReport?: (report: BugReport) => void;
  onClose?: () => void;
}

/**
 * Filter options for log display.
 */
type LogFilter = 'all' | LogLevel;

const STORAGE_KEY = 'mudforge_debug_panel';

/**
 * Stored panel state.
 */
interface PanelState {
  x: number;
  y: number;
  collapsed: boolean;
  filter: LogFilter;
  visible: boolean;
}

/**
 * DebugPanel displays logs and system info in a floating panel.
 */
export class DebugPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private header: HTMLElement;
  private content: HTMLElement;
  private logList: HTMLElement;
  private statusBar: HTMLElement;
  private filterTabs: HTMLElement;

  // Cached status bar elements (avoid repeated DOM queries)
  private versionEl: HTMLElement | null = null;
  private pingEl: HTMLElement | null = null;
  private uptimeEl: HTMLElement | null = null;
  private countEl: HTMLElement | null = null;

  private options: DebugPanelOptions;
  private config: GameConfig | null = null;
  private isVisible: boolean = false;
  private isCollapsed: boolean = false;
  private currentFilter: LogFilter = 'all';
  private startTime: number = Date.now();
  private latencySamples: number[] = [];
  private currentLatency: number = 0;

  // Drag state
  private isDragging: boolean = false;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };

  // Interval reference for cleanup
  private statusBarInterval: number | null = null;

  // Bound event handlers (stored for cleanup)
  private boundOnDrag: (e: MouseEvent) => void;
  private boundEndDrag: () => void;

  // Maximum log entries to keep in DOM (prevents memory bloat on long sessions)
  private static MAX_LOG_ENTRIES = 200;

  constructor(containerId: string, options: DebugPanelOptions = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Debug container #${containerId} not found`);
    }
    this.container = container;
    this.options = options;

    // Create panel structure
    this.panel = this.createPanel();
    this.header = this.panel.querySelector('.debug-header')!;
    this.content = this.panel.querySelector('.debug-content')!;
    this.logList = this.panel.querySelector('.debug-log-list')!;
    this.statusBar = this.panel.querySelector('.debug-status-bar')!;
    this.filterTabs = this.panel.querySelector('.debug-filter-tabs')!;

    this.container.appendChild(this.panel);

    // Cache status bar element references
    this.versionEl = this.statusBar.querySelector('.debug-version');
    this.pingEl = this.statusBar.querySelector('.debug-ping');
    this.uptimeEl = this.statusBar.querySelector('.debug-uptime');
    this.countEl = this.statusBar.querySelector('.debug-log-count');

    // Pre-bind event handlers for proper cleanup
    this.boundOnDrag = this.onDrag.bind(this);
    this.boundEndDrag = this.endDrag.bind(this);

    // Set up event handlers
    this.setupEventHandlers();

    // Subscribe to logger
    logger.on((entry) => this.addLogEntry(entry));

    // Load saved state
    this.loadState();

    // Add existing log entries
    for (const entry of logger.getEntries()) {
      this.addLogEntry(entry, false);
    }
  }

  /**
   * Create the panel DOM structure.
   */
  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'debug-panel hidden';
    panel.innerHTML = `
      <div class="debug-header">
        <span class="debug-title">Debug Console</span>
        <div class="debug-header-buttons">
          <button class="debug-collapse-btn" title="Collapse">_</button>
          <button class="debug-close-btn" title="Close">&times;</button>
        </div>
      </div>
      <div class="debug-content">
        <div class="debug-filter-tabs">
          <button class="debug-filter-tab active" data-filter="all">All</button>
          <button class="debug-filter-tab" data-filter="info">Info</button>
          <button class="debug-filter-tab" data-filter="warn">Warn</button>
          <button class="debug-filter-tab" data-filter="error">Error</button>
        </div>
        <div class="debug-log-list"></div>
        <div class="debug-status-bar">
          <span class="debug-version">Version: -</span>
          <span class="debug-ping">Ping: --</span>
          <span class="debug-uptime">Uptime: 0s</span>
          <span class="debug-log-count">Logs: 0</span>
        </div>
        <div class="debug-actions">
          <button class="debug-copy-btn" title="Copy all logs to clipboard">Copy Logs</button>
          <button class="debug-clear-btn" title="Clear all logs">Clear</button>
          <button class="debug-copy-report-btn" title="Copy bug report to clipboard">Copy Report</button>
          <button class="debug-send-report-btn hidden" title="Create GitHub issue with bug report">Create Issue</button>
        </div>
      </div>
    `;
    return panel;
  }

  /**
   * Set up event handlers.
   */
  private setupEventHandlers(): void {
    // Close button
    const closeBtn = this.panel.querySelector('.debug-close-btn');
    closeBtn?.addEventListener('click', () => {
      this.hide();
      this.options.onClose?.();
    });

    // Collapse button
    const collapseBtn = this.panel.querySelector('.debug-collapse-btn');
    collapseBtn?.addEventListener('click', () => this.toggleCollapse());

    // Filter tabs
    this.filterTabs.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('debug-filter-tab')) {
        const filter = target.dataset.filter as LogFilter;
        this.setFilter(filter);
      }
    });

    // Copy button
    const copyBtn = this.panel.querySelector('.debug-copy-btn');
    copyBtn?.addEventListener('click', () => this.copyLogs());

    // Clear button
    const clearBtn = this.panel.querySelector('.debug-clear-btn');
    clearBtn?.addEventListener('click', () => this.clearLogs());

    // Copy Report button
    const copyReportBtn = this.panel.querySelector('.debug-copy-report-btn');
    copyReportBtn?.addEventListener('click', () => this.copyBugReport());

    // Send Report button
    const sendReportBtn = this.panel.querySelector('.debug-send-report-btn');
    sendReportBtn?.addEventListener('click', () => this.sendBugReport());

    // Drag handling (use pre-bound handlers for cleanup)
    this.header.addEventListener('mousedown', (e) => this.startDrag(e));
    document.addEventListener('mousemove', this.boundOnDrag);
    document.addEventListener('mouseup', this.boundEndDrag);

    // Update uptime periodically (store reference for potential cleanup)
    this.statusBarInterval = window.setInterval(() => this.updateStatusBar(), 1000);
  }

  /**
   * Start dragging the panel.
   */
  private startDrag(e: MouseEvent): void {
    // Don't drag if clicking buttons
    if ((e.target as HTMLElement).tagName === 'BUTTON') {
      return;
    }

    this.isDragging = true;
    const rect = this.panel.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    this.panel.style.cursor = 'grabbing';
  }

  /**
   * Handle drag movement.
   */
  private onDrag(e: MouseEvent): void {
    if (!this.isDragging) {
      return;
    }

    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;

    // Clamp to terminal container bounds (or fall back to viewport)
    const terminal = document.getElementById('terminal-container');
    const bounds = terminal
      ? terminal.getBoundingClientRect()
      : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };

    const panelWidth = this.panel.offsetWidth;
    const panelHeight = this.panel.offsetHeight;

    const minX = bounds.left;
    const minY = bounds.top;
    const maxX = bounds.right - panelWidth;
    const maxY = bounds.bottom - panelHeight;

    this.panel.style.left = `${Math.max(minX, Math.min(x, maxX))}px`;
    this.panel.style.top = `${Math.max(minY, Math.min(y, maxY))}px`;
    this.panel.style.right = 'auto';
    this.panel.style.bottom = 'auto';
  }

  /**
   * End dragging.
   */
  private endDrag(): void {
    if (!this.isDragging) {
      return;
    }

    this.isDragging = false;
    this.panel.style.cursor = '';
    this.saveState();
  }

  /**
   * Add a log entry to the display.
   */
  private addLogEntry(entry: LogEntry, scroll: boolean = true): void {
    const item = document.createElement('div');
    item.className = `debug-log-item debug-log-${entry.level}`;
    item.dataset.level = entry.level;

    const time = new Date(entry.timestamp);
    const timeStr = time.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const levelLabel = entry.level.toUpperCase().padEnd(5);

    item.innerHTML = `
      <span class="debug-log-time">${timeStr}</span>
      <span class="debug-log-level">[${levelLabel}]</span>
      <span class="debug-log-message">${this.escapeHtml(entry.message)}</span>
    `;

    // Apply filter visibility
    if (this.currentFilter !== 'all' && entry.level !== this.currentFilter) {
      item.style.display = 'none';
    }

    this.logList.appendChild(item);

    // Trim old entries to prevent memory bloat on long sessions
    while (this.logList.children.length > DebugPanel.MAX_LOG_ENTRIES) {
      this.logList.removeChild(this.logList.firstChild!);
    }

    // Auto-scroll to bottom
    if (scroll && this.isVisible) {
      this.logList.scrollTop = this.logList.scrollHeight;
    }

    this.updateStatusBar();
  }

  /**
   * Escape HTML to prevent XSS.
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Set the current filter.
   */
  private setFilter(filter: LogFilter): void {
    this.currentFilter = filter;

    // Update tab active state
    const tabs = this.filterTabs.querySelectorAll('.debug-filter-tab');
    tabs.forEach((tab) => {
      tab.classList.toggle('active', (tab as HTMLElement).dataset.filter === filter);
    });

    // Filter visible items
    const items = this.logList.querySelectorAll('.debug-log-item');
    items.forEach((item) => {
      const level = (item as HTMLElement).dataset.level;
      const visible = filter === 'all' || level === filter;
      (item as HTMLElement).style.display = visible ? '' : 'none';
    });

    this.saveState();
  }

  /**
   * Update the status bar (uses cached element references for performance).
   */
  private updateStatusBar(): void {
    if (this.versionEl && this.config) {
      this.versionEl.textContent = `Version: ${this.config.game.version}`;
    }

    if (this.pingEl) {
      if (this.currentLatency > 0) {
        const latencyText = `Ping: ${this.currentLatency}ms`;
        this.pingEl.textContent = latencyText;

        // Color code based on latency
        // Remove existing color classes
        this.pingEl.classList.remove('ping-good', 'ping-warn', 'ping-bad');
        if (this.currentLatency < 100) {
          this.pingEl.classList.add('ping-good');
        } else if (this.currentLatency < 250) {
          this.pingEl.classList.add('ping-warn');
        } else {
          this.pingEl.classList.add('ping-bad');
        }
      } else {
        this.pingEl.textContent = 'Ping: --';
        this.pingEl.classList.remove('ping-good', 'ping-warn', 'ping-bad');
      }
    }

    if (this.uptimeEl) {
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = uptime % 60;
      if (hours > 0) {
        this.uptimeEl.textContent = `Uptime: ${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        this.uptimeEl.textContent = `Uptime: ${minutes}m ${seconds}s`;
      } else {
        this.uptimeEl.textContent = `Uptime: ${seconds}s`;
      }
    }

    if (this.countEl) {
      this.countEl.textContent = `Logs: ${logger.count}`;
    }
  }

  /**
   * Update the latency display with a new sample.
   * Keeps a rolling average of the last 5 samples.
   */
  updateLatency(latencyMs: number): void {
    // Add new sample
    this.latencySamples.push(latencyMs);

    // Keep only last 5 samples
    if (this.latencySamples.length > 5) {
      this.latencySamples.shift();
    }

    // Calculate rolling average
    const sum = this.latencySamples.reduce((a, b) => a + b, 0);
    this.currentLatency = Math.round(sum / this.latencySamples.length);

    this.updateStatusBar();
  }

  /**
   * Copy all logs to clipboard.
   */
  private async copyLogs(): Promise<void> {
    try {
      const text = logger.exportText();
      await navigator.clipboard.writeText(text);
      logger.info('Logs copied to clipboard');
    } catch (error) {
      logger.error('Failed to copy logs:', error);
    }
  }

  /**
   * Clear all logs.
   */
  private clearLogs(): void {
    logger.clear();
    this.logList.innerHTML = '';
    this.updateStatusBar();
    logger.info('Logs cleared');
  }

  /**
   * Build a bug report object.
   */
  private buildBugReport(): BugReport {
    return {
      timestamp: new Date().toISOString(),
      gameVersion: this.config?.game.version ?? 'unknown',
      driverVersion: this.config?.driver.version ?? 'unknown',
      browser: navigator.userAgent,
      platform: navigator.platform,
      connectionState: 'unknown', // TODO: Get from WebSocket client
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      recentLogs: logger.getRecentEntries(50),
    };
  }

  /**
   * Copy bug report to clipboard.
   */
  private async copyBugReport(): Promise<void> {
    const report = this.buildBugReport();

    try {
      const text = JSON.stringify(report, null, 2);
      await navigator.clipboard.writeText(text);
      logger.info('Bug report copied to clipboard');
    } catch (error) {
      logger.error('Failed to copy bug report:', error);
    }
  }

  /**
   * Send bug report to GitHub via server.
   */
  private sendBugReport(): void {
    if (!this.options.onSendBugReport) {
      logger.error('Bug report handler not configured');
      return;
    }

    if (!this.config?.hasBugReports) {
      logger.error('GitHub bug reports not configured on server');
      return;
    }

    const report = this.buildBugReport();
    this.options.onSendBugReport(report);
    logger.info('Bug report sent to GitHub');
  }

  /**
   * Toggle collapse state.
   */
  private toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    this.content.style.display = this.isCollapsed ? 'none' : '';
    this.panel.classList.toggle('collapsed', this.isCollapsed);
    this.saveState();
  }

  /**
   * Show the panel.
   */
  show(): void {
    this.isVisible = true;
    this.panel.classList.remove('hidden');
    // Scroll to bottom
    this.logList.scrollTop = this.logList.scrollHeight;
    this.saveState();
  }

  /**
   * Hide the panel.
   */
  hide(): void {
    this.isVisible = false;
    // Save state BEFORE adding hidden class, otherwise getBoundingClientRect
    // returns (0,0) since display:none elements have no layout
    this.saveState();
    this.panel.classList.add('hidden');
  }

  /**
   * Toggle panel visibility.
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if panel is visible.
   */
  get visible(): boolean {
    return this.isVisible;
  }

  /**
   * Stop the panel and clean up resources.
   */
  stop(): void {
    if (this.statusBarInterval !== null) {
      window.clearInterval(this.statusBarInterval);
      this.statusBarInterval = null;
    }

    // Remove global event listeners
    document.removeEventListener('mousemove', this.boundOnDrag);
    document.removeEventListener('mouseup', this.boundEndDrag);
  }

  /**
   * Set game config for display.
   */
  setConfig(config: GameConfig): void {
    this.config = config;
    this.updateStatusBar();

    // Show/hide Send Report button based on GitHub bug reports availability
    const sendReportBtn = this.panel.querySelector('.debug-send-report-btn');
    if (sendReportBtn) {
      sendReportBtn.classList.toggle('hidden', !config.hasBugReports);
    }
  }

  /**
   * Save panel state to localStorage.
   */
  private saveState(): void {
    const rect = this.panel.getBoundingClientRect();
    const state: PanelState = {
      x: rect.left,
      y: rect.top,
      collapsed: this.isCollapsed,
      filter: this.currentFilter,
      visible: this.isVisible,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage might not be available
    }
  }

  /**
   * Load panel state from localStorage.
   */
  private loadState(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const state: PanelState = JSON.parse(stored);

        // Apply position
        if (typeof state.x === 'number' && typeof state.y === 'number') {
          this.applyPosition(state.x, state.y);
        } else {
          this.positionDefault();
        }

        // Apply collapse state
        if (state.collapsed) {
          this.isCollapsed = true;
          this.content.style.display = 'none';
          this.panel.classList.add('collapsed');
        }

        // Apply filter
        if (state.filter) {
          this.setFilter(state.filter);
        }

        // Apply visibility
        if (state.visible) {
          this.isVisible = true;
          this.panel.classList.remove('hidden');
        }
      } else {
        // No saved state — use default position
        this.positionDefault();
      }
    } catch {
      // localStorage might not be available or data corrupted
      this.positionDefault();
    }
  }

  /**
   * Position the panel at the bottom-right of the terminal container,
   * or fall back to the bottom-right of the viewport.
   */
  private positionDefault(): void {
    requestAnimationFrame(() => {
      const terminal = document.getElementById('terminal-container');
      const panelWidth = this.panel.offsetWidth || 400;
      const panelHeight = this.panel.offsetHeight || 300;

      if (terminal) {
        const rect = terminal.getBoundingClientRect();
        const x = rect.right - panelWidth - 8;
        const y = rect.bottom - panelHeight - 8;
        this.applyPosition(x, y);
      } else {
        const x = window.innerWidth - panelWidth - 8;
        const y = window.innerHeight - panelHeight - 8;
        this.applyPosition(x, y);
      }
    });
  }

  /**
   * Apply a position to the panel, clamping it within the terminal container.
   */
  private applyPosition(x: number, y: number): void {
    const panelWidth = this.panel.offsetWidth || 400;
    const panelHeight = this.panel.offsetHeight || 300;

    const terminal = document.getElementById('terminal-container');
    const bounds = terminal
      ? terminal.getBoundingClientRect()
      : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };

    const minX = bounds.left;
    const minY = bounds.top;
    const maxX = bounds.right - panelWidth;
    const maxY = bounds.bottom - panelHeight;

    this.panel.style.left = `${Math.max(minX, Math.min(x, maxX))}px`;
    this.panel.style.top = `${Math.max(minY, Math.min(y, maxY))}px`;
    this.panel.style.right = 'auto';
    this.panel.style.bottom = 'auto';
  }
}

export default DebugPanel;
