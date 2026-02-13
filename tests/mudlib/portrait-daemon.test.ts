import { describe, it, expect, vi } from 'vitest';
import { PortraitDaemon } from '../../mudlib/daemons/portrait.js';
import { MudObject } from '../../mudlib/std/object.js';
import type { Living } from '../../mudlib/std/living.js';

function makeChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); // CRC is not validated by stripPngAncillaryChunks
  return Buffer.concat([length, typeBuf, data, crc]);
}

function makePngBase64WithAncillaryChunk(): string {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = makeChunk('IHDR', Buffer.alloc(13));
  const text = makeChunk('tEXt', Buffer.from('Comment\0mudforge', 'ascii')); // ancillary chunk
  const idat = makeChunk('IDAT', Buffer.from([0x78, 0x9c, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01]));
  const iend = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, text, idat, iend]).toString('base64');
}

describe('PortraitDaemon image normalization', () => {
  it('normalizes PNG data URIs by stripping ancillary chunks', () => {
    const daemon = new PortraitDaemon();
    const originalBase64 = makePngBase64WithAncillaryChunk();
    const dataUri = `data:image/png;base64,${originalBase64}`;

    const normalized = daemon.normalizeDataUri(dataUri);

    expect(normalized.startsWith('data:image/png;base64,')).toBe(true);
    expect(normalized.length).toBeLessThan(dataUri.length);
  });

  it('returns normalized bytes on first NPC portrait generation send', async () => {
    const daemon = new PortraitDaemon();
    const daemonAny = daemon as unknown as {
      callAiImageGeneration: (prompt: string) => Promise<{ imageBase64: string; mimeType: string } | null>;
      saveToDisk: (cacheKey: string, portrait: unknown) => Promise<void>;
      generateNpcPortrait: (npc: Living, cacheKey: string) => Promise<string>;
      _cache: Map<string, { image: string; mimeType: string; generatedAt: number }>;
    };

    const originalBase64 = makePngBase64WithAncillaryChunk();
    daemonAny.callAiImageGeneration = vi.fn().mockResolvedValue({
      imageBase64: originalBase64,
      mimeType: 'image/png',
    });
    daemonAny.saveToDisk = vi.fn().mockResolvedValue(undefined);

    const result = await daemonAny.generateNpcPortrait({ longDesc: 'orc raider', shortDesc: 'orc' } as Living, 'npc-key');
    const expected = daemon.normalizeDataUri(`data:image/png;base64,${originalBase64}`);

    expect(result).toBe(expected);
    expect(daemonAny._cache.get('npc-key')?.image).toBe(expected.split(',')[1]);
  });

  it('returns normalized bytes on first object image generation send', async () => {
    const daemon = new PortraitDaemon();
    const daemonAny = daemon as unknown as {
      callAiImageGeneration: (prompt: string) => Promise<{ imageBase64: string; mimeType: string } | null>;
      saveObjectToDisk: (cacheKey: string, type: string, portrait: unknown) => Promise<void>;
      generateObjectImage: (obj: MudObject, type: string, cacheKey: string, extra?: Record<string, unknown>) => Promise<string>;
      _cache: Map<string, { image: string; mimeType: string; generatedAt: number }>;
    };

    const originalBase64 = makePngBase64WithAncillaryChunk();
    daemonAny.callAiImageGeneration = vi.fn().mockResolvedValue({
      imageBase64: originalBase64,
      mimeType: 'image/png',
    });
    daemonAny.saveObjectToDisk = vi.fn().mockResolvedValue(undefined);

    const obj = new MudObject();
    obj.shortDesc = 'an old sword';
    obj.longDesc = 'An old sword with chipped edges.';
    const result = await daemonAny.generateObjectImage(obj, 'weapon', 'obj-key', { damageType: 'slashing' });
    const expected = daemon.normalizeDataUri(`data:image/png;base64,${originalBase64}`);

    expect(result).toBe(expected);
    expect(daemonAny._cache.get('obj-key')?.image).toBe(expected.split(',')[1]);
  });
});

