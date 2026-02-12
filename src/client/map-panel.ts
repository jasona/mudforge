/**
 * MapPanel - Docked map panel component.
 *
 * Provides a panel with an interactive map that shows explored rooms.
 * Docked in the right sidebar.
 */

import { MapRenderer, MapMessage, MapAreaChangeMessage, MapMoveMessage } from './map-renderer.js';
import { BiomeCanvasRenderer } from './biome-canvas-renderer.js';

/**
 * Event handler for room click.
 */
export type RoomClickHandler = (roomPath: string) => void;

/**
 * Map panel options.
 */
export interface MapPanelOptions {
  onRoomClick?: RoomClickHandler;
  onWorldMapClick?: () => void;
}

/**
 * MapPanel class.
 */
export class MapPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private header: HTMLElement;
  private content: HTMLElement;
  private legend: HTMLElement;
  private renderer: MapRenderer | BiomeCanvasRenderer;
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
        <button class="map-btn map-btn-world" title="World Map">W</button>
        <button class="map-btn map-btn-zoom-out" title="Zoom out">-</button>
        <span class="map-zoom-level">3</span>
        <button class="map-btn map-btn-zoom-in" title="Zoom in">+</button>
        <button class="map-btn map-btn-toggle" title="Toggle map">_</button>
      </div>
    `;

    // Content area for map
    this.content = document.createElement('div');
    this.content.className = 'map-panel-content';

    // Legend (shown at bottom, dynamically updated)
    this.legend = document.createElement('div');
    this.legend.className = 'map-panel-legend';
    this.legend.innerHTML = `<div class="map-legend-item"><span class="map-legend-marker player">@</span> You</div>`;

    // Assemble panel
    this.panel.appendChild(this.header);
    this.panel.appendChild(this.content);
    this.panel.appendChild(this.legend);
    this.container.appendChild(this.panel);

    // Create renderer
    this.renderer = new BiomeCanvasRenderer(this.content);

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
    const worldBtn = this.header.querySelector('.map-btn-world');

    zoomIn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.zoomIn();
    });
    zoomOut?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.zoomOut();
    });
    toggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    worldBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.options.onWorldMapClick) {
        this.options.onWorldMapClick();
      }
    });

    // Room click handler
    this.content.addEventListener('click', (event) => {
      const room = this.renderer.getRoomAtPosition(event as MouseEvent);
      if (room && this.options.onRoomClick && 'path' in room) {
        this.options.onRoomClick(room.path);
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
   * Handle incoming map message.
   */
  handleMessage(message: MapMessage): void {
    switch (message.type) {
      case 'biome_area':
        if (this.renderer instanceof BiomeCanvasRenderer) {
          this.renderer.handleBiomeArea(message);
          this.updateTitle();
        }
        break;
      case 'biome_world':
        // World biome data is rendered in the modal.
        break;
      case 'biome_view':
        if (this.renderer instanceof BiomeCanvasRenderer) {
          this.renderer.handleBiomeView(message);
          this.updateZoomDisplay();
        }
        break;
      case 'area_change':
        if (this.renderer instanceof MapRenderer) {
          this.renderer.handleAreaChange(message as MapAreaChangeMessage);
          this.updateTitle();
        } else {
          // Lazy fallback to legacy renderer when server sends legacy payload.
          this.content.innerHTML = '';
          this.renderer = new MapRenderer(this.content);
          this.renderer.handleAreaChange(message as MapAreaChangeMessage);
          this.updateTitle();
        }
        break;
      case 'move':
        if (this.renderer instanceof MapRenderer) {
          this.renderer.handleMove(message as MapMoveMessage);
        }
        break;
      case 'zoom':
        if (this.renderer instanceof MapRenderer) {
          this.renderer.handleZoom(message);
          this.updateZoomDisplay();
        }
        break;
      case 'reveal':
        if (this.renderer instanceof MapRenderer) {
          this.renderer.handleReveal(message);
        }
        break;
    }
    this.updateLegend();
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
   * Update the legend with terrain types visible on the current Z level.
   */
  private updateLegend(): void {
    const terrains = this.renderer.getVisibleTerrains();
    const maxItems = 8;
    const visible = terrains.slice(0, maxItems);
    const hiddenCount = Math.max(0, terrains.length - visible.length);
    let html = '<div class="map-legend-item"><span class="map-legend-marker player">@</span> You</div>';
    for (const entry of visible) {
      html += `<div class="map-legend-item"><span class="map-legend-swatch" style="background-color:${entry.color}"></span><span class="map-legend-label">${entry.label}</span></div>`;
    }
    if (hiddenCount > 0) {
      html += `<div class="map-legend-item map-legend-more">+${hiddenCount} more</div>`;
    }
    this.legend.innerHTML = html;
  }

  /**
   * Zoom in.
   */
  zoomIn(): void {
    this.renderer.setZoom(this.renderer.getZoom() + 1);
    this.updateZoomDisplay();
    this.updateLegend();
  }

  /**
   * Zoom out.
   */
  zoomOut(): void {
    this.renderer.setZoom(this.renderer.getZoom() - 1);
    this.updateZoomDisplay();
    this.updateLegend();
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
