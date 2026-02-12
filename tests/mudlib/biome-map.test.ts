import { describe, expect, it } from 'vitest';
import { generateBiomeTiles } from '../../mudlib/lib/biome-map.js';

describe('Biome map generation', () => {
  it('is deterministic for the same seed and anchors', () => {
    const a = generateBiomeTiles(
      { minX: -4, maxX: 4, minY: -4, maxY: 4 },
      12345,
      [{ x: 0, y: 0, terrain: 'town' }]
    );
    const b = generateBiomeTiles(
      { minX: -4, maxX: 4, minY: -4, maxY: 4 },
      12345,
      [{ x: 0, y: 0, terrain: 'town' }]
    );

    expect(a.width).toBe(b.width);
    expect(a.height).toBe(b.height);
    expect(a.tiles).toEqual(b.tiles);
  });

  it('changes layout when seed changes', () => {
    const a = generateBiomeTiles(
      { minX: -8, maxX: 8, minY: -8, maxY: 8 },
      111,
      []
    );
    const b = generateBiomeTiles(
      { minX: -8, maxX: 8, minY: -8, maxY: 8 },
      222,
      []
    );

    expect(a.tiles).not.toEqual(b.tiles);
  });

  it('respects terrain anchors in local neighborhoods', () => {
    const data = generateBiomeTiles(
      { minX: -3, maxX: 3, minY: -3, maxY: 3 },
      100,
      [{ x: 0, y: 0, terrain: 'town' }]
    );

    const centerIndex = (3 * data.width) + 3;
    expect(data.tiles[centerIndex]).toBe('town');
  });
});

