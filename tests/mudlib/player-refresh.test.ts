import { describe, it, expect, vi } from 'vitest';
import { Player } from '../../mudlib/std/player.js';

describe('player refresh and equipment sync behavior', () => {
  it('resets image dedupe state when binding a new connection', () => {
    const player = new Player();
    const p = player as unknown as {
      _lastSentEquipmentImages: Map<string, string>;
      _pendingEquipmentImages: Map<string, { name: string; image: string; hash: string }>;
      _lastSentPortraitHash: string;
    };

    p._lastSentEquipmentImages.set('head', 'hash1');
    p._pendingEquipmentImages.set('head', { name: 'Helm', image: 'data:image/mock', hash: 'hash1' });
    p._lastSentPortraitHash = 'portrait-hash';

    player.bindConnection({ id: 'conn-test' } as unknown as import('../../src/network/connection.js').Connection);

    expect(p._lastSentEquipmentImages.size).toBe(0);
    expect(p._pendingEquipmentImages.size).toBe(0);
    expect(p._lastSentPortraitHash).toBe('');
  });

  it('does not force image resend on default full state refresh', async () => {
    const player = new Player();
    const p = player as unknown as {
      _connection: object | null;
      _lastSentEquipmentImages: Map<string, string>;
      _lastSentPortraitHash: string;
      sendStatsUpdate: (force?: boolean) => void;
      sendMapUpdate: () => Promise<void>;
    };

    p._connection = {};
    p._lastSentEquipmentImages.set('head', 'hash1');
    p._lastSentPortraitHash = 'portrait-hash';
    p.sendStatsUpdate = vi.fn();
    p.sendMapUpdate = vi.fn().mockResolvedValue(undefined);

    await player.sendFullStateRefresh();

    expect(p._lastSentEquipmentImages.get('head')).toBe('hash1');
    expect(p._lastSentPortraitHash).toBe('portrait-hash');
    expect(p.sendStatsUpdate).toHaveBeenCalledWith(true);
    expect(p.sendMapUpdate).toHaveBeenCalledTimes(1);
  });

  it('can explicitly force image resend on full state refresh', async () => {
    const player = new Player();
    const p = player as unknown as {
      _connection: object | null;
      _lastSentEquipmentImages: Map<string, string>;
      _lastSentPortraitHash: string;
      sendStatsUpdate: (force?: boolean) => void;
      sendMapUpdate: () => Promise<void>;
    };

    p._connection = {};
    p._lastSentEquipmentImages.set('head', 'hash1');
    p._lastSentPortraitHash = 'portrait-hash';
    p.sendStatsUpdate = vi.fn();
    p.sendMapUpdate = vi.fn().mockResolvedValue(undefined);

    await player.sendFullStateRefresh({ resendImages: true });

    expect(p._lastSentEquipmentImages.size).toBe(0);
    expect(p._lastSentPortraitHash).toBe('');
  });

  it('equipment change hook still forces stat/equipment refresh pipeline', () => {
    const player = new Player();
    const p = player as unknown as {
      _statsHeartbeatCount: number;
      _statsSendCount: number;
      _lastSentStats: Record<string, unknown>;
      _lastSentEquipmentImages: Map<string, string>;
      _pendingEquipmentImages: Map<string, { name: string; image: string; hash: string }>;
      onEquipmentChanged: () => void;
    };

    p._statsHeartbeatCount = 5;
    p._statsSendCount = 10;
    p._lastSentStats = { health: 10 };
    p._lastSentEquipmentImages.set('main_hand', 'oldhash');
    p._pendingEquipmentImages.set('main_hand', { name: 'Sword', image: 'img', hash: 'oldhash' });

    p.onEquipmentChanged();

    expect(p._statsHeartbeatCount).toBe(0);
    expect(p._statsSendCount).toBe(0);
    expect(p._lastSentStats).toEqual({});
    expect(p._lastSentEquipmentImages.size).toBe(0);
    expect(p._pendingEquipmentImages.size).toBe(0);
  });
});
