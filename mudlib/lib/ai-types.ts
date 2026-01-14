/**
 * AI Types - Type definitions for AI-powered features in the mudlib.
 */

// Re-export lore types for convenience
export type { LoreCategory, LoreEntry } from '../daemons/lore.js';

/**
 * NPC AI context for configuring AI-powered dialogue.
 * This defines the personality, knowledge, and speaking style of an NPC
 * when using AI-generated responses.
 */
export interface NPCAIContext {
  /** The NPC's name as they should refer to themselves */
  name: string;

  /** Brief personality description */
  personality: string;

  /** Backstory and history */
  background: string;

  /** Current emotional state (can be updated dynamically) */
  currentMood?: string;

  /** What the NPC knows and can discuss */
  knowledgeScope?: {
    /** IDs of world lore entries the NPC has access to */
    worldLore?: string[];

    /** Local knowledge about their area, job, etc. */
    localKnowledge?: string[];

    /** Topics they are willing to discuss */
    topics?: string[];

    /** Topics they refuse to discuss or will deflect */
    forbidden?: string[];
  };

  /** How the NPC speaks */
  speakingStyle?: {
    /** Level of formality in speech */
    formality?: 'casual' | 'formal' | 'archaic';

    /** How wordy the NPC is */
    verbosity?: 'terse' | 'normal' | 'verbose';

    /** Special speech patterns, dialect, or accent notes */
    accent?: string;
  };

  /** Maximum words in a response */
  maxResponseLength?: number;
}

/**
 * AI generation options.
 */
export interface AIGenerateOptions {
  /** Maximum tokens in response */
  maxTokens?: number;

  /** Temperature for creativity (0-1, higher = more creative) */
  temperature?: number;

  /** Custom cache key for this request */
  cacheKey?: string;
}

/**
 * Details for generating an object description.
 */
export interface AIDescribeDetails {
  /** The name of the object */
  name: string;

  /** Keywords or themes to incorporate */
  keywords?: string[];

  /** Overall theme or style */
  theme?: string;

  /** Existing description to enhance or build upon */
  existing?: string;
}

/**
 * Result from AI text generation.
 */
export interface AIGenerateResult {
  /** Whether the generation was successful */
  success: boolean;

  /** The generated text */
  text?: string;

  /** Error message if unsuccessful */
  error?: string;

  /** Whether the result came from cache */
  cached?: boolean;
}

/**
 * Result from AI description generation.
 */
export interface AIDescribeResult {
  /** Whether the generation was successful */
  success: boolean;

  /** Generated short description (3-8 words) */
  shortDesc?: string;

  /** Generated long description (2-4 sentences) */
  longDesc?: string;

  /** Error message if unsuccessful */
  error?: string;
}

/**
 * Result from AI NPC response generation.
 */
export interface AINpcResponseResult {
  /** Whether the generation was successful */
  success: boolean;

  /** The NPC's response */
  response?: string;

  /** Error message if unsuccessful */
  error?: string;

  /** Whether to fall back to static responses */
  fallback?: boolean;
}

/**
 * A message in an NPC conversation history.
 */
export interface ConversationMessage {
  /** Who said this message */
  role: 'player' | 'npc';

  /** The message content */
  content: string;
}
