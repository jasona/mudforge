import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResetDaemon } from '../../mudlib/daemons/reset.js';
import { Room } from '../../mudlib/std/room.js';
import { MudObject } from '../../mudlib/std/object.js';

type MockEfuns = {
  callOut: (callback: () => void | Promise<void>, delayMs: number) => number;
  removeCallOut: (id: number) => boolean;
  destruct: (obj: MudObject) => Promise<void>;
  findObject: (pathOrId: string) => MudObject | undefined;
};

describe('ResetDaemon cleanup', () => {
  let destructMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    destructMock = vi.fn(async (_obj: MudObject) => {});

    const efuns: MockEfuns = {
      callOut: vi.fn(() => 1),
      removeCallOut: vi.fn(() => true),
      destruct: destructMock,
      findObject: vi.fn(() => undefined),
    };

    (globalThis as unknown as { efuns: MockEfuns }).efuns = efuns;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not clean docked vehicles', async () => {
    const daemon = new ResetDaemon();
    const room = new Room();

    const ferry = new MudObject() as MudObject & { isVehicle?: boolean };
    ferry.shortDesc = 'The Dawn Treader';
    ferry.isVehicle = true;
    ferry.moveTo(room);

    const droppedItem = new MudObject();
    droppedItem.shortDesc = 'a dropped apple';
    droppedItem.moveTo(room);

    const result = await daemon.resetRoom(room);
    daemon.stop();

    expect(result.itemsCleaned).toBe(1);
    expect(destructMock).toHaveBeenCalledTimes(1);
    expect(destructMock).toHaveBeenCalledWith(droppedItem);
    expect(destructMock).not.toHaveBeenCalledWith(ferry);
  });
});
