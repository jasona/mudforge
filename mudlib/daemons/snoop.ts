/**
 * Snoop Daemon - Manages snoop sessions for builders+.
 *
 * Allows builders to observe what players/NPCs see in real-time
 * and execute commands as the target.
 *
 * Session tracking and message forwarding is handled by driver efuns.
 * This daemon handles permission checking, modal management, and command execution.
 */

import { MudObject } from '../std/object.js';
import { Living } from '../std/living.js';
import type { Player } from '../std/player.js';
import { closeSnoopModal } from '../lib/snoop-modal.js';

/**
 * Snoop session data (mudlib-side tracking for command execution).
 */
export interface SnoopSession {
  snooper: Player;
  target: Living;
  targetName: string;
  targetType: 'player' | 'npc';
  startTime: number;
}

/**
 * Result of checking snoop permission.
 */
export interface SnoopCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Snoop Daemon class.
 */
export class SnoopDaemon extends MudObject {
  /** Active sessions for command execution (mudlib-side) */
  private _sessions: Map<string, SnoopSession> = new Map();

  constructor() {
    super();
    this.shortDesc = 'Snoop Daemon';
    this.longDesc = 'The snoop daemon manages snoop sessions for builders.';
    setSnoopDaemonInstance(this);
  }

  /**
   * Check if a snooper can snoop a target.
   */
  canSnoop(snooper: Player, target: Living): SnoopCheckResult {
    const snooperLevel = snooper.permissionLevel ?? 0;

    if (snooperLevel < 1) {
      return { allowed: false, reason: 'You must be a builder to snoop.' };
    }

    if (snooper.objectId === target.objectId) {
      return { allowed: false, reason: 'Cannot snoop yourself.' };
    }

    if ('permissionLevel' in target) {
      const targetLevel = (target as Player).permissionLevel ?? 0;
      if (targetLevel >= snooperLevel) {
        return { allowed: false, reason: 'Cannot snoop someone of equal or higher rank.' };
      }
    }

    return { allowed: true };
  }

  /**
   * Start a snoop session.
   */
  startSnoop(snooper: Player, target: Living): boolean {
    const check = this.canSnoop(snooper, target);
    if (!check.allowed) {
      snooper.receive(`{red}${check.reason}{/}\n`);
      return false;
    }

    // Stop existing session if any
    if (this._sessions.has(snooper.objectId)) {
      this.stopSnoop(snooper);
    }

    // Register with driver for message forwarding
    if (typeof efuns !== 'undefined' && efuns.snoopRegister) {
      const success = efuns.snoopRegister(snooper, target);
      if (!success) {
        snooper.receive('{red}Failed to register snoop session.{/}\n');
        return false;
      }
    }

    // Store session for command execution
    const isPlayer = 'permissionLevel' in target;
    const session: SnoopSession = {
      snooper,
      target,
      targetName: target.name,
      targetType: isPlayer ? 'player' : 'npc',
      startTime: Date.now(),
    };
    this._sessions.set(snooper.objectId, session);

    return true;
  }

  /**
   * Stop a snoop session.
   */
  stopSnoop(snooper: Player): void {
    const session = this._sessions.get(snooper.objectId);
    if (!session) return;

    // Unregister from driver
    if (typeof efuns !== 'undefined' && efuns.snoopUnregister) {
      efuns.snoopUnregister(snooper);
    }

    // Remove mudlib session
    this._sessions.delete(snooper.objectId);

    // Close the modal
    try {
      closeSnoopModal(snooper);
    } catch {
      // Ignore errors
    }
  }

  /**
   * Get the session for a snooper.
   */
  getSession(snooper: Player): SnoopSession | null {
    return this._sessions.get(snooper.objectId) || null;
  }

  /**
   * Get the current snoop target for a snooper.
   */
  getSnoopTarget(snooper: Player): Living | null {
    const session = this._sessions.get(snooper.objectId);
    return session?.target || null;
  }

  /**
   * Execute a command as the target.
   */
  async executeAsTarget(snooper: Player, command: string): Promise<boolean> {
    const session = this._sessions.get(snooper.objectId);
    if (!session) {
      snooper.receive('{red}You are not snooping anyone.{/}\n');
      return false;
    }

    const target = session.target;
    if (!target) {
      snooper.receive('{red}Target is no longer valid.{/}\n');
      this.stopSnoop(snooper);
      return false;
    }

    // For players, use processInput (which forwards the command via snoopForward)
    if (session.targetType === 'player') {
      const playerTarget = target as Player;
      if ('processInput' in playerTarget && typeof playerTarget.processInput === 'function') {
        await playerTarget.processInput(command);
        return true;
      }
    }

    // For NPCs, forward the command first, then try executeCommand and command method
    if (typeof efuns !== 'undefined' && efuns.snoopForward) {
      efuns.snoopForward(target, `{dim}> ${command}{/}\n`);
    }

    // Try the command manager first (for built-in commands like look, say, go, etc.)
    if (typeof efuns !== 'undefined' && efuns.executeCommand) {
      // NPCs have no permission level, use 0
      const handled = await efuns.executeCommand(target, command, 0);
      if (handled) {
        return true;
      }
    }

    // Fall back to object actions (addAction system)
    if ('command' in target && typeof (target as Living & { command: (cmd: string) => Promise<boolean> }).command === 'function') {
      const handled = await (target as Living & { command: (cmd: string) => Promise<boolean> }).command(command);
      if (handled) {
        return true;
      }
    }

    // Command not recognized
    target.receive("What?\n");
    return false;
  }

  /**
   * Handle when a snooper disconnects.
   */
  handleSnooperDisconnect(snooper: Player): void {
    this.stopSnoop(snooper);
  }

  /**
   * Handle when a target disconnects.
   */
  handleTargetDisconnect(target: Living): void {
    // Find sessions targeting this object and clean them up
    for (const [snooperId, session] of this._sessions) {
      if (session.target.objectId === target.objectId) {
        session.snooper.receive(`\n{yellow}${session.targetName} has disconnected. Snoop session ended.{/}\n`);
        try {
          closeSnoopModal(session.snooper, 'Target disconnected');
        } catch {
          // Ignore
        }
        this._sessions.delete(snooperId);
      }
    }
  }

  /**
   * Get all active sessions (for admin info).
   */
  getAllSessions(): SnoopSession[] {
    return Array.from(this._sessions.values());
  }
}

// Singleton instance
let snoopDaemon: SnoopDaemon | null = null;

export function setSnoopDaemonInstance(instance: SnoopDaemon): void {
  snoopDaemon = instance;
}

export function getSnoopDaemon(): SnoopDaemon {
  if (!snoopDaemon) {
    snoopDaemon = new SnoopDaemon();
  }
  return snoopDaemon;
}

export function resetSnoopDaemon(): void {
  snoopDaemon = null;
}

export default SnoopDaemon;
