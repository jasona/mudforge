import type { TerrainType } from './terrain.js';
import type { BiomeTileId } from './map-types.js';

export interface BiomeAnchor {
  x: number;
  y: number;
  terrain: TerrainType;
  icon?: string;
}

export interface BiomeBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function hash2d(seed: number, x: number, y: number): number {
  let h = seed ^ (x * 374761393) ^ (y * 668265263);
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}

function smoothNoise(seed: number, x: number, y: number, scale: number): number {
  const sx = Math.floor(x / scale);
  const sy = Math.floor(y / scale);
  const fx = (x / scale) - sx;
  const fy = (y / scale) - sy;

  const n00 = hash2d(seed, sx, sy);
  const n10 = hash2d(seed, sx + 1, sy);
  const n01 = hash2d(seed, sx, sy + 1);
  const n11 = hash2d(seed, sx + 1, sy + 1);

  const wx = fx * fx * (3 - 2 * fx);
  const wy = fy * fy * (3 - 2 * fy);

  const xa = n00 * (1 - wx) + n10 * wx;
  const xb = n01 * (1 - wx) + n11 * wx;
  return xa * (1 - wy) + xb * wy;
}

function terrainToBiome(terrain: TerrainType): BiomeTileId {
  switch (terrain) {
    case 'town':
      return 'town';
    case 'road':
      return 'road';
    case 'grassland':
      return 'grassland';
    case 'forest':
      return 'forest';
    case 'dense_forest':
      return 'dense_forest';
    case 'hills':
      return 'hills';
    case 'mountain':
      return 'mountain';
    case 'water_shallow':
      return 'water_shallow';
    case 'water_deep':
    case 'river':
      return 'water_deep';
    case 'swamp':
      return 'water_shallow';
    case 'desert':
      return 'sand';
    case 'snow':
    case 'ice':
      return 'snow';
    case 'dungeon':
    case 'cave':
      return 'dungeon';
    case 'void':
      return 'void';
    default:
      return 'grassland';
  }
}

function baseBiome(seed: number, x: number, y: number): BiomeTileId {
  const elevation = (
    smoothNoise(seed + 11, x, y, 22) * 0.55 +
    smoothNoise(seed + 29, x, y, 9) * 0.30 +
    smoothNoise(seed + 53, x, y, 5) * 0.15
  );
  const moisture = (
    smoothNoise(seed + 97, x, y, 17) * 0.65 +
    smoothNoise(seed + 131, x, y, 7) * 0.35
  );

  if (elevation < 0.33) return 'water_deep';
  if (elevation < 0.40) return 'water_shallow';
  if (elevation > 0.82) return 'snow';
  if (elevation > 0.73) return 'mountain';
  if (elevation > 0.63) return 'hills';
  if (moisture > 0.72) return 'dense_forest';
  if (moisture > 0.55) return 'forest';
  if (moisture < 0.25) return 'sand';
  return 'grassland';
}

function nearestAnchorBiome(
  x: number,
  y: number,
  anchors: BiomeAnchor[],
  base: BiomeTileId,
): BiomeTileId {
  let bestDist = Number.POSITIVE_INFINITY;
  let best: BiomeTileId | null = null;

  for (const anchor of anchors) {
    const dx = anchor.x - x;
    const dy = anchor.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDist) {
      bestDist = d2;
      best = terrainToBiome(anchor.terrain);
    }
  }

  if (!best) return base;
  if (best === 'road' || best === 'town' || best === 'dungeon') {
    return bestDist <= 9 ? best : base;
  }
  if (bestDist <= 4) return best;
  if (bestDist <= 16 && base === 'grassland') return best;
  return base;
}

function isWater(tile: BiomeTileId): boolean {
  return tile === 'water_deep' || tile === 'water_shallow';
}

export function generateBiomeTiles(
  bounds: BiomeBounds,
  seed: number,
  anchors: BiomeAnchor[],
): { width: number; height: number; tiles: BiomeTileId[] } {
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const tiles: BiomeTileId[] = new Array(width * height).fill('void');

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const worldX = bounds.minX + x;
      const worldY = bounds.minY + y;
      const base = baseBiome(seed, worldX, worldY);
      const tile = nearestAnchorBiome(worldX, worldY, anchors, base);
      tiles[y * width + x] = tile;
    }
  }

  // Coastline pass.
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const current = tiles[idx];
      if (isWater(current)) continue;
      const neighbors = [
        tiles[idx - 1],
        tiles[idx + 1],
        tiles[idx - width],
        tiles[idx + width],
      ];
      if (neighbors.some(isWater)) {
        tiles[idx] = current === 'sand' ? 'sand' : 'coast';
      }
    }
  }

  return { width, height, tiles };
}

