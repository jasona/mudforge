/**
 * Tests for shadow efuns.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';
import { BaseMudObject } from '../../../src/driver/base-object.js';
import { getRegistry } from '../../../src/driver/object-registry.js';
import { resetShadowRegistry } from '../../../src/driver/shadow-registry.js';
import type { Shadow } from '../../../src/driver/shadow-types.js';

// Helper to create and register objects with unique paths
let objectCounter = 0;
function createObject(basePath: string): BaseMudObject {
  const obj = new BaseMudObject();
  obj._setupAsBlueprint(`${basePath}_${++objectCounter}_${Date.now()}`);
  return obj;
}

// Helper to create a Shadow object from a BaseMudObject
let shadowCounter = 0;
function createShadow(basePath: string, shadowType: string = 'default'): Shadow {
  const obj = new BaseMudObject() as BaseMudObject & Shadow;
  obj._setupAsBlueprint(`${basePath}_${++shadowCounter}_${Date.now()}`);
  obj.shadowId = `shadow_${shadowCounter}_${Date.now()}`;
  obj.shadowType = shadowType;
  obj.priority = 0;
  obj.isActive = true;
  obj.target = null;
  return obj;
}

describe('Shadow Efuns', () => {
  let efunBridge: EfunBridge;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const env = await createTestEnvironment();
    efunBridge = env.efunBridge;
    cleanup = env.cleanup;
    resetShadowRegistry();
    objectCounter = 0;
  });

  afterEach(async () => {
    resetShadowRegistry();
    await cleanup();
  });

  describe('addShadow', () => {
    it('should add shadow to object', async () => {
      const target = createObject('/test/target');
      const shadow = createShadow('/shadows/test-shadow');
      getRegistry().register(target);
      getRegistry().register(shadow as unknown as BaseMudObject);

      const result = await efunBridge.addShadow(target, shadow);

      expect(result.success).toBe(true);
    });

    it('should allow adding multiple shadows', async () => {
      const target = createObject('/test/target');
      const shadow1 = createShadow('/shadows/shadow1', 'type1');
      const shadow2 = createShadow('/shadows/shadow2', 'type2');
      getRegistry().register(target);
      getRegistry().register(shadow1 as unknown as BaseMudObject);
      getRegistry().register(shadow2 as unknown as BaseMudObject);

      const result1 = await efunBridge.addShadow(target, shadow1);
      const result2 = await efunBridge.addShadow(target, shadow2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Verify both shadows are present
      const shadows = efunBridge.getShadows(target);
      expect(shadows).toHaveLength(2);
    });

    it('should reject duplicate shadowId', async () => {
      const target = createObject('/test/target');
      const shadow1 = createShadow('/shadows/shadow1');
      const shadow2 = createShadow('/shadows/shadow2');
      // Set same shadowId to test rejection
      shadow2.shadowId = shadow1.shadowId;
      getRegistry().register(target);
      getRegistry().register(shadow1 as unknown as BaseMudObject);
      getRegistry().register(shadow2 as unknown as BaseMudObject);

      await efunBridge.addShadow(target, shadow1);
      const result = await efunBridge.addShadow(target, shadow2);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('removeShadow', () => {
    it('should remove shadow from object', async () => {
      const target = createObject('/test/target');
      const shadow = createShadow('/shadows/shadow');
      getRegistry().register(target);
      getRegistry().register(shadow as unknown as BaseMudObject);

      await efunBridge.addShadow(target, shadow);
      const result = await efunBridge.removeShadow(target, shadow);

      expect(result).toBe(true);
    });

    it('should return false when shadow not found', async () => {
      const target = createObject('/test/target');
      const shadow = createShadow('/shadows/shadow');
      getRegistry().register(target);
      getRegistry().register(shadow as unknown as BaseMudObject);

      const result = await efunBridge.removeShadow(target, shadow);

      expect(result).toBe(false);
    });
  });

  describe('getShadows', () => {
    it('should return empty array when no shadows', () => {
      const target = createObject('/test/target');
      getRegistry().register(target);

      const shadows = efunBridge.getShadows(target);

      expect(shadows).toEqual([]);
    });

    it('should return all shadows', async () => {
      const target = createObject('/test/target');
      const shadow1 = createShadow('/shadows/shadow1', 'type1');
      const shadow2 = createShadow('/shadows/shadow2', 'type2');
      getRegistry().register(target);
      getRegistry().register(shadow1 as unknown as BaseMudObject);
      getRegistry().register(shadow2 as unknown as BaseMudObject);

      await efunBridge.addShadow(target, shadow1);
      await efunBridge.addShadow(target, shadow2);

      const shadows = efunBridge.getShadows(target);

      expect(shadows).toHaveLength(2);
    });
  });

  describe('hasShadows', () => {
    it('should return true when object has shadows', async () => {
      const target = createObject('/test/target');
      const shadow = createShadow('/shadows/shadow');
      getRegistry().register(target);
      getRegistry().register(shadow as unknown as BaseMudObject);

      await efunBridge.addShadow(target, shadow);

      expect(efunBridge.hasShadows(target)).toBe(true);
    });

    it('should return false when object has no shadows', () => {
      const target = createObject('/test/target');
      getRegistry().register(target);

      expect(efunBridge.hasShadows(target)).toBe(false);
    });
  });

  describe('clearShadows', () => {
    it('should remove all shadows from object', async () => {
      const target = createObject('/test/target');
      const shadow1 = createShadow('/shadows/shadow1', 'type1');
      const shadow2 = createShadow('/shadows/shadow2', 'type2');
      getRegistry().register(target);
      getRegistry().register(shadow1 as unknown as BaseMudObject);
      getRegistry().register(shadow2 as unknown as BaseMudObject);

      await efunBridge.addShadow(target, shadow1);
      await efunBridge.addShadow(target, shadow2);

      await efunBridge.clearShadows(target);

      expect(efunBridge.getShadows(target)).toEqual([]);
    });
  });

  describe('findShadow', () => {
    it('should find shadow by type', async () => {
      const target = createObject('/test/target');
      const shadow = createShadow('/shadows/test-shadow', 'buff');
      getRegistry().register(target);
      getRegistry().register(shadow as unknown as BaseMudObject);

      await efunBridge.addShadow(target, shadow);

      const found = efunBridge.findShadow(target, 'buff');
      expect(found).toBeDefined();
    });

    it('should return undefined when not found', () => {
      const target = createObject('/test/target');
      getRegistry().register(target);

      const found = efunBridge.findShadow(target, 'nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('getOriginalObject', () => {
    it('should return original unwrapped object', () => {
      const target = createObject('/test/target');
      getRegistry().register(target);

      const original = efunBridge.getOriginalObject(target);
      expect(original).toBe(target);
    });
  });

  describe('wrapShadowedObject', () => {
    it('should wrap object with shadow proxy', () => {
      const target = createObject('/test/target');
      getRegistry().register(target);

      const wrapped = efunBridge.wrapShadowedObject(target);
      expect(wrapped).toBeDefined();
    });
  });

  describe('wrapShadowedObjects', () => {
    it('should wrap array of objects', () => {
      const obj1 = createObject('/test/obj1');
      const obj2 = createObject('/test/obj2');
      getRegistry().register(obj1);
      getRegistry().register(obj2);

      const wrapped = efunBridge.wrapShadowedObjects([obj1, obj2]);

      expect(wrapped).toHaveLength(2);
    });
  });

  describe('getShadowStats', () => {
    it('should return shadow statistics', async () => {
      const target = createObject('/test/target');
      const shadow = createShadow('/shadows/shadow');
      getRegistry().register(target);
      getRegistry().register(shadow as unknown as BaseMudObject);

      await efunBridge.addShadow(target, shadow);

      const stats = efunBridge.getShadowStats();

      expect(stats).toBeDefined();
      expect(stats.totalShadows).toBeGreaterThanOrEqual(1);
      expect(stats.totalShadowedObjects).toBeGreaterThanOrEqual(1);
    });
  });
});
