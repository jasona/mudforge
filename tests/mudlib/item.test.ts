import { describe, it, expect, beforeEach } from 'vitest';
import { Item } from '../../mudlib/std/item.js';
import { Container } from '../../mudlib/std/container.js';
import { MudObject } from '../../mudlib/std/object.js';

describe('Item', () => {
  let item: Item;

  beforeEach(() => {
    item = new Item();
  });

  describe('basics', () => {
    it('should have default values', () => {
      expect(item.shortDesc).toBe('an item');
      expect(item.weight).toBe(1);
      expect(item.value).toBe(0);
      expect(item.takeable).toBe(true);
      expect(item.dropable).toBe(true);
    });

    it('should allow setting weight', () => {
      item.weight = 5;
      expect(item.weight).toBe(5);
    });

    it('should not allow negative weight', () => {
      item.weight = -5;
      expect(item.weight).toBe(0);
    });

    it('should allow setting value', () => {
      item.value = 100;
      expect(item.value).toBe(100);
    });

    it('should not allow negative value', () => {
      item.value = -50;
      expect(item.value).toBe(0);
    });
  });

  describe('take/drop', () => {
    it('should allow taking by default', async () => {
      const taker = new MudObject();
      expect(await item.onTake(taker)).toBe(true);
    });

    it('should prevent taking when not takeable', async () => {
      item.takeable = false;
      const taker = new MudObject();
      expect(await item.onTake(taker)).toBe(false);
    });

    it('should allow dropping by default', async () => {
      const dropper = new MudObject();
      expect(await item.onDrop(dropper)).toBe(true);
    });

    it('should prevent dropping when not dropable', async () => {
      item.dropable = false;
      const dropper = new MudObject();
      expect(await item.onDrop(dropper)).toBe(false);
    });
  });

  describe('setItem', () => {
    it('should configure item with setItem', () => {
      item.setItem('a golden ring', 'A beautiful golden ring.', 0.1, 500);

      expect(item.shortDesc).toBe('a golden ring');
      expect(item.longDesc).toBe('A beautiful golden ring.');
      expect(item.weight).toBe(0.1);
      expect(item.value).toBe(500);
    });
  });
});

describe('Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe('basics', () => {
    it('should have default values', () => {
      expect(container.maxItems).toBe(10);
      expect(container.maxWeight).toBe(100);
      expect(container.isOpen).toBe(true);
      expect(container.isLocked).toBe(false);
      expect(container.takeable).toBe(false); // Containers can't be picked up by default
    });

    it('should allow setting capacity', () => {
      container.maxItems = 20;
      container.maxWeight = 200;

      expect(container.maxItems).toBe(20);
      expect(container.maxWeight).toBe(200);
    });
  });

  describe('open/close/lock', () => {
    it('should close container', () => {
      container.close();
      expect(container.isOpen).toBe(false);
    });

    it('should open container', () => {
      container.close();
      container.open();
      expect(container.isOpen).toBe(true);
    });

    it('should not open locked container', () => {
      container.close();
      container.lock();
      const result = container.open();

      expect(result).toBe(false);
      expect(container.isOpen).toBe(false);
    });

    it('should lock closed container', () => {
      container.close();
      const result = container.lock();

      expect(result).toBe(true);
      expect(container.isLocked).toBe(true);
    });

    it('should not lock open container', () => {
      const result = container.lock();

      expect(result).toBe(false);
      expect(container.isLocked).toBe(false);
    });

    it('should unlock with correct key', () => {
      container.keyId = 'gold';
      container.close();
      container.lock();

      const key = new MudObject();
      key.shortDesc = 'a gold key'; // "gold" is a word in the shortDesc

      const result = container.unlock(key);

      expect(result).toBe(true);
      expect(container.isLocked).toBe(false);
    });

    it('should not unlock with wrong key', () => {
      container.keyId = 'gold';
      container.close();
      container.lock();

      const key = new MudObject();
      key.shortDesc = 'a silver key'; // "gold" is not in the shortDesc

      const result = container.unlock(key);

      expect(result).toBe(false);
      expect(container.isLocked).toBe(true);
    });
  });

  describe('canHold', () => {
    it('should accept items when open and has space', () => {
      const item = new Item();
      item.weight = 5;

      expect(container.canHold(item)).toBe(true);
    });

    it('should reject items when closed', () => {
      container.close();
      const item = new Item();

      expect(container.canHold(item)).toBe(false);
      expect(container.getCannotHoldReason(item)).toBe('The container is closed.');
    });

    it('should reject items when full', () => {
      container.maxItems = 2;

      const item1 = new Item();
      const item2 = new Item();
      const item3 = new Item();

      item1.moveTo(container);
      item2.moveTo(container);

      expect(container.canHold(item3)).toBe(false);
      expect(container.getCannotHoldReason(item3)).toBe('The container is full.');
    });

    it('should reject items exceeding weight limit', () => {
      container.maxWeight = 10;

      const item = new Item();
      item.weight = 15;

      expect(container.canHold(item)).toBe(false);
      expect(container.getCannotHoldReason(item)).toBe(
        'The container cannot hold that much weight.'
      );
    });

    it('should track current weight', () => {
      const item1 = new Item();
      const item2 = new Item();
      item1.weight = 5;
      item2.weight = 3;

      item1.moveTo(container);
      item2.moveTo(container);

      expect(container.currentWeight).toBe(8);
    });

    it('should track remaining capacity', () => {
      container.maxItems = 5;
      container.maxWeight = 50;

      const item = new Item();
      item.weight = 10;
      item.moveTo(container);

      expect(container.remainingItems).toBe(4);
      expect(container.remainingWeight).toBe(40);
    });
  });

  describe('description', () => {
    it('should show contents when open and has items', () => {
      const item = new Item();
      item.shortDesc = 'a sword';
      item.moveTo(container);

      const desc = container.getFullDescription();
      expect(desc).toContain('contains');
      expect(desc).toContain('a sword');
    });

    it('should say empty when open and no items', () => {
      const desc = container.getFullDescription();
      expect(desc).toContain('empty');
    });

    it('should say closed when not open', () => {
      container.close();
      const desc = container.getFullDescription();
      expect(desc).toContain('closed');
    });
  });

  describe('setContainer', () => {
    it('should configure container', () => {
      container.setContainer('a treasure chest', 'An ornate wooden chest.', {
        maxItems: 15,
        maxWeight: 150,
        open: false,
        locked: true,
        keyId: 'treasure_key',
      });

      expect(container.shortDesc).toBe('a treasure chest');
      expect(container.maxItems).toBe(15);
      expect(container.maxWeight).toBe(150);
      expect(container.isOpen).toBe(false);
      expect(container.isLocked).toBe(true);
      expect(container.keyId).toBe('treasure_key');
    });
  });
});
