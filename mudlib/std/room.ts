/**
 * Room - Base class for all room objects.
 *
 * Rooms are locations in the MUD that can contain players, NPCs, and items.
 * They have exits that connect to other rooms.
 */

import { MudObject } from './object.js';
import { reflowText } from '../lib/colors.js';
import { Container } from './container.js';

// Efuns are injected by the driver at runtime
declare const efuns: {
  findObject(pathOrId: string): MudObject | undefined;
  send(target: MudObject, message: string): void;
};

/**
 * Exit definition.
 */
export interface Exit {
  /** Direction name (e.g., "north", "up", "enter") */
  direction: string;
  /** Destination room path or room object */
  destination: string | MudObject;
  /** Optional description for the exit */
  description?: string;
  /** Optional function to check if exit is available */
  canPass?: (who: MudObject) => boolean | Promise<boolean>;
}

/**
 * Options for broadcasting messages.
 */
export interface BroadcastOptions {
  /** Objects to exclude from receiving the message */
  exclude?: MudObject[];
  /** Only send to objects matching this filter */
  filter?: (obj: MudObject) => boolean;
}

/**
 * Base class for rooms.
 */
export class Room extends MudObject {
  private _exits: Map<string, Exit> = new Map();
  private _items: string[] = [];
  private _resetMessage: string = '';

  constructor() {
    super();
    this.shortDesc = 'A room';
    this.longDesc = 'You are in a nondescript room.';
  }

  // ========== Exits ==========

  /**
   * Add an exit to this room.
   * @param direction The direction name
   * @param destination The destination room path or room object
   * @param description Optional exit description
   */
  addExit(direction: string, destination: string | MudObject, description?: string): void {
    this._exits.set(direction.toLowerCase(), {
      direction: direction.toLowerCase(),
      destination,
      description,
    });
  }

  /**
   * Add an exit with a condition check.
   * @param direction The direction name
   * @param destination The destination room path or room object
   * @param canPass Function to check if exit is passable
   * @param description Optional exit description
   */
  addConditionalExit(
    direction: string,
    destination: string | MudObject,
    canPass: (who: MudObject) => boolean | Promise<boolean>,
    description?: string
  ): void {
    this._exits.set(direction.toLowerCase(), {
      direction: direction.toLowerCase(),
      destination,
      description,
      canPass,
    });
  }

  /**
   * Remove an exit from this room.
   * @param direction The direction to remove
   */
  removeExit(direction: string): void {
    this._exits.delete(direction.toLowerCase());
  }

  /**
   * Get an exit by direction.
   * @param direction The direction to look up
   */
  getExit(direction: string): Exit | undefined {
    return this._exits.get(direction.toLowerCase());
  }

  /**
   * Get all exits from this room.
   */
  getExits(): Exit[] {
    return Array.from(this._exits.values());
  }

  /**
   * Get exit directions as a list.
   */
  getExitDirections(): string[] {
    return Array.from(this._exits.keys());
  }

  /**
   * Resolve an exit destination to a room object.
   * @param exit The exit to resolve
   */
  resolveExit(exit: Exit): MudObject | undefined {
    if (typeof exit.destination === 'string') {
      if (typeof efuns !== 'undefined') {
        return efuns.findObject(exit.destination);
      }
      return undefined;
    }
    return exit.destination;
  }

  // ========== Broadcasting ==========

  /**
   * Send a message to all objects in this room.
   * @param message The message to send
   * @param options Broadcast options
   */
  broadcast(message: string, options: BroadcastOptions = {}): void {
    const { exclude = [], filter } = options;
    const excludeSet = new Set(exclude);

    for (const obj of this.inventory) {
      if (excludeSet.has(obj)) {
        continue;
      }

      if (filter && !filter(obj)) {
        continue;
      }

      // Check if object has a receive method
      const receiver = obj as MudObject & { receive?: (msg: string) => void };
      if (typeof receiver.receive === 'function') {
        receiver.receive(message);
      } else if (typeof efuns !== 'undefined') {
        efuns.send(obj, message);
      }
    }
  }

  // ========== Lifecycle Hooks ==========

  /**
   * Called when an object enters this room.
   * Override this to react to arrivals.
   * @param obj The entering object
   * @param from The room they came from (if any)
   */
  onEnter(obj: MudObject, from?: MudObject): void | Promise<void> {
    // Default: do nothing
  }

  /**
   * Called when an object leaves this room.
   * Override this to react to departures.
   * @param obj The leaving object
   * @param to The destination (if known)
   */
  onLeave(obj: MudObject, to?: MudObject): void | Promise<void> {
    // Default: do nothing
  }

  // ========== Reset ==========

  /**
   * Set items to clone on reset.
   * @param itemPaths Array of item paths to clone
   */
  setItems(itemPaths: string[]): void {
    this._items = [...itemPaths];
  }

  /**
   * Get the list of item paths to clone on reset.
   */
  getItems(): string[] {
    return [...this._items];
  }

  /**
   * Set a message to display when the room resets.
   * @param message The reset message
   */
  setResetMessage(message: string): void {
    this._resetMessage = message;
  }

  /**
   * Called when the room should reset.
   * Override or extend this for custom reset behavior.
   */
  async onReset(): Promise<void> {
    // Broadcast reset message if set
    if (this._resetMessage) {
      this.broadcast(this._resetMessage);
    }

    // Clone items (would need efuns.cloneObject to actually work)
    // This is a placeholder for the actual implementation
  }

  // ========== Description ==========

  /**
   * Get the full room description including exits and contents.
   */
  getFullDescription(): string {
    const lines: string[] = [];

    // Room description - reflow to remove manual line breaks
    // This allows screenWidth config to wrap properly
    lines.push(reflowText(this.longDesc));
    lines.push('');

    // Exits
    const exitDirs = this.getExitDirections();
    if (exitDirs.length > 0) {
      lines.push(`Obvious exits: ${exitDirs.join(', ')}`);
    } else {
      lines.push('There are no obvious exits.');
    }

    // Contents (excluding hidden items, etc.)
    const visibleContents = this.inventory.filter((obj) => {
      // Could add visibility checks here
      return true;
    });

    if (visibleContents.length > 0) {
      lines.push('');
      for (const obj of visibleContents) {
        let desc = obj.shortDesc;
        // Add open/closed indicator for containers
        if (obj instanceof Container) {
          desc += obj.isOpen ? ' {dim}(open){/}' : ' {dim}(closed){/}';
        }
        lines.push(`  ${desc}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Look at the room (sends description to the viewer).
   * @param viewer The object looking at the room
   */
  look(viewer: MudObject): void {
    const receiver = viewer as MudObject & { receive?: (msg: string) => void };
    const desc = this.getFullDescription();

    if (typeof receiver.receive === 'function') {
      receiver.receive(`${this.shortDesc}\n\n${desc}`);
    } else if (typeof efuns !== 'undefined') {
      efuns.send(viewer, `${this.shortDesc}\n\n${desc}`);
    }
  }

  /**
   * Quick glance at the room (brief mode - just name and exits).
   * Used when brief mode is enabled.
   * @param viewer The object glancing at the room
   */
  glance(viewer: MudObject): void {
    const receiver = viewer as MudObject & { receive?: (msg: string) => void };
    const exitDirs = this.getExitDirections();
    const exitsStr = exitDirs.length > 0 ? ` {dim}[${exitDirs.join(', ')}]{/}` : '';
    const message = `{bold}${this.shortDesc}{/}${exitsStr}\n`;

    if (typeof receiver.receive === 'function') {
      receiver.receive(message);
    } else if (typeof efuns !== 'undefined') {
      efuns.send(viewer, message);
    }
  }
}

export default Room;
