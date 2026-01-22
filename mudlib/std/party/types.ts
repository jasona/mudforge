/**
 * Party System Type Definitions
 *
 * Defines the interfaces and constants for the party/group system.
 */

/**
 * Party system constants.
 */
export const PARTY_CONSTANTS = {
  MIN_SIZE: 2,
  MAX_SIZE: 6,
  INVITE_TIMEOUT_MS: 60000, // 60 seconds
  PLAYER_DATA_KEY: 'partyData',
} as const;

/**
 * Party member status.
 */
export type PartyMemberStatus = 'online' | 'offline';

/**
 * Contribution tracking for a party member.
 */
export interface PartyMemberContribution {
  kills: number;
  xpEarned: number;
  goldEarned: number;
}

/**
 * Party member data.
 */
export interface PartyMember {
  playerName: string;
  joinedAt: number;
  status: PartyMemberStatus;
  isFollowing: boolean;
  isAutoAssist: boolean;
  contribution: PartyMemberContribution;
}

/**
 * Party statistics.
 */
export interface PartyStats {
  totalKills: number;
  totalXPEarned: number;
  totalGoldEarned: number;
  createdAt: number;
}

/**
 * Pending party invite.
 */
export interface PartyInvite {
  inviterName: string;
  inviteeName: string;
  partyId: string;
  expiresAt: number;
}

/**
 * Full party data structure.
 */
export interface PartyData {
  id: string;
  leaderName: string;
  members: PartyMember[];
  stats: PartyStats;
  pendingInvites: PartyInvite[];
  isAutoSplit: boolean;
}

/**
 * Player-specific party data stored on the player object.
 */
export interface PlayerPartyData {
  partyId: string | null;
  pendingInvite: PartyInvite | null;
}

/**
 * Result of a party operation.
 */
export interface PartyOperationResult {
  success: boolean;
  message: string;
}

/**
 * Generate a unique party ID.
 */
export function generatePartyId(): string {
  return `party_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new party member entry.
 */
export function createPartyMember(playerName: string): PartyMember {
  return {
    playerName,
    joinedAt: Date.now(),
    status: 'online',
    isFollowing: false,
    isAutoAssist: false,
    contribution: {
      kills: 0,
      xpEarned: 0,
      goldEarned: 0,
    },
  };
}

/**
 * Create initial party stats.
 */
export function createPartyStats(): PartyStats {
  return {
    totalKills: 0,
    totalXPEarned: 0,
    totalGoldEarned: 0,
    createdAt: Date.now(),
  };
}

/**
 * Create an empty player party data structure.
 */
export function createPlayerPartyData(): PlayerPartyData {
  return {
    partyId: null,
    pendingInvite: null,
  };
}
