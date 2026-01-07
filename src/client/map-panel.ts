/**
 * MapPanel - Draggable floating map panel component.
 *
 * Provides a floating panel with an interactive map that shows explored rooms.
 * Can be dragged to reposition, and position is saved to localStorage.
 */

import { MapRenderer, MapMessage, MapAreaChangeMessage, MapMoveMessage } from './map-renderer.js';

const STORAGE_KEY = 'mudforge-map-position';

interface Position {
  x: number;
  y: number;
}

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

  // Drag state
  private isDragging: boolean = false;
  private dragOffset: Position = { x: 0, y: 0 };

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
        <button class="map-btn map-btn-toggle" title="Toggle map">_</button>
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

    // Restore saved position
    this.restorePosition();

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

    // Room click handler
    this.content.addEventListener('click', (event) => {
      const room = this.renderer.getRoomAtPosition(event as MouseEvent);
      if (room && this.options.onRoomClick) {
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

    // Drag handlers on header
    this.header.addEventListener('mousedown', this.onDragStart.bind(this));
    this.header.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });

    // Global mouse/touch move and up handlers
    document.addEventListener('mousemove', this.onDragMove.bind(this));
    document.addEventListener('mouseup', this.onDragEnd.bind(this));
    document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.onDragEnd.bind(this));
  }

  /**
   * Handle drag start.
   */
  private onDragStart(e: MouseEvent): void {
    // Ignore if clicking on buttons
    if ((e.target as HTMLElement).closest('.map-btn')) {
      return;
    }

    this.isDragging = true;
    this.panel.classList.add('dragging');

    const rect = this.container.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    e.preventDefault();
  }

  /**
   * Handle touch start.
   */
  private onTouchStart(e: TouchEvent): void {
    if ((e.target as HTMLElement).closest('.map-btn')) {
      return;
    }

    if (e.touches.length === 1) {
      this.isDragging = true;
      this.panel.classList.add('dragging');

      const touch = e.touches[0];
      const rect = this.container.getBoundingClientRect();
      this.dragOffset = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };

      e.preventDefault();
    }
  }

  /**
   * Handle drag move.
   */
  private onDragMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const parent = this.container.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const panelRect = this.container.getBoundingClientRect();

    let newX = e.clientX - parentRect.left - this.dragOffset.x;
    let newY = e.clientY - parentRect.top - this.dragOffset.y;

    // Clamp to parent bounds
    newX = Math.max(0, Math.min(newX, parentRect.width - panelRect.width));
    newY = Math.max(0, Math.min(newY, parentRect.height - panelRect.height));

    this.setPosition(newX, newY);
  }

  /**
   * Handle touch move.
   */
  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const parent = this.container.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const panelRect = this.container.getBoundingClientRect();

    let newX = touch.clientX - parentRect.left - this.dragOffset.x;
    let newY = touch.clientY - parentRect.top - this.dragOffset.y;

    // Clamp to parent bounds
    newX = Math.max(0, Math.min(newX, parentRect.width - panelRect.width));
    newY = Math.max(0, Math.min(newY, parentRect.height - panelRect.height));

    this.setPosition(newX, newY);
    e.preventDefault();
  }

  /**
   * Handle drag end.
   */
  private onDragEnd(): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.panel.classList.remove('dragging');
    this.savePosition();
  }

  /**
   * Set panel position.
   */
  private setPosition(x: number, y: number): void {
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
    this.container.style.right = 'auto';
    this.container.style.bottom = 'auto';
  }

  /**
   * Save position to localStorage.
   */
  private savePosition(): void {
    try {
      const position: Position = {
        x: parseInt(this.container.style.left) || 0,
        y: parseInt(this.container.style.top) || 0,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Restore position from localStorage.
   */
  private restorePosition(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const position: Position = JSON.parse(saved);
        // Defer to allow container to be positioned
        requestAnimationFrame(() => {
          const parent = this.container.parentElement;
          if (parent) {
            const parentRect = parent.getBoundingClientRect();
            const panelRect = this.container.getBoundingClientRect();

            // Validate position is still within bounds
            const x = Math.max(0, Math.min(position.x, parentRect.width - panelRect.width));
            const y = Math.max(0, Math.min(position.y, parentRect.height - panelRect.height));

            this.setPosition(x, y);
          }
        });
      }
    } catch {
      // Ignore storage errors
    }
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
