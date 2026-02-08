/**
 * WorldMapModal - Full-screen modal showing all explored areas composited.
 */

import { MapRenderer } from './map-renderer.js';
import type { MapWorldDataMessage } from './map-renderer.js';

/**
 * WorldMapModal class.
 */
export class WorldMapModal {
  private overlay: HTMLElement | null = null;
  private renderer: MapRenderer | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  /**
   * Open the world map modal with the given data.
   */
  open(message: MapWorldDataMessage): void {
    // Close any existing modal
    this.close();

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'gui-modal-overlay world-map-modal';

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'gui-modal gui-modal-fullscreen';

    // Header
    const header = document.createElement('div');
    header.className = 'gui-modal-header';
    header.innerHTML = `
      <div class="gui-modal-title-wrapper">
        <h2 class="gui-modal-title">World Map</h2>
      </div>
      <button class="gui-modal-close" title="Close">&times;</button>
    `;

    // Body
    const body = document.createElement('div');
    body.className = 'gui-modal-body';
    body.style.padding = '0';
    body.style.overflow = 'hidden';

    // Map container
    const mapContainer = document.createElement('div');
    mapContainer.style.width = '100%';
    mapContainer.style.height = '100%';
    body.appendChild(mapContainer);

    modal.appendChild(header);
    modal.appendChild(body);
    this.overlay.appendChild(modal);
    document.body.appendChild(this.overlay);

    // Create renderer
    this.renderer = new MapRenderer(mapContainer);

    // Feed world data as a synthetic area_change message
    this.renderer.handleAreaChange({
      type: 'area_change',
      area: { id: 'world', name: 'World Map' },
      rooms: message.rooms,
      current: message.currentRoom,
      zoom: 1,
    });

    // Render area labels as SVG text overlays
    this.renderAreaLabels(message, mapContainer);

    // Event handlers
    const closeBtn = header.querySelector('.gui-modal-close');
    closeBtn?.addEventListener('click', () => this.close());

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this.keyHandler);
  }

  /**
   * Render area name labels on the SVG.
   */
  private renderAreaLabels(message: MapWorldDataMessage, container: HTMLElement): void {
    const svg = container.querySelector('svg.map-svg');
    if (!svg) return;

    // Cell size at zoom 1
    const cellSize = 11;

    // Create a group for area labels (rendered on top of everything)
    const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    labelsGroup.setAttribute('class', 'world-map-area-labels');

    for (const area of message.areas) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(area.worldX * cellSize + cellSize / 2));
      text.setAttribute('y', String(area.worldY * cellSize - cellSize));
      text.setAttribute('class', 'world-map-area-label');
      text.textContent = area.name;
      labelsGroup.appendChild(text);
    }

    svg.appendChild(labelsGroup);
  }

  /**
   * Close the modal and clean up.
   */
  close(): void {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }

    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }

    this.renderer = null;
  }
}

export default WorldMapModal;
