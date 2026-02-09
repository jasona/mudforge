import type { MudObject } from '../std/object.js';

interface PortraitDaemonLike extends MudObject {
  cacheItemImage?(item: MudObject): Promise<void>;
}

/**
 * Best-effort item portrait caching without direct daemon import.
 * This keeps living objects decoupled from daemon module wiring.
 */
export async function cacheItemImageBestEffort(item: MudObject): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.findObject) {
    return;
  }

  const daemon = efuns.findObject('/daemons/portrait') as PortraitDaemonLike | undefined;
  if (!daemon || typeof daemon.cacheItemImage !== 'function') {
    return;
  }

  try {
    await daemon.cacheItemImage(item);

    // Push an immediate equipment update if this item is currently worn/wielded by a player.
    const maybeHolder = (item as MudObject & { environment?: MudObject | null }).environment;
    const holderWithNotify = maybeHolder as MudObject & { notifyEquipmentImageReady?: (updated: MudObject) => void };
    if (holderWithNotify && typeof holderWithNotify.notifyEquipmentImageReady === 'function') {
      holderWithNotify.notifyEquipmentImageReady(item);
    }
  } catch {
    // Image caching is optional; ignore runtime failures.
  }
}
