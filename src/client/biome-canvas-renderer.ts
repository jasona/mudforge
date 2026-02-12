import type {
  BiomeAreaDataMessage,
  BiomeTileId,
  BiomeViewMessage,
  BiomeWorldDataMessage,
} from './map-renderer.js';

interface TileStyle {
  fg: string;
  bg: string;
  glyph: string;
}

const TILE_STYLES: Record<BiomeTileId, TileStyle> = {
  void: { fg: '#000000', bg: '#000000', glyph: ' ' },
  water_deep: { fg: '#0a4fa6', bg: '#032457', glyph: '~' },
  water_shallow: { fg: '#1a78d0', bg: '#0d4b8d', glyph: '~' },
  coast: { fg: '#b6a56b', bg: '#3a3622', glyph: ':' },
  sand: { fg: '#d8c46c', bg: '#4b4323', glyph: '.' },
  grassland: { fg: '#7db332', bg: '#1c3d12', glyph: '"' },
  forest: { fg: '#48a029', bg: '#12330f', glyph: '♣' },
  dense_forest: { fg: '#2a7a1a', bg: '#0b260b', glyph: '♠' },
  hills: { fg: '#9f9a7b', bg: '#2f2d24', glyph: '^' },
  mountain: { fg: '#a8abae', bg: '#24272a', glyph: '▲' },
  snow: { fg: '#e6f2ff', bg: '#4f5e6c', glyph: '*' },
  road: { fg: '#8b7a54', bg: '#2f291b', glyph: '=' },
  town: { fg: '#cfd3d7', bg: '#4c5056', glyph: '▒' },
  dungeon: { fg: '#8f5d5d', bg: '#2d1515', glyph: '#' },
};

const ZOOM_TILE_SIZE: Record<number, number> = {
  1: 4,
  2: 6,
  3: 8,
  4: 11,
};

export interface TerrainLegendEntry {
  terrain: string;
  color: string;
  block: string;
  label: string;
}

export class BiomeCanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private zoomLevel = 3;
  private areaName = '';
  private width = 0;
  private height = 0;
  private tiles: BiomeTileId[] = [];
  private player = { x: 0, y: 0 };
  private poi: Array<{ x: number; y: number; icon: string; label?: string }> = [];
  private areas: Array<{ id: string; name: string; worldX: number; worldY: number }> = [];
  private worldView = false;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'map-canvas';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.imageRendering = 'pixelated';
    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create map canvas context');
    }
    this.ctx = ctx;

    const resizeObserver = new ResizeObserver(() => this.render());
    resizeObserver.observe(container);
  }

  getAreaName(): string {
    return this.areaName;
  }

  getZoom(): number {
    return this.zoomLevel;
  }

  setZoom(level: number): void {
    this.zoomLevel = Math.max(1, Math.min(4, level));
    this.render();
  }

  handleBiomeArea(message: BiomeAreaDataMessage): void {
    this.worldView = false;
    this.areaName = message.area.name;
    this.width = message.width;
    this.height = message.height;
    this.tiles = message.tiles;
    this.player = message.player;
    this.poi = message.poi || [];
    this.areas = [];
    this.render();
  }

  handleBiomeWorld(message: BiomeWorldDataMessage): void {
    this.worldView = true;
    this.areaName = 'World Map';
    this.width = message.width;
    this.height = message.height;
    this.tiles = message.tiles;
    this.player = message.player;
    this.poi = [];
    this.areas = message.areas || [];
    this.setZoom(1);
  }

  handleBiomeView(message: BiomeViewMessage): void {
    this.setZoom(message.zoom);
  }

  getVisibleTerrains(): TerrainLegendEntry[] {
    const seen = new Set<BiomeTileId>();
    const out: TerrainLegendEntry[] = [];
    for (const tile of this.tiles) {
      if (seen.has(tile)) continue;
      seen.add(tile);
      const style = TILE_STYLES[tile];
      out.push({
        terrain: tile,
        color: style.fg,
        block: style.glyph,
        label: tile.replace(/_/g, ' '),
      });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }

  getRoomAtPosition(_event: MouseEvent): null {
    return null;
  }

  render(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || this.width <= 0 || this.height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    const tileSize = this.worldView
      ? Math.max(0.25, Math.min(rect.width / this.width, rect.height / this.height))
      : (ZOOM_TILE_SIZE[this.zoomLevel] ?? 8);
    const mapW = this.width * tileSize;
    const mapH = this.height * tileSize;
    const offsetX = Math.floor((rect.width - mapW) / 2);
    const offsetY = Math.floor((rect.height - mapH) / 2);

    this.ctx.font = `${Math.max(6, tileSize - 1)}px monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        const tile = this.tiles[idx] ?? 'void';
        const style = TILE_STYLES[tile];
        const px = offsetX + x * tileSize;
        const py = offsetY + y * tileSize;

        this.ctx.fillStyle = style.bg;
        this.ctx.fillRect(px, py, tileSize, tileSize);

        this.ctx.fillStyle = '#111111';
        this.ctx.fillRect(px, py + tileSize - 1, tileSize, 1);

        if (tileSize >= 6 && style.glyph.trim()) {
          this.ctx.fillStyle = style.fg;
          this.ctx.fillText(style.glyph, px + tileSize / 2, py + tileSize / 2 + 0.5);
        }
      }
    }

    for (const marker of this.poi) {
      const px = offsetX + marker.x * tileSize + tileSize / 2;
      const py = offsetY + marker.y * tileSize + tileSize / 2;
      this.ctx.fillStyle = '#ffd54f';
      this.ctx.fillText(marker.icon, px, py);
    }

    // Player marker.
    const playerX = offsetX + this.player.x * tileSize + tileSize / 2;
    const playerY = offsetY + this.player.y * tileSize + tileSize / 2;
    this.ctx.fillStyle = '#ffffff';
    if (tileSize >= 6) {
      this.ctx.fillText('@', playerX, playerY);
    } else {
      const markerSize = Math.max(1, tileSize);
      this.ctx.fillRect(playerX - markerSize / 2, playerY - markerSize / 2, markerSize, markerSize);
    }

    if (this.zoomLevel === 1 && this.areas.length > 0) {
      this.ctx.font = '10px sans-serif';
      this.ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (const area of this.areas) {
        const x = offsetX + area.worldX * tileSize + tileSize / 2;
        const y = offsetY + area.worldY * tileSize - 8;
        this.ctx.fillText(area.name, x, y);
      }
    }
  }
}

export default BiomeCanvasRenderer;
