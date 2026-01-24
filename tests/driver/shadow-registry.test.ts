import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ShadowRegistry,
  getShadowRegistry,
  resetShadowRegistry,
} from '../../src/driver/shadow-registry.js';
import {
  type Shadow,
  UNSHADOWABLE_PROPERTIES,
  SHADOW_PROXY_MARKER,
  SHADOW_ORIGINAL,
} from '../../src/driver/shadow-types.js';
import { BaseMudObject } from '../../src/driver/base-object.js';

// Test fixture: Simple test object
class TestObject extends BaseMudObject {
  private _name: string = 'TestName';
  private _title: string = 'the Tester';
  value: number = 42;

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  get title(): string {
    return this._title;
  }

  set title(value: string) {
    this._title = value;
  }

  greet(): string {
    return `Hello, I am ${this._name}!`;
  }

  getFullName(): string {
    return `${this._name} ${this._title}`;
  }
}

// Test fixture: Simple shadow
class TestShadow implements Shadow {
  shadowId: string;
  shadowType: string;
  priority: number = 0;
  isActive: boolean = true;
  target: BaseMudObject | null = null;

  onAttachCalled = false;
  onDetachCalled = false;

  constructor(shadowType: string = 'test_shadow') {
    this.shadowType = shadowType;
    this.shadowId = `${shadowType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Shadow property override
  get name(): string {
    return 'ShadowedName';
  }

  // Shadow method override
  greet(): string {
    return 'Hello from shadow!';
  }

  async onAttach(target: BaseMudObject): Promise<void> {
    this.onAttachCalled = true;
  }

  async onDetach(target: BaseMudObject): Promise<void> {
    this.onDetachCalled = true;
  }
}

// Test fixture: Priority shadow
class HighPriorityShadow implements Shadow {
  shadowId: string;
  shadowType: string = 'high_priority';
  priority: number = 100;
  isActive: boolean = true;
  target: BaseMudObject | null = null;

  constructor() {
    this.shadowId = `high_${Date.now()}`;
  }

  get name(): string {
    return 'HighPriorityName';
  }
}

class LowPriorityShadow implements Shadow {
  shadowId: string;
  shadowType: string = 'low_priority';
  priority: number = 10;
  isActive: boolean = true;
  target: BaseMudObject | null = null;

  constructor() {
    this.shadowId = `low_${Date.now()}`;
  }

  get name(): string {
    return 'LowPriorityName';
  }

  get title(): string {
    return 'the Low Priority';
  }
}

describe('ShadowRegistry', () => {
  let registry: ShadowRegistry;

  beforeEach(() => {
    resetShadowRegistry();
    registry = new ShadowRegistry();
  });

  describe('addShadow', () => {
    it('should add a shadow to an object', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();

      const result = await registry.addShadow(obj, shadow);

      expect(result.success).toBe(true);
      expect(registry.hasShadows(obj.objectId)).toBe(true);
    });

    it('should set target reference on shadow', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();

      await registry.addShadow(obj, shadow);

      expect(shadow.target).toBe(obj);
    });

    it('should call onAttach hook', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();

      await registry.addShadow(obj, shadow);

      expect(shadow.onAttachCalled).toBe(true);
    });

    it('should reject duplicate shadowId', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow1 = new TestShadow();
      const shadow2 = new TestShadow();
      shadow2.shadowId = shadow1.shadowId; // Same ID

      await registry.addShadow(obj, shadow1);
      const result = await registry.addShadow(obj, shadow2);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should allow multiple different shadows', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow1 = new TestShadow('type1');
      const shadow2 = new TestShadow('type2');

      await registry.addShadow(obj, shadow1);
      await registry.addShadow(obj, shadow2);

      const shadows = registry.getShadows(obj.objectId);
      expect(shadows).toHaveLength(2);
    });

    it('should sort shadows by priority (highest first)', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const lowShadow = new LowPriorityShadow();
      const highShadow = new HighPriorityShadow();

      // Add low first, then high
      await registry.addShadow(obj, lowShadow);
      await registry.addShadow(obj, highShadow);

      const shadows = registry.getShadows(obj.objectId);
      expect(shadows[0]).toBe(highShadow);
      expect(shadows[1]).toBe(lowShadow);
    });
  });

  describe('removeShadow', () => {
    it('should remove a shadow by instance', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();

      await registry.addShadow(obj, shadow);
      const removed = await registry.removeShadow(obj, shadow);

      expect(removed).toBe(true);
      expect(registry.hasShadows(obj.objectId)).toBe(false);
    });

    it('should remove a shadow by ID', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();

      await registry.addShadow(obj, shadow);
      const removed = await registry.removeShadow(obj, shadow.shadowId);

      expect(removed).toBe(true);
      expect(registry.hasShadows(obj.objectId)).toBe(false);
    });

    it('should call onDetach hook', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();

      await registry.addShadow(obj, shadow);
      await registry.removeShadow(obj, shadow);

      expect(shadow.onDetachCalled).toBe(true);
    });

    it('should clear target reference', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();

      await registry.addShadow(obj, shadow);
      expect(shadow.target).toBe(obj);

      await registry.removeShadow(obj, shadow);
      expect(shadow.target).toBeNull();
    });

    it('should return false for non-existent shadow', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');

      const removed = await registry.removeShadow(obj, 'nonexistent_id');

      expect(removed).toBe(false);
    });
  });

  describe('getShadows', () => {
    it('should return empty array for object without shadows', () => {
      const shadows = registry.getShadows('/nonexistent');
      expect(shadows).toEqual([]);
    });

    it('should return all shadows for object', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow1 = new TestShadow('type1');
      const shadow2 = new TestShadow('type2');

      await registry.addShadow(obj, shadow1);
      await registry.addShadow(obj, shadow2);

      const shadows = registry.getShadows(obj.objectId);
      expect(shadows).toContain(shadow1);
      expect(shadows).toContain(shadow2);
    });
  });

  describe('findShadow', () => {
    it('should find shadow by type', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow('werewolf_form');

      await registry.addShadow(obj, shadow);

      const found = registry.findShadow(obj.objectId, 'werewolf_form');
      expect(found).toBe(shadow);
    });

    it('should return undefined for non-existent type', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow('werewolf_form');

      await registry.addShadow(obj, shadow);

      const found = registry.findShadow(obj.objectId, 'nonexistent_type');
      expect(found).toBeUndefined();
    });
  });

  describe('hasShadows', () => {
    it('should return false for object without shadows', () => {
      expect(registry.hasShadows('/nonexistent')).toBe(false);
    });

    it('should return true for object with shadows', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();

      await registry.addShadow(obj, shadow);

      expect(registry.hasShadows(obj.objectId)).toBe(true);
    });
  });

  describe('clearShadows', () => {
    it('should remove all shadows from object', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow1 = new TestShadow('type1');
      const shadow2 = new TestShadow('type2');

      await registry.addShadow(obj, shadow1);
      await registry.addShadow(obj, shadow2);

      await registry.clearShadows(obj);

      expect(registry.hasShadows(obj.objectId)).toBe(false);
    });

    it('should call onDetach for all shadows', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow1 = new TestShadow('type1');
      const shadow2 = new TestShadow('type2');

      await registry.addShadow(obj, shadow1);
      await registry.addShadow(obj, shadow2);

      await registry.clearShadows(obj);

      expect(shadow1.onDetachCalled).toBe(true);
      expect(shadow2.onDetachCalled).toBe(true);
    });
  });

  describe('wrapWithProxy', () => {
    it('should return original object if no shadows', () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');

      const wrapped = registry.wrapWithProxy(obj);

      expect(wrapped).toBe(obj);
    });

    it('should return proxy if object has shadows', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();

      await registry.addShadow(obj, shadow);
      const wrapped = registry.wrapWithProxy(obj);

      // Proxy should be different from original
      expect(wrapped).not.toBe(obj);
      // But should have proxy marker
      expect((wrapped as unknown as Record<symbol, boolean>)[SHADOW_PROXY_MARKER]).toBe(true);
    });

    it('should not double-wrap already wrapped objects', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();

      await registry.addShadow(obj, shadow);
      const wrapped1 = registry.wrapWithProxy(obj);
      const wrapped2 = registry.wrapWithProxy(wrapped1);

      expect(wrapped1).toBe(wrapped2);
    });

    it('should intercept shadowed properties', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();

      await registry.addShadow(obj, shadow);
      const wrapped = registry.wrapWithProxy(obj);

      expect((wrapped as TestObject).name).toBe('ShadowedName');
    });

    it('should intercept shadowed methods', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();

      await registry.addShadow(obj, shadow);
      const wrapped = registry.wrapWithProxy(obj);

      expect((wrapped as TestObject).greet()).toBe('Hello from shadow!');
    });

    it('should fall through to original for non-shadowed properties', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      obj.value = 100;
      const shadow = new TestShadow();

      await registry.addShadow(obj, shadow);
      const wrapped = registry.wrapWithProxy(obj);

      expect((wrapped as TestObject).value).toBe(100);
    });

    it('should fall through to original for non-shadowed methods', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();

      await registry.addShadow(obj, shadow);
      const wrapped = registry.wrapWithProxy(obj);

      // getFullName is not shadowed
      expect((wrapped as TestObject).getFullName()).toBe('TestName the Tester');
    });

    it('should respect shadow priority for property resolution', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const highShadow = new HighPriorityShadow();
      const lowShadow = new LowPriorityShadow();

      await registry.addShadow(obj, lowShadow);
      await registry.addShadow(obj, highShadow);
      const wrapped = registry.wrapWithProxy(obj);

      // High priority should win for 'name'
      expect((wrapped as TestObject).name).toBe('HighPriorityName');
      // Low priority provides 'title' (high doesn't have it)
      expect((wrapped as TestObject).title).toBe('the Low Priority');
    });

    it('should skip inactive shadows', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();
      shadow.isActive = false;

      await registry.addShadow(obj, shadow);
      const wrapped = registry.wrapWithProxy(obj);

      // Should get original value since shadow is inactive
      expect((wrapped as TestObject).name).toBe('TestName');
    });

    it('should allow writes to original object through proxy', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();

      await registry.addShadow(obj, shadow);
      const wrapped = registry.wrapWithProxy(obj) as TestObject;

      wrapped.value = 999;

      expect(obj.value).toBe(999);
    });
  });

  describe('getOriginal', () => {
    it('should return same object if not a proxy', () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');

      const original = registry.getOriginal(obj);

      expect(original).toBe(obj);
    });

    it('should return unwrapped object from proxy', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();

      await registry.addShadow(obj, shadow);
      const wrapped = registry.wrapWithProxy(obj);
      const original = registry.getOriginal(wrapped);

      expect(original).toBe(obj);
    });
  });

  describe('cleanupForObject', () => {
    it('should remove all shadows for destroyed object', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();

      await registry.addShadow(obj, shadow);
      await registry.cleanupForObject(obj.objectId);

      expect(registry.hasShadows(obj.objectId)).toBe(false);
    });

    it('should call onDetach for shadows during cleanup', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');
      const shadow = new TestShadow();

      await registry.addShadow(obj, shadow);
      await registry.cleanupForObject(obj.objectId);

      expect(shadow.onDetachCalled).toBe(true);
    });
  });

  describe('UNSHADOWABLE_PROPERTIES', () => {
    it('should not shadow objectId', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');

      // Create shadow that tries to override objectId
      const shadow: Shadow = {
        shadowId: 'test',
        shadowType: 'test',
        priority: 0,
        isActive: true,
        target: null,
        objectId: 'FAKE_ID', // Try to override
      };

      await registry.addShadow(obj, shadow);
      const wrapped = registry.wrapWithProxy(obj);

      expect(wrapped.objectId).toBe('/test/obj');
    });

    it('should not shadow objectPath', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');

      const shadow: Shadow = {
        shadowId: 'test',
        shadowType: 'test',
        priority: 0,
        isActive: true,
        target: null,
        objectPath: 'FAKE_PATH',
      };

      await registry.addShadow(obj, shadow);
      const wrapped = registry.wrapWithProxy(obj);

      expect(wrapped.objectPath).toBe('/test/obj');
    });

    it('should not shadow inventory', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/test/obj');

      const shadow: Shadow = {
        shadowId: 'test',
        shadowType: 'test',
        priority: 0,
        isActive: true,
        target: null,
        inventory: ['FAKE'],
      };

      await registry.addShadow(obj, shadow);
      const wrapped = registry.wrapWithProxy(obj);

      expect(wrapped.inventory).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return empty stats for empty registry', () => {
      const stats = registry.getStats();

      expect(stats.totalShadowedObjects).toBe(0);
      expect(stats.totalShadows).toBe(0);
      expect(stats.cachedProxies).toBe(0);
    });

    it('should return correct stats', async () => {
      const obj1 = new TestObject();
      obj1._setupAsBlueprint('/test/obj1');
      const obj2 = new TestObject();
      obj2._setupAsBlueprint('/test/obj2');

      await registry.addShadow(obj1, new TestShadow('type1'));
      await registry.addShadow(obj1, new TestShadow('type2'));
      await registry.addShadow(obj2, new TestShadow('type1'));

      const stats = registry.getStats();

      expect(stats.totalShadowedObjects).toBe(2);
      expect(stats.totalShadows).toBe(3);
      expect(stats.shadowsByType['type1']).toBe(2);
      expect(stats.shadowsByType['type2']).toBe(1);
    });
  });

  describe('getShadowRegistry singleton', () => {
    it('should return same instance', () => {
      resetShadowRegistry();
      const instance1 = getShadowRegistry();
      const instance2 = getShadowRegistry();

      expect(instance1).toBe(instance2);
    });
  });
});
