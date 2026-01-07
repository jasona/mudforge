/**
 * MapPanel - Collapsible map panel component.
 *
 * Provides a side panel with an interactive map that shows explored rooms.
 */

import { MapRenderer, MapMessage, MapAreaChangeMessage, MapMoveMessage } from './map-renderer.js';

/**
 * Event handler for room click.
 */
export type RoomClickHandler = (roomPath: string) => void;

/**
 * Map panel options.
 */
export interface MapPanelOptions {
  onRoomClick?: RoomClickHandler;
}

/**
 * MapPanel class.
 */
export class MapPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private header: HTMLElement;
  private content: HTMLElement;
  private renderer: MapRenderer;
  private isVisible: boolean = true;
  private isCollapsed: boolean = false;
  private options: MapPanelOptions;

  constructor(containerId: string, options: MapPanelOptions = {}) {
    this.options = options;

    // Get or create container
    const existing = document.getElementById(containerId);
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }

    // Create panel structure
    this.panel = document.createElement('div');
    this.panel.className = 'map-panel';

    // Header with title and controls
    this.header = document.createElement('div');
    this.header.className = 'map-panel-header';
    this.header.innerHTML = `
      <span class="map-panel-title">Map</span>
      <div class="map-panel-controls">
        <button class="map-btn map-btn-zoom-out" title="Zoom out">-</button>
        <span class="map-zoom-level">3</span>
        <button class="map-btn map-btn-zoom-in" title="Zoom in">+</button>
        <button class="map-btn map-btn-toggle" title="Toggle map (Tab)">_</button>
      </div>
    `;

    // Content area for map
    this.content = document.createElement('div');
    this.content.className = 'map-panel-content';

    // Legend (shown at bottom)
    const legend = document.createElement('div');
    legend.className = 'map-panel-legend';
    legend.innerHTML = `
      <div class="map-legend-item"><span class="map-legend-marker player">@</span> You</div>
      <div class="map-legend-item"><span class="map-legend-marker explored">▓</span> Explored</div>
      <div class="map-legend-item"><span class="map-legend-marker revealed">▓</span> Revealed</div>
      <div class="map-legend-item"><span class="map-legend-marker hinted">?</span> Unknown</div>
    `;

    // Assemble panel
    this.panel.appendChild(this.header);
    this.panel.appendChild(this.content);
    this.panel.appendChild(legend);
    this.container.appendChild(this.panel);

    // Create renderer
    this.renderer = new MapRenderer(this.content);

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Set up event handlers.
   */
  private setupEventHandlers(): void {
    // Zoom controls
    const zoomIn = this.header.querySelector('.map-btn-zoom-in');
    const zoomOut = this.header.querySelector('.map-btn-zoom-out');
    const toggleBtn = this.header.querySelector('.map-btn-toggle');

    zoomIn?.addEventListener('click', () => this.zoomIn());
    zoomOut?.addEventListener('click', () => this.zoomOut());
    toggleBtn?.addEventListener('click', () => this.toggle());

    // Room click handler
    this.content.addEventListener('click', (event) => {
      const room = this.renderer.getRoomAtPosition(event as MouseEvent);
      if (room && this.options.onRoomClick) {
        this.options.onRoomClick(room.path);
      }
    });

    // Keyboard shortcut (Tab to toggle)
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab' && !this.isInputFocused()) {
        event.preventDefault();
        this.toggle();
      }
    });

    // Mouse wheel for zoom
    this.content.addEventListener('wheel', (event) => {
      event.preventDefault();
      if (event.deltaY < 0) {
        this.zoomIn();
      } else {
        this.zoomOut();
      }
    });
  }

  /**
   * Check if an input element is focused.
   */
  private isInputFocused(): boolean {
    const active = document.activeElement;
    return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
  }

  /**
   * Handle incoming map message.
   */
  handleMessage(message: MapMessage): void {
    switch (message.type) {
      case 'area_change':
        this.renderer.handleAreaChange(message as MapAreaChangeMessage);
        this.updateTitle();
        break;
      case 'move':
        this.renderer.handleMove(message as MapMoveMessage);
        break;
      case 'zoom':
        this.renderer.handleZoom(message);
        this.updateZoomDisplay();
        break;
      case 'reveal':
        this.renderer.handleReveal(message);
        break;
    }
  }

  /**
   * Update the title with area name.
   */
  private updateTitle(): void {
    const title = this.header.querySelector('.map-panel-title');
    const areaName = this.renderer.getAreaName();
    if (title) {
      title.textContent = areaName || 'Map';
    }
  }

  /**
   * Update zoom level display.
   */
  private updateZoomDisplay(): void {
    const display = this.header.querySelector('.map-zoom-level');
    if (display) {
      display.textContent = String(this.renderer.getZoom());
    }
  }

  /**
   * Zoom in.
   */
  zoomIn(): void {
    this.renderer.setZoom(this.renderer.getZoom() + 1);
    this.updateZoomDisplay();
  }

  /**
   * Zoom out.
   */
  zoomOut(): void {
    this.renderer.setZoom(this.renderer.getZoom() - 1);
    this.updateZoomDisplay();
  }

  /**
   * Set zoom level.
   */
  setZoom(level: number): void {
    this.renderer.setZoom(level);
    this.updateZoomDisplay();
  }

  /**
   * Toggle panel visibility.
   */
  toggle(): void {
    this.isCollapsed = !this.isCollapsed;
    this.panel.classList.toggle('collapsed', this.isCollapsed);
  }

  /**
   * Show the panel.
   */
  show(): void {
    this.isVisible = true;
    this.panel.classList.remove('hidden');
  }

  /**
   * Hide the panel.
   */
  hide(): void {
    this.isVisible = false;
    this.panel.classList.add('hidden');
  }

  /**
   * Check if panel is visible.
   */
  get visible(): boolean {
    return this.isVisible && !this.isCollapsed;
  }
}

export default MapPanel;
