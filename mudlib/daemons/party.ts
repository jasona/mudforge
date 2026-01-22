/**
 * Party Daemon - Manages the party/group system.
 *
 * Provides party creation, membership management, follow mode,
 * XP sharing, and party statistics tracking.
 *
 * Usage:
 *   const daemon = getPartyDaemon();
 *   daemon.createParty(player);
 *   daemon.invitePlayer(inviter, 'playerb');
 *   daemon.awardPartyXP(partyId, 100, 'Goblin', room);
 */

import { MudObject } from '../std/object.js';
import type { Living } from '../std/living.js';
import {
  type PartyData,
  type PartyMember,
  type PartyInvite,
  type PlayerPartyData,
  type PartyOperationResult,
  PARTY_CONSTANTS,
  generatePartyId,
  createPartyMember,
  createPartyStats,
  createPlayerPartyData,
} from '../std/party/types.js';

/**
 * Player interface for party operations.
 */
interface PartyPlayer extends Living {
  name: string;
  level: number;
  receive(message: string): void;
  getProperty(key: string): unknown;
  setProperty(key: string, value: unknown): void;
  gainExperience?(xp: number): void;
  environment?: MudObject | null;
}

/**
 * Room interface for party operations.
 */
interface PartyRoom extends MudObject {
  broadcast?(message: string, options?: { exclude?: MudObject[] }): void;
}

/**
 * Party Daemon class.
 */
export class PartyDaemon extends MudObject {
  private _parties: Map<string, PartyData> = new Map();
  private _inviteCleanupInterval: ReturnType<typeof setInterval> | null = null;
  private _loaded: boolean = false;

  constructor() {
    super();
    this.shortDesc = 'Party Daemon';
    this.longDesc = 'The party daemon manages the party/group system.';

    // Start invite cleanup timer
    this.startInviteCleanup();
    this._loaded = true;
  }

  // ==================== Invite Cleanup ====================

  /**
   * Start the periodic invite cleanup.
   */
  private startInviteCleanup(): void {
    // Clean up expired invites every 10 seconds
    this._inviteCleanupInterval = setInterval(() => {
      this.cleanupExpiredInvites();
    }, 10000);
  }

  /**
   * Clean up all expired invites.
   */
  private cleanupExpiredInvites(): void {
    const now = Date.now();

    for (const [partyId, party] of this._parties) {
      const expiredInvites = party.pendingInvites.filter(
        (inv) => inv.expiresAt <= now
      );

      for (const invite of expiredInvites) {
        // Notify the invitee that the invite expired
        const invitee = this.findPlayer(invite.inviteeName);
        if (invitee) {
          invitee.receive(
            `{yellow}The party invite from ${invite.inviterName} has expired.{/}\n`
          );
          // Clear player's pending invite
          const playerData = this.getPlayerPartyData(invitee);
          if (playerData.pendingInvite?.partyId === partyId) {
            playerData.pendingInvite = null;
            this.setPlayerPartyData(invitee, playerData);
          }
        }
      }

      // Remove expired invites from party
      party.pendingInvites = party.pendingInvites.filter(
        (inv) => inv.expiresAt > now
      );
    }
  }

  // ==================== Player Data Management ====================

  /**
   * Get player's party data.
   */
  getPlayerPartyData(player: PartyPlayer): PlayerPartyData {
    const data = player.getProperty(PARTY_CONSTANTS.PLAYER_DATA_KEY) as
      | PlayerPartyData
      | undefined;
    return data || createPlayerPartyData();
  }

  /**
   * Save player's party data.
   */
  private setPlayerPartyData(player: PartyPlayer, data: PlayerPartyData): void {
    player.setProperty(PARTY_CONSTANTS.PLAYER_DATA_KEY, data);
  }

  /**
   * Find a player by name (must be online/connected).
   */
  private findPlayer(playerName: string): PartyPlayer | null {
    if (typeof efuns !== 'undefined' && efuns.findConnectedPlayer) {
      return efuns.findConnectedPlayer(playerName) as PartyPlayer | null;
    }
    return null;
  }

  // ==================== Party Queries ====================

  /**
   * Get a player's current party.
   */
  getPlayerParty(player: PartyPlayer): PartyData | null {
    const data = this.getPlayerPartyData(player);
    if (!data.partyId) return null;
    return this._parties.get(data.partyId) || null;
  }

  /**
   * Get a party by ID.
   */
  getParty(partyId: string): PartyData | null {
    return this._parties.get(partyId) || null;
  }

  /**
   * Check if a player is in a party.
   */
  isInParty(player: PartyPlayer): boolean {
    return this.getPlayerParty(player) !== null;
  }

  /**
   * Check if a player is the party leader.
   */
  isPartyLeader(player: PartyPlayer): boolean {
    const party = this.getPlayerParty(player);
    return party?.leaderName.toLowerCase() === player.name.toLowerCase();
  }

  /**
   * Get a party member entry.
   */
  private getPartyMember(party: PartyData, playerName: string): PartyMember | null {
    return (
      party.members.find(
        (m) => m.playerName.toLowerCase() === playerName.toLowerCase()
      ) || null
    );
  }

  // ==================== Party Creation ====================

  /**
   * Create a new party with the player as leader.
   */
  createParty(player: PartyPlayer): PartyOperationResult {
    // Check if player is already in a party
    if (this.isInParty(player)) {
      return {
        success: false,
        message: 'You are already in a party. Leave your current party first.',
      };
    }

    // Create the party
    const partyId = generatePartyId();
    const party: PartyData = {
      id: partyId,
      leaderName: player.name,
      members: [createPartyMember(player.name)],
      stats: createPartyStats(),
      pendingInvites: [],
      isAutoSplit: false,
    };

    this._parties.set(partyId, party);

    // Update player's party data
    const playerData = this.getPlayerPartyData(player);
    playerData.partyId = partyId;
    this.setPlayerPartyData(player, playerData);

    return {
      success: true,
      message: 'You have created a new party. Use "party invite <player>" to add members.',
    };
  }

  /**
   * Disband the party (leader only).
   */
  disbandParty(player: PartyPlayer): PartyOperationResult {
    const party = this.getPlayerParty(player);
    if (!party) {
      return { success: false, message: 'You are not in a party.' };
    }

    if (!this.isPartyLeader(player)) {
      return { success: false, message: 'Only the party leader can disband the party.' };
    }

    // Notify all members
    this.broadcast(party.id, '{yellow}The party has been disbanded.{/}');

    // Clear party data for all members
    for (const member of party.members) {
      const memberPlayer = this.findPlayer(member.playerName);
      if (memberPlayer) {
        const memberData = this.getPlayerPartyData(memberPlayer);
        memberData.partyId = null;
        this.setPlayerPartyData(memberPlayer, memberData);
      }
    }

    // Clear pending invites
    for (const invite of party.pendingInvites) {
      const invitee = this.findPlayer(invite.inviteeName);
      if (invitee) {
        const inviteeData = this.getPlayerPartyData(invitee);
        inviteeData.pendingInvite = null;
        this.setPlayerPartyData(invitee, inviteeData);
      }
    }

    // Delete the party
    this._parties.delete(party.id);

    return { success: true, message: 'You have disbanded the party.' };
  }

  // ==================== Invitations ====================

  /**
   * Invite a player to the party.
   */
  invitePlayer(inviter: PartyPlayer, inviteeName: string): PartyOperationResult {
    // Get or create party
    let party = this.getPlayerParty(inviter);
    if (!party) {
      // Auto-create party if not in one
      const result = this.createParty(inviter);
      if (!result.success) {
        return result;
      }
      party = this.getPlayerParty(inviter)!;
    }

    // Check if inviter is the leader
    if (!this.isPartyLeader(inviter)) {
      return { success: false, message: 'Only the party leader can invite players.' };
    }

    // Check party size
    if (party.members.length >= PARTY_CONSTANTS.MAX_SIZE) {
      return {
        success: false,
        message: `The party is full (maximum ${PARTY_CONSTANTS.MAX_SIZE} members).`,
      };
    }

    // Find the invitee
    const invitee = this.findPlayer(inviteeName);
    if (!invitee) {
      return { success: false, message: `${inviteeName} is not online.` };
    }

    // Can't invite yourself
    if (invitee.name.toLowerCase() === inviter.name.toLowerCase()) {
      return { success: false, message: "You can't invite yourself." };
    }

    // Check if invitee is already in this party
    if (this.getPartyMember(party, invitee.name)) {
      return { success: false, message: `${invitee.name} is already in your party.` };
    }

    // Check if invitee is in another party
    if (this.isInParty(invitee)) {
      return { success: false, message: `${invitee.name} is already in a party.` };
    }

    // Check if invitee already has a pending invite from this party
    const existingInvite = party.pendingInvites.find(
      (inv) => inv.inviteeName.toLowerCase() === invitee.name.toLowerCase()
    );
    if (existingInvite) {
      return {
        success: false,
        message: `${invitee.name} already has a pending invite from your party.`,
      };
    }

    // Create the invite
    const invite: PartyInvite = {
      inviterName: inviter.name,
      inviteeName: invitee.name,
      partyId: party.id,
      expiresAt: Date.now() + PARTY_CONSTANTS.INVITE_TIMEOUT_MS,
    };

    party.pendingInvites.push(invite);

    // Store invite on invitee
    const inviteeData = this.getPlayerPartyData(invitee);
    inviteeData.pendingInvite = invite;
    this.setPlayerPartyData(invitee, inviteeData);

    // Notify invitee
    invitee.receive(
      `\n{cyan}${inviter.name} has invited you to join their party!{/}\n`
    );
    invitee.receive('{dim}Type "party accept" to join or "party decline" to refuse.{/}\n');

    return { success: true, message: `You have invited ${invitee.name} to join your party.` };
  }

  /**
   * Accept a pending party invite.
   */
  acceptInvite(player: PartyPlayer): PartyOperationResult {
    const playerData = this.getPlayerPartyData(player);
    const invite = playerData.pendingInvite;

    if (!invite) {
      return { success: false, message: 'You have no pending party invites.' };
    }

    // Check if invite is expired
    if (Date.now() > invite.expiresAt) {
      playerData.pendingInvite = null;
      this.setPlayerPartyData(player, playerData);
      return { success: false, message: 'The party invite has expired.' };
    }

    // Get the party
    const party = this._parties.get(invite.partyId);
    if (!party) {
      playerData.pendingInvite = null;
      this.setPlayerPartyData(player, playerData);
      return { success: false, message: 'The party no longer exists.' };
    }

    // Check party size
    if (party.members.length >= PARTY_CONSTANTS.MAX_SIZE) {
      playerData.pendingInvite = null;
      this.setPlayerPartyData(player, playerData);
      return { success: false, message: 'The party is now full.' };
    }

    // Add player to party
    party.members.push(createPartyMember(player.name));

    // Update player's party data
    playerData.partyId = party.id;
    playerData.pendingInvite = null;
    this.setPlayerPartyData(player, playerData);

    // Remove from pending invites
    party.pendingInvites = party.pendingInvites.filter(
      (inv) => inv.inviteeName.toLowerCase() !== player.name.toLowerCase()
    );

    // Notify party
    this.broadcast(party.id, `{green}${player.name} has joined the party!{/}`);

    return {
      success: true,
      message: `You have joined ${invite.inviterName}'s party.`,
    };
  }

  /**
   * Decline a pending party invite.
   */
  declineInvite(player: PartyPlayer): PartyOperationResult {
    const playerData = this.getPlayerPartyData(player);
    const invite = playerData.pendingInvite;

    if (!invite) {
      return { success: false, message: 'You have no pending party invites.' };
    }

    // Clear the invite
    playerData.pendingInvite = null;
    this.setPlayerPartyData(player, playerData);

    // Remove from party's pending invites
    const party = this._parties.get(invite.partyId);
    if (party) {
      party.pendingInvites = party.pendingInvites.filter(
        (inv) => inv.inviteeName.toLowerCase() !== player.name.toLowerCase()
      );

      // Notify the inviter
      const inviter = this.findPlayer(invite.inviterName);
      if (inviter) {
        inviter.receive(
          `{yellow}${player.name} has declined your party invite.{/}\n`
        );
      }
    }

    return { success: true, message: 'You have declined the party invite.' };
  }

  // ==================== Membership ====================

  /**
   * Leave the current party.
   */
  leaveParty(player: PartyPlayer): PartyOperationResult {
    const party = this.getPlayerParty(player);
    if (!party) {
      return { success: false, message: 'You are not in a party.' };
    }

    const isLeader = this.isPartyLeader(player);

    // Remove player from party
    party.members = party.members.filter(
      (m) => m.playerName.toLowerCase() !== player.name.toLowerCase()
    );

    // Clear player's party data
    const playerData = this.getPlayerPartyData(player);
    playerData.partyId = null;
    this.setPlayerPartyData(player, playerData);

    // Notify remaining members
    this.broadcast(party.id, `{yellow}${player.name} has left the party.{/}`);

    // Handle party dissolution or leadership transfer
    if (party.members.length < PARTY_CONSTANTS.MIN_SIZE) {
      // Party too small - disband
      this.autoDisbandParty(party);
      return { success: true, message: 'You have left the party. The party has been disbanded.' };
    } else if (isLeader) {
      // Transfer leadership to longest-standing online member
      this.autoPromoteNewLeader(party);
    }

    return { success: true, message: 'You have left the party.' };
  }

  /**
   * Kick a member from the party (leader only).
   */
  kickMember(leader: PartyPlayer, memberName: string): PartyOperationResult {
    const party = this.getPlayerParty(leader);
    if (!party) {
      return { success: false, message: 'You are not in a party.' };
    }

    if (!this.isPartyLeader(leader)) {
      return { success: false, message: 'Only the party leader can kick members.' };
    }

    // Can't kick yourself
    if (memberName.toLowerCase() === leader.name.toLowerCase()) {
      return { success: false, message: "You can't kick yourself. Use 'party disband' instead." };
    }

    // Find the member
    const member = this.getPartyMember(party, memberName);
    if (!member) {
      return { success: false, message: `${memberName} is not in your party.` };
    }

    // Remove member from party
    party.members = party.members.filter(
      (m) => m.playerName.toLowerCase() !== memberName.toLowerCase()
    );

    // Clear member's party data
    const memberPlayer = this.findPlayer(memberName);
    if (memberPlayer) {
      const memberData = this.getPlayerPartyData(memberPlayer);
      memberData.partyId = null;
      this.setPlayerPartyData(memberPlayer, memberData);
      memberPlayer.receive(`{red}You have been kicked from the party.{/}\n`);
    }

    // Notify party
    this.broadcast(party.id, `{yellow}${memberName} has been kicked from the party.{/}`);

    // Check if party needs to be disbanded
    if (party.members.length < PARTY_CONSTANTS.MIN_SIZE) {
      this.autoDisbandParty(party);
      return {
        success: true,
        message: `You have kicked ${memberName}. The party has been disbanded.`,
      };
    }

    return { success: true, message: `You have kicked ${memberName} from the party.` };
  }

  /**
   * Transfer leadership to another member.
   */
  setLeader(currentLeader: PartyPlayer, newLeaderName: string): PartyOperationResult {
    const party = this.getPlayerParty(currentLeader);
    if (!party) {
      return { success: false, message: 'You are not in a party.' };
    }

    if (!this.isPartyLeader(currentLeader)) {
      return { success: false, message: 'Only the party leader can transfer leadership.' };
    }

    // Can't transfer to yourself
    if (newLeaderName.toLowerCase() === currentLeader.name.toLowerCase()) {
      return { success: false, message: 'You are already the leader.' };
    }

    // Find the new leader in party
    const member = this.getPartyMember(party, newLeaderName);
    if (!member) {
      return { success: false, message: `${newLeaderName} is not in your party.` };
    }

    // Transfer leadership
    party.leaderName = member.playerName;

    // Notify party
    this.broadcast(
      party.id,
      `{cyan}${member.playerName} is now the party leader.{/}`
    );

    return {
      success: true,
      message: `You have transferred party leadership to ${member.playerName}.`,
    };
  }

  /**
   * Auto-disband a party that's too small.
   */
  private autoDisbandParty(party: PartyData): void {
    // Notify remaining members
    for (const member of party.members) {
      const memberPlayer = this.findPlayer(member.playerName);
      if (memberPlayer) {
        memberPlayer.receive(
          '{yellow}The party has been disbanded (not enough members).{/}\n'
        );
        const memberData = this.getPlayerPartyData(memberPlayer);
        memberData.partyId = null;
        this.setPlayerPartyData(memberPlayer, memberData);
      }
    }

    // Clear pending invites
    for (const invite of party.pendingInvites) {
      const invitee = this.findPlayer(invite.inviteeName);
      if (invitee) {
        const inviteeData = this.getPlayerPartyData(invitee);
        inviteeData.pendingInvite = null;
        this.setPlayerPartyData(invitee, inviteeData);
      }
    }

    this._parties.delete(party.id);
  }

  /**
   * Auto-promote a new leader when the current leader leaves.
   */
  private autoPromoteNewLeader(party: PartyData): void {
    // Find the longest-standing online member
    const onlineMembers = party.members.filter((m) => {
      const p = this.findPlayer(m.playerName);
      return p !== null && m.status === 'online';
    });

    if (onlineMembers.length > 0) {
      // Sort by join time (oldest first)
      onlineMembers.sort((a, b) => a.joinedAt - b.joinedAt);
      party.leaderName = onlineMembers[0].playerName;

      this.broadcast(
        party.id,
        `{cyan}${party.leaderName} is now the party leader.{/}`
      );
    } else {
      // No online members - promote first offline member
      if (party.members.length > 0) {
        party.members.sort((a, b) => a.joinedAt - b.joinedAt);
        party.leaderName = party.members[0].playerName;
      }
    }
  }

  // ==================== Follow System ====================

  /**
   * Toggle follow mode for a party member.
   */
  toggleFollow(player: PartyPlayer): PartyOperationResult {
    const party = this.getPlayerParty(player);
    if (!party) {
      return { success: false, message: 'You are not in a party.' };
    }

    const member = this.getPartyMember(party, player.name);
    if (!member) {
      return { success: false, message: 'Error: Could not find your party membership.' };
    }

    // Leaders can't follow (they are followed)
    if (this.isPartyLeader(player)) {
      return {
        success: false,
        message: "As the party leader, you don't follow others - they follow you!",
      };
    }

    member.isFollowing = !member.isFollowing;

    if (member.isFollowing) {
      return {
        success: true,
        message: `You are now following ${party.leaderName}.`,
      };
    } else {
      return { success: true, message: 'You are no longer following the leader.' };
    }
  }

  /**
   * Toggle auto-assist mode for a party member.
   */
  toggleAutoAssist(player: PartyPlayer): PartyOperationResult {
    const party = this.getPlayerParty(player);
    if (!party) {
      return { success: false, message: 'You are not in a party.' };
    }

    const member = this.getPartyMember(party, player.name);
    if (!member) {
      return { success: false, message: 'Error: Could not find your party membership.' };
    }

    // Leaders can't auto-assist (they initiate combat)
    if (this.isPartyLeader(player)) {
      return {
        success: false,
        message: "As the party leader, you initiate combat - others assist you!",
      };
    }

    member.isAutoAssist = !member.isAutoAssist;

    if (member.isAutoAssist) {
      return {
        success: true,
        message: `Auto-assist enabled. You will automatically attack when ${party.leaderName} initiates combat.`,
      };
    } else {
      return { success: true, message: 'Auto-assist disabled.' };
    }
  }

  /**
   * Toggle auto-split mode for the party (leader only).
   * When enabled, gold from kills is automatically split among party members in the same room.
   */
  toggleAutoSplit(player: PartyPlayer): PartyOperationResult {
    const party = this.getPlayerParty(player);
    if (!party) {
      return { success: false, message: 'You are not in a party.' };
    }

    // Only the leader can toggle auto-split
    if (!this.isPartyLeader(player)) {
      return {
        success: false,
        message: 'Only the party leader can toggle auto-split.',
      };
    }

    party.isAutoSplit = !party.isAutoSplit;

    // Notify all party members
    if (party.isAutoSplit) {
      this.broadcast(party.id, `{yellow}${player.name} has enabled auto-split. Gold will be automatically shared.{/}`);
      return {
        success: true,
        message: 'Auto-split enabled. Gold from kills will be automatically split among party members.',
      };
    } else {
      this.broadcast(party.id, `{yellow}${player.name} has disabled auto-split.{/}`);
      return { success: true, message: 'Auto-split disabled.' };
    }
  }

  /**
   * Handle leader movement - move all following members.
   * Called from the go command after the leader moves.
   */
  async handleLeaderMovement(
    leader: PartyPlayer,
    fromRoom: MudObject,
    toRoom: MudObject,
    direction: string
  ): Promise<void> {
    const party = this.getPlayerParty(leader);
    if (!party) return;

    // Only act if this player is the leader
    if (!this.isPartyLeader(leader)) return;

    // Get all following members who are in the same room
    for (const member of party.members) {
      if (!member.isFollowing) continue;
      if (member.playerName.toLowerCase() === leader.name.toLowerCase()) continue;

      const memberPlayer = this.findPlayer(member.playerName);
      if (!memberPlayer) continue;

      // Only move if they're in the same room as the leader was
      if (memberPlayer.environment !== fromRoom) continue;

      // Check if member is in combat
      if ('inCombat' in memberPlayer && (memberPlayer as Living & { inCombat: boolean }).inCombat) {
        memberPlayer.receive(
          `{yellow}You cannot follow ${leader.name} while in combat!{/}\n`
        );
        continue;
      }

      // Move the member
      const moved = await memberPlayer.moveTo(toRoom);
      if (moved) {
        // Notify member
        memberPlayer.receive(`{dim}You follow ${leader.name} ${direction}.{/}\n`);

        // Show the room to the follower (respecting brief mode)
        const roomWithLook = toRoom as MudObject & {
          look?: (viewer: MudObject) => void;
          glance?: (viewer: MudObject) => void;
        };
        const playerWithConfig = memberPlayer as PartyPlayer & {
          getConfig?: <T>(key: string) => T;
        };
        const briefMode = playerWithConfig.getConfig?.<boolean>('brief') ?? false;

        if (briefMode && roomWithLook.glance) {
          roomWithLook.glance(memberPlayer);
        } else if (roomWithLook.look) {
          roomWithLook.look(memberPlayer);
        }

        // Send prompt
        if ('sendPrompt' in memberPlayer) {
          (memberPlayer as PartyPlayer & { sendPrompt: () => void }).sendPrompt();
        }
      }
    }
  }

  /**
   * Handle leader initiating combat - auto-assist members attack the same target.
   * Called from the combat daemon when combat is initiated.
   * @param attacker The player who initiated combat
   * @param defender The target being attacked
   */
  handleLeaderCombat(attacker: PartyPlayer, defender: Living): void {
    const party = this.getPlayerParty(attacker);
    if (!party) return;

    // Only trigger auto-assist if the attacker is the party leader
    if (!this.isPartyLeader(attacker)) return;

    // Get all auto-assist members who are in the same room
    for (const member of party.members) {
      if (!member.isAutoAssist) continue;
      if (member.playerName.toLowerCase() === attacker.name.toLowerCase()) continue;

      const memberPlayer = this.findPlayer(member.playerName);
      if (!memberPlayer) continue;

      // Only assist if they're in the same room
      if (memberPlayer.environment !== attacker.environment) continue;

      // Check if member is already in combat
      if ('inCombat' in memberPlayer && (memberPlayer as Living & { inCombat: boolean }).inCombat) {
        continue;
      }

      // Check if member is alive
      if (!memberPlayer.alive) continue;

      // Initiate combat for this member via the combat daemon
      import('./combat.js')
        .then(({ getCombatDaemon }) => {
          const combatDaemon = getCombatDaemon();
          const initiated = combatDaemon.initiateCombat(memberPlayer, defender);
          if (initiated) {
            memberPlayer.receive(
              `{cyan}[Auto-assist] You join ${attacker.name} in attacking ${defender.name}!{/}\n`
            );
          }
        })
        .catch(() => {
          // Combat daemon not available
        });
    }
  }

  /**
   * Handle auto-split of gold from a killed NPC.
   * Called after an NPC dies and drops gold.
   * @param killer The player who killed the NPC
   * @param corpse The corpse object containing gold
   * @param goldAmount The amount of gold on the corpse
   * @param deathRoom The room where the NPC died
   */
  handleAutoSplit(
    killer: PartyPlayer,
    corpse: MudObject,
    goldAmount: number,
    deathRoom: MudObject | null
  ): boolean {
    if (goldAmount <= 0) return false;

    const party = this.getPlayerParty(killer);
    if (!party) return false;

    // Check if the party has auto-split enabled
    if (!party.isAutoSplit) return false;

    // Get all party members who are online and in the same room
    const eligibleMembers: Array<{ member: PartyMember; player: PartyPlayer }> = [];

    for (const member of party.members) {
      if (member.status !== 'online') continue;

      const player = this.findPlayer(member.playerName);
      if (!player) continue;

      // Must be in the same room
      if (player.environment !== deathRoom) continue;

      eligibleMembers.push({ member, player });
    }

    if (eligibleMembers.length === 0) return false;

    // Remove gold from corpse
    const corpseWithGold = corpse as MudObject & { gold?: number };
    if (corpseWithGold.gold !== undefined) {
      corpseWithGold.gold = 0;
    }

    // Split gold equally
    const perMember = Math.floor(goldAmount / eligibleMembers.length);
    const remainder = goldAmount % eligibleMembers.length;

    if (perMember <= 0) return false;

    // Award gold to each eligible member
    for (let i = 0; i < eligibleMembers.length; i++) {
      const { member, player } = eligibleMembers[i];
      // Give remainder to the first member (the killer usually)
      const amount = i === 0 ? perMember + remainder : perMember;

      // Add gold to player
      const playerWithGold = player as PartyPlayer & { gold?: number; adjustGold?: (amount: number) => void };
      if (playerWithGold.adjustGold) {
        playerWithGold.adjustGold(amount);
      } else if (playerWithGold.gold !== undefined) {
        playerWithGold.gold += amount;
      }

      // Track contribution
      member.contribution.goldEarned += amount;

      // Notify player
      player.receive(`{yellow}[Auto-split] You receive ${amount} gold.{/}\n`);
    }

    // Update party stats
    party.stats.totalGoldEarned += goldAmount;

    return true;
  }

  // ==================== XP Sharing ====================

  /**
   * Award XP to party members in the same room.
   * @param partyId The party ID
   * @param totalXP Total XP to distribute
   * @param npcName Name of the killed NPC (for messaging)
   * @param sourceRoom The room where the kill happened
   */
  awardPartyXP(
    partyId: string,
    totalXP: number,
    npcName: string,
    sourceRoom: MudObject | null | undefined
  ): void {
    const party = this._parties.get(partyId);
    if (!party) return;

    // Get eligible members (online AND in the same room)
    const eligible: Array<{ member: PartyMember; player: PartyPlayer }> = [];

    for (const member of party.members) {
      if (member.status !== 'online') continue;

      const player = this.findPlayer(member.playerName);
      if (!player) continue;

      // Must be in the same room
      if (player.environment !== sourceRoom) continue;

      // Must have gainExperience method
      if (!player.gainExperience) continue;

      eligible.push({ member, player });
    }

    if (eligible.length === 0) return;

    // Split XP equally
    const perMember = Math.floor(totalXP / eligible.length);
    if (perMember <= 0) return;

    // Award XP to each eligible member
    for (const { member, player } of eligible) {
      player.gainExperience(perMember);
      member.contribution.xpEarned += perMember;
    }

    // Update party stats
    party.stats.totalXPEarned += totalXP;
    party.stats.totalKills += 1;

    // Notify party members in the room about XP split
    if (eligible.length > 1) {
      for (const { player } of eligible) {
        player.receive(
          `{dim}(Party XP: ${perMember} each from ${npcName}){/}\n`
        );
      }
    }
  }

  /**
   * Record a kill contribution for a party member.
   */
  recordKill(player: PartyPlayer, npcName: string): void {
    const party = this.getPlayerParty(player);
    if (!party) return;

    const member = this.getPartyMember(party, player.name);
    if (!member) return;

    member.contribution.kills += 1;
  }

  /**
   * Record gold earned by a party member.
   */
  recordGold(player: PartyPlayer, amount: number): void {
    const party = this.getPlayerParty(player);
    if (!party) return;

    const member = this.getPartyMember(party, player.name);
    if (!member) return;

    member.contribution.goldEarned += amount;
    party.stats.totalGoldEarned += amount;
  }

  // ==================== Communication ====================

  /**
   * Broadcast a system message to all party members.
   */
  broadcast(partyId: string, message: string): void {
    const party = this._parties.get(partyId);
    if (!party) return;

    for (const member of party.members) {
      const player = this.findPlayer(member.playerName);
      if (player) {
        player.receive(`[Party] ${message}\n`);
      }
    }
  }

  /**
   * Send a party chat message from a player.
   */
  partySay(player: PartyPlayer, message: string): PartyOperationResult {
    const party = this.getPlayerParty(player);
    if (!party) {
      return { success: false, message: 'You are not in a party.' };
    }

    if (!message.trim()) {
      return { success: false, message: 'Say what?' };
    }

    // Send to all online party members
    for (const member of party.members) {
      const memberPlayer = this.findPlayer(member.playerName);
      if (!memberPlayer) continue;

      if (member.playerName.toLowerCase() === player.name.toLowerCase()) {
        memberPlayer.receive(`{cyan}[Party]{/} You say: ${message}\n`);
      } else {
        memberPlayer.receive(
          `{cyan}[Party]{/} ${player.name} says: ${message}\n`
        );
      }
    }

    return { success: true, message: '' };
  }

  // ==================== Connection Handling ====================

  /**
   * Handle player disconnect.
   */
  handlePlayerDisconnect(player: PartyPlayer): void {
    const party = this.getPlayerParty(player);
    if (!party) return;

    const member = this.getPartyMember(party, player.name);
    if (!member) return;

    member.status = 'offline';
    member.isFollowing = false; // Stop following on disconnect

    // Notify party
    this.broadcast(
      party.id,
      `{yellow}${player.name} has gone link-dead.{/}`
    );

    // If leader disconnected, promote a new one if there are online members
    if (this.isPartyLeader(player)) {
      const onlineMembers = party.members.filter(
        (m) =>
          m.status === 'online' &&
          m.playerName.toLowerCase() !== player.name.toLowerCase()
      );
      if (onlineMembers.length > 0) {
        this.autoPromoteNewLeader(party);
      }
    }
  }

  /**
   * Handle player reconnect.
   */
  handlePlayerReconnect(player: PartyPlayer): void {
    const party = this.getPlayerParty(player);
    if (!party) return;

    const member = this.getPartyMember(party, player.name);
    if (!member) return;

    member.status = 'online';

    // Notify party
    this.broadcast(party.id, `{green}${player.name} has reconnected.{/}`);
  }

  // ==================== Statistics ====================

  /**
   * Get formatted party stats for display.
   */
  getPartyStats(player: PartyPlayer): string {
    const party = this.getPlayerParty(player);
    if (!party) {
      return 'You are not in a party.';
    }

    const lines: string[] = [];
    lines.push('{bold}=== Party Statistics ==={/}');
    lines.push(`Leader: {cyan}${party.leaderName}{/}`);
    lines.push(`Auto-split: ${party.isAutoSplit ? '{green}Enabled{/}' : '{red}Disabled{/}'}`);
    lines.push(`Members (${party.members.length}/${PARTY_CONSTANTS.MAX_SIZE}):`);

    for (const member of party.members) {
      const isLeader =
        member.playerName.toLowerCase() === party.leaderName.toLowerCase();
      const leaderTag = isLeader ? ' {yellow}[Leader]{/}' : '';
      const statusColor = member.status === 'online' ? 'green' : 'red';
      const followStatus = member.isFollowing ? 'Yes' : 'No';
      const assistStatus = member.isAutoAssist ? 'Yes' : 'No';

      lines.push(`  {bold}${member.playerName}{/}${leaderTag} - {${statusColor}}${member.status}{/}, Follow: ${followStatus}, Assist: ${assistStatus}`);
      lines.push(
        `    Contribution: ${member.contribution.kills} kills, ${member.contribution.xpEarned} XP, ${member.contribution.goldEarned} gold`
      );
    }

    lines.push('');
    lines.push('{bold}Party Totals:{/}');
    lines.push(`  Total Kills: ${party.stats.totalKills}`);
    lines.push(`  Total XP Earned: ${party.stats.totalXPEarned}`);
    lines.push(`  Total Gold Earned: ${party.stats.totalGoldEarned}`);

    // Calculate party age
    const ageMs = Date.now() - party.stats.createdAt;
    const ageMinutes = Math.floor(ageMs / 60000);
    const ageHours = Math.floor(ageMinutes / 60);
    const remainingMinutes = ageMinutes % 60;

    if (ageHours > 0) {
      lines.push(`  Party Created: ${ageHours} hours, ${remainingMinutes} minutes ago`);
    } else {
      lines.push(`  Party Created: ${ageMinutes} minutes ago`);
    }

    return lines.join('\n');
  }

  /**
   * Get brief party status for the 'party' command with no arguments.
   */
  getPartyStatus(player: PartyPlayer): string {
    const party = this.getPlayerParty(player);
    if (!party) {
      return 'You are not in a party.';
    }

    const lines: string[] = [];
    const isLeader = this.isPartyLeader(player);
    const splitIndicator = party.isAutoSplit ? ' {yellow}[$]{/}' : '';
    lines.push(`{bold}Party{/} (${party.members.length}/${PARTY_CONSTANTS.MAX_SIZE})${splitIndicator}`);

    for (const member of party.members) {
      const leaderIcon =
        member.playerName.toLowerCase() === party.leaderName.toLowerCase()
          ? '{yellow}★{/}'
          : ' ';
      const statusIcon = member.status === 'online' ? '{green}●{/}' : '{red}○{/}';
      const followIcon = member.isFollowing ? '{cyan}→{/}' : ' ';
      const assistIcon = member.isAutoAssist ? '{red}⚔{/}' : ' ';
      lines.push(`  ${leaderIcon}${statusIcon}${followIcon}${assistIcon} ${member.playerName}`);
    }

    if (isLeader) {
      lines.push('{dim}You are the party leader.{/}');
    }

    return lines.join('\n');
  }

  // ==================== Cleanup ====================

  /**
   * Called when the daemon is destroyed.
   */
  override async onDestroy(): Promise<void> {
    if (this._inviteCleanupInterval) {
      clearInterval(this._inviteCleanupInterval);
      this._inviteCleanupInterval = null;
    }
    await super.onDestroy();
  }

  get isLoaded(): boolean {
    return this._loaded;
  }
}

// Singleton instance
let partyDaemon: PartyDaemon | null = null;

/**
 * Get the PartyDaemon singleton.
 */
export function getPartyDaemon(): PartyDaemon {
  if (!partyDaemon) {
    partyDaemon = new PartyDaemon();
  }
  return partyDaemon;
}

/**
 * Reset the party daemon (for testing).
 */
export function resetPartyDaemon(): void {
  if (partyDaemon) {
    void partyDaemon.onDestroy();
  }
  partyDaemon = null;
}

export default PartyDaemon;
