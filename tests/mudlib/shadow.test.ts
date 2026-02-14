import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Shadow } from '../../mudlib/std/shadow.js';
import { MudObject } from '../../mudlib/std/object.js';
import { WerewolfShadow } from '../../mudlib/std/guild/shadows/werewolf-shadow.js';

// Mock efuns for testing
const mockEfuns = {
  getOriginalObject: vi.fn((obj: MudObject) => obj),
  removeShadow: vi.fn().mockResolvedValue(true),
  callOut: vi.fn().mockReturnValue(1),
  removeCallOut: vi.fn().mockReturnValue(true),
};

// Set up global efuns mock
(globalThis as unknown as { efuns: typeof mockEfuns }).efuns = mockEfuns;

// Test fixture: Simple MudObject
class TestLiving extends MudObject {
  private _name: string = 'TestPlayer';
  private statModifiers: Map<string, number> = new Map();
  private messages: string[] = [];

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  addStatModifier(stat: string, value: number): void {
    const current = this.statModifiers.get(stat) || 0;
    this.statModifiers.set(stat, current + value);
  }

  getStatModifier(stat: string): number {
    return this.statModifiers.get(stat) || 0;
  }

  receive(message: string): void {
    this.messages.push(message);
  }

  getMessages(): string[] {
    return this.messages;
  }

  clearMessages(): void {
    this.messages = [];
  }
}

describe('Shadow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should set shadowType', () => {
      const shadow = new Shadow('test_type');
      expect(shadow.shadowType).toBe('test_type');
    });

    it('should generate unique shadowId', () => {
      const shadow1 = new Shadow('test');
      const shadow2 = new Shadow('test');
      expect(shadow1.shadowId).not.toBe(shadow2.shadowId);
    });

    it('should include shadowType in shadowId', () => {
      const shadow = new Shadow('werewolf');
      expect(shadow.shadowId).toContain('werewolf');
    });

    it('should default priority to 0', () => {
      const shadow = new Shadow('test');
      expect(shadow.priority).toBe(0);
    });

    it('should default isActive to true', () => {
      const shadow = new Shadow('test');
      expect(shadow.isActive).toBe(true);
    });

    it('should default target to null', () => {
      const shadow = new Shadow('test');
      expect(shadow.target).toBeNull();
    });
  });

  describe('disable/enable', () => {
    it('should disable shadow', () => {
      const shadow = new Shadow('test');
      shadow.disable();
      expect(shadow.isActive).toBe(false);
    });

    it('should enable shadow', () => {
      const shadow = new Shadow('test');
      shadow.disable();
      shadow.enable();
      expect(shadow.isActive).toBe(true);
    });
  });

  describe('remove', () => {
    it('should return false if no target', async () => {
      const shadow = new Shadow('test');
      const result = await shadow.remove();
      expect(result).toBe(false);
    });

    it('should call efuns.removeShadow if target exists', async () => {
      const shadow = new Shadow('test');
      const target = new TestLiving();
      shadow.target = target;

      await shadow.remove();

      expect(mockEfuns.removeShadow).toHaveBeenCalledWith(target, shadow);
    });
  });

  describe('onAttach/onDetach', () => {
    it('should have default onAttach that does nothing', async () => {
      const shadow = new Shadow('test');
      const target = new TestLiving();
      // Should not throw
      await shadow.onAttach(target);
    });

    it('should have default onDetach that does nothing', async () => {
      const shadow = new Shadow('test');
      const target = new TestLiving();
      // Should not throw
      await shadow.onDetach(target);
    });
  });
});

describe('WerewolfShadow', () => {
  let shadow: WerewolfShadow;
  let target: TestLiving;

  beforeEach(() => {
    vi.clearAllMocks();
    shadow = new WerewolfShadow(60000);
    target = new TestLiving();
    target._initIdentity('/test/player', '/test/player#1', true);
  });

  describe('constructor', () => {
    it('should set shadowType to werewolf_form', () => {
      expect(shadow.shadowType).toBe('werewolf_form');
    });

    it('should set priority to 100', () => {
      expect(shadow.priority).toBe(100);
    });

    it('should accept duration parameter', () => {
      const shadow30s = new WerewolfShadow(30000);
      expect(shadow30s.isIndefinite()).toBe(false);
    });

    it('should support indefinite duration (0)', () => {
      const indefiniteShadow = new WerewolfShadow(0);
      expect(indefiniteShadow.isIndefinite()).toBe(true);
    });
  });

  describe('shadowed properties', () => {
    beforeEach(() => {
      shadow.target = target;
    });

    it('should override name with werewolf suffix', () => {
      // Mock getOriginalObject to return the target's private _name
      mockEfuns.getOriginalObject.mockImplementation((_obj) => {
        return { _name: 'TestPlayer' };
      });

      expect(shadow.name).toBe('TestPlayer the Werewolf');
    });

    it('should override shortDesc', () => {
      expect(shadow.shortDesc).toBe('a fearsome werewolf');
    });

    it('should override longDesc with werewolf description', () => {
      mockEfuns.getOriginalObject.mockImplementation((_obj) => {
        return { _name: 'TestPlayer' };
      });

      const longDesc = shadow.longDesc;
      expect(longDesc).toContain('TestPlayer');
      expect(longDesc).toContain('werewolf');
      expect(longDesc).toContain('fangs');
    });

    it('should override exitMessage', () => {
      expect(shadow.exitMessage).toContain('prowls');
      expect(shadow.exitMessage).toContain('claws');
    });

    it('should override enterMessage', () => {
      expect(shadow.enterMessage).toContain('werewolf');
      expect(shadow.enterMessage).toContain('prowls');
    });

    it('should override getDisplayName', () => {
      mockEfuns.getOriginalObject.mockImplementation((_obj) => {
        return { _name: 'TestPlayer' };
      });

      expect(shadow.getDisplayName()).toBe('TestPlayer the Werewolf');
    });
  });

  describe('onAttach', () => {
    it('should add stat modifiers', async () => {
      await shadow.onAttach(target);

      expect(target.getStatModifier('strength')).toBe(5);
      expect(target.getStatModifier('dexterity')).toBe(3);
    });

    it('should send transformation message to target', async () => {
      await shadow.onAttach(target);

      const messages = target.getMessages();
      expect(messages.some((m) => m.includes('beast within awakens'))).toBe(true);
    });

    it('should schedule auto-expiration for timed transformations', async () => {
      await shadow.onAttach(target);

      expect(mockEfuns.callOut).toHaveBeenCalled();
    });

    it('should not schedule expiration for indefinite transformations', async () => {
      const indefiniteShadow = new WerewolfShadow(0);
      await indefiniteShadow.onAttach(target);

      expect(mockEfuns.callOut).not.toHaveBeenCalled();
    });
  });

  describe('onDetach', () => {
    beforeEach(async () => {
      // Attach first
      await shadow.onAttach(target);
      target.clearMessages();
    });

    it('should remove stat modifiers', async () => {
      await shadow.onDetach(target);

      expect(target.getStatModifier('strength')).toBe(0);
      expect(target.getStatModifier('dexterity')).toBe(0);
    });

    it('should send reversion message to target', async () => {
      await shadow.onDetach(target);

      const messages = target.getMessages();
      expect(messages.some((m) => m.includes('beast within recedes'))).toBe(true);
    });

    it('should cancel auto-expiration timer', async () => {
      await shadow.onDetach(target);

      expect(mockEfuns.removeCallOut).toHaveBeenCalled();
    });
  });

  describe('getRemainingDuration', () => {
    it('should return 0 for indefinite shadows', () => {
      const indefiniteShadow = new WerewolfShadow(0);
      expect(indefiniteShadow.getRemainingDuration()).toBe(0);
    });

    it('should return positive value for active timed shadows', () => {
      // Create shadow with 60s duration
      const timedShadow = new WerewolfShadow(60000);
      const remaining = timedShadow.getRemainingDuration();

      // Should be close to 60000ms (allow some time for test execution)
      expect(remaining).toBeGreaterThan(59000);
      expect(remaining).toBeLessThanOrEqual(60000);
    });

    it('should decrease over time', async () => {
      const timedShadow = new WerewolfShadow(60000);
      const initial = timedShadow.getRemainingDuration();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      const later = timedShadow.getRemainingDuration();
      expect(later).toBeLessThan(initial);
    });
  });

  describe('isIndefinite', () => {
    it('should return true for 0 duration', () => {
      const shadow = new WerewolfShadow(0);
      expect(shadow.isIndefinite()).toBe(true);
    });

    it('should return false for positive duration', () => {
      const shadow = new WerewolfShadow(60000);
      expect(shadow.isIndefinite()).toBe(false);
    });
  });
});

describe('Shadow inheritance', () => {
  it('should allow custom shadows to extend Shadow class', () => {
    class CustomShadow extends Shadow {
      customProperty: string = 'custom';

      constructor() {
        super('custom_type');
        this.priority = 50;
      }

      get name(): string {
        return 'CustomName';
      }
    }

    const shadow = new CustomShadow();
    expect(shadow.shadowType).toBe('custom_type');
    expect(shadow.priority).toBe(50);
    expect(shadow.customProperty).toBe('custom');
    expect(shadow.name).toBe('CustomName');
  });

  it('should allow overriding lifecycle hooks', async () => {
    let attachCalled = false;
    let detachCalled = false;

    class HookShadow extends Shadow {
      constructor() {
        super('hook_test');
      }

      override async onAttach(_target: MudObject): Promise<void> {
        attachCalled = true;
      }

      override async onDetach(_target: MudObject): Promise<void> {
        detachCalled = true;
      }
    }

    const shadow = new HookShadow();
    const target = new TestLiving();

    await shadow.onAttach(target);
    expect(attachCalled).toBe(true);

    await shadow.onDetach(target);
    expect(detachCalled).toBe(true);
  });
});
