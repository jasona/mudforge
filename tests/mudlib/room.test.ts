import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Room } from '../../mudlib/std/room.js';
import { MudObject } from '../../mudlib/std/object.js';

describe('Room', () => {
  let room: Room;

  beforeEach(() => {
    room = new Room();
  });

  describe('basics', () => {
    it('should have default descriptions', () => {
      expect(room.shortDesc).toBe('A room');
      expect(room.longDesc).toBe('You are in a nondescript room.');
    });

    it('should allow setting descriptions', () => {
      room.shortDesc = 'A dark cave';
      room.longDesc = 'The cave is damp and cold.';

      expect(room.shortDesc).toBe('A dark cave');
      expect(room.longDesc).toBe('The cave is damp and cold.');
    });
  });

  describe('exits', () => {
    it('should add exit', () => {
      room.addExit('north', '/rooms/other');

      const exit = room.getExit('north');
      expect(exit).toBeDefined();
      expect(exit!.direction).toBe('north');
      expect(exit!.destination).toBe('/rooms/other');
    });

    it('should be case-insensitive for directions', () => {
      room.addExit('NORTH', '/rooms/other');

      expect(room.getExit('north')).toBeDefined();
      expect(room.getExit('North')).toBeDefined();
    });

    it('should remove exit', () => {
      room.addExit('north', '/rooms/other');
      room.removeExit('north');

      expect(room.getExit('north')).toBeUndefined();
    });

    it('should list all exits', () => {
      room.addExit('north', '/rooms/north');
      room.addExit('south', '/rooms/south');
      room.addExit('east', '/rooms/east');

      const exits = room.getExits();
      expect(exits).toHaveLength(3);
    });

    it('should list exit directions', () => {
      room.addExit('north', '/rooms/north');
      room.addExit('south', '/rooms/south');

      const directions = room.getExitDirections();
      expect(directions).toContain('north');
      expect(directions).toContain('south');
    });

    it('should support exit descriptions', () => {
      room.addExit('north', '/rooms/other', 'A narrow passage leads north.');

      const exit = room.getExit('north');
      expect(exit!.description).toBe('A narrow passage leads north.');
    });

    it('should support conditional exits', async () => {
      const canPass = vi.fn().mockReturnValue(true);
      room.addConditionalExit('north', '/rooms/other', canPass);

      const exit = room.getExit('north');
      expect(exit!.canPass).toBe(canPass);
    });
  });

  describe('broadcast', () => {
    it('should broadcast to all objects in room', () => {
      const obj1 = new MudObject();
      const obj2 = new MudObject();
      const receive1 = vi.fn();
      const receive2 = vi.fn();
      (obj1 as MudObject & { receive: typeof receive1 }).receive = receive1;
      (obj2 as MudObject & { receive: typeof receive2 }).receive = receive2;

      obj1.moveTo(room);
      obj2.moveTo(room);

      room.broadcast('Hello, everyone!');

      expect(receive1).toHaveBeenCalledWith('Hello, everyone!');
      expect(receive2).toHaveBeenCalledWith('Hello, everyone!');
    });

    it('should exclude specified objects', () => {
      const obj1 = new MudObject();
      const obj2 = new MudObject();
      const receive1 = vi.fn();
      const receive2 = vi.fn();
      (obj1 as MudObject & { receive: typeof receive1 }).receive = receive1;
      (obj2 as MudObject & { receive: typeof receive2 }).receive = receive2;

      obj1.moveTo(room);
      obj2.moveTo(room);

      room.broadcast('Hello!', { exclude: [obj1] });

      expect(receive1).not.toHaveBeenCalled();
      expect(receive2).toHaveBeenCalledWith('Hello!');
    });

    it('should filter objects', () => {
      const obj1 = new MudObject();
      const obj2 = new MudObject();
      obj1.setProperty('isPlayer', true);
      const receive1 = vi.fn();
      const receive2 = vi.fn();
      (obj1 as MudObject & { receive: typeof receive1 }).receive = receive1;
      (obj2 as MudObject & { receive: typeof receive2 }).receive = receive2;

      obj1.moveTo(room);
      obj2.moveTo(room);

      room.broadcast('Hello players!', {
        filter: (obj) => obj.getProperty('isPlayer') === true,
      });

      expect(receive1).toHaveBeenCalled();
      expect(receive2).not.toHaveBeenCalled();
    });
  });

  describe('items', () => {
    it('should set items for reset', () => {
      room.setItems(['/items/sword', '/items/shield']);

      expect(room.getItems()).toEqual(['/items/sword', '/items/shield']);
    });

    it('should set reset message', () => {
      room.setResetMessage('The room shimmers and resets.');

      // Just verify it doesn't throw
      expect(() => room.onReset()).not.toThrow();
    });
  });

  describe('description', () => {
    it('should include exits in full description', () => {
      room.longDesc = 'A simple room.';
      room.addExit('north', '/rooms/other');
      room.addExit('south', '/rooms/start');

      const desc = room.getFullDescription();
      expect(desc).toContain('A simple room.');
      expect(desc).toContain('north');
      expect(desc).toContain('south');
    });

    it('should say no exits when none exist', () => {
      const desc = room.getFullDescription();
      expect(desc).toContain('no obvious exits');
    });

    it('should list contents in full description', () => {
      const obj = new MudObject();
      obj.shortDesc = 'a shiny gem';
      obj.moveTo(room);

      const desc = room.getFullDescription();
      // Room descriptions capitalize first letter of items
      expect(desc).toContain('A shiny gem');
    });
  });

  describe('lifecycle hooks', () => {
    it('should have onEnter hook', async () => {
      const obj = new MudObject();
      // Should not throw
      await room.onEnter(obj);
    });

    it('should have onLeave hook', async () => {
      const obj = new MudObject();
      // Should not throw
      await room.onLeave(obj);
    });
  });
});
