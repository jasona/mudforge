/**
 * Message Composer - Token-based message composition system.
 *
 * Composes viewer-specific messages from templates using tokens:
 *   $N, $n - Actor name (capitalized/lowercase)
 *   $V, $v - Verb (conjugated: "smile" for actor, "smiles" for others)
 *   $T, $t - Target name (capitalized/lowercase)
 *   $P, $p - Actor's possessive ("your" for actor, "Hero's" for others)
 *   $O, $o - Object/string argument (capitalized/lowercase)
 *   $R, $r - Reflexive ("yourself" for actor, "himself/herself" for others)
 *   $Q, $q - Target's possessive ("your" for target, "Hero's" for others)
 *
 * Based on the classic LPC m_messages.c pattern.
 */

import type { MudObject } from '../std/object.js';

/**
 * Gender type for pronoun selection.
 */
type Gender = 'male' | 'female' | 'neutral';

/**
 * Get a living object's gender.
 */
function getGender(obj: MudObject | null): Gender {
  if (!obj) return 'neutral';
  const living = obj as MudObject & { gender?: string };
  if (living.gender === 'male' || living.gender === 'female') {
    return living.gender;
  }
  return 'neutral';
}

/**
 * Get a living object's name for emote messages.
 * Uses the actual name property, not displayName or shortDesc (which may contain unresolved tokens).
 */
function getName(obj: MudObject | null): string {
  if (!obj) return 'someone';
  const living = obj as MudObject & { name?: string };
  return living.name || 'someone';
}

/**
 * Capitalize first letter of a string.
 */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get reflexive pronoun based on gender.
 */
function getReflexive(gender: Gender): string {
  switch (gender) {
    case 'male':
      return 'himself';
    case 'female':
      return 'herself';
    default:
      return 'themselves';
  }
}

/**
 * Get possessive form of a name.
 */
function getPossessive(name: string): string {
  if (name.toLowerCase().endsWith('s')) {
    return `${name}'`;
  }
  return `${name}'s`;
}

/**
 * Conjugate a verb for third person (add 's' or 'es').
 * This handles common English verb conjugation patterns.
 */
export function conjugateVerb(verb: string): string {
  if (!verb) return verb;

  const lower = verb.toLowerCase();

  // Irregular verbs
  const irregulars: Record<string, string> = {
    are: 'is',
    have: 'has',
    do: 'does',
    go: 'goes',
  };

  if (irregulars[lower]) {
    return irregulars[lower];
  }

  // Verbs ending in consonant + y: cry -> cries
  if (lower.match(/[^aeiou]y$/)) {
    return lower.slice(0, -1) + 'ies';
  }

  // Verbs ending in s, x, z, ch, sh: add 'es'
  if (lower.match(/(s|x|z|ch|sh)$/)) {
    return lower + 'es';
  }

  // Verbs ending in o: go -> goes
  if (lower.match(/[^aeiou]o$/)) {
    return lower + 'es';
  }

  // Default: add 's'
  return lower + 's';
}

/**
 * Message composition result for all viewers.
 */
export interface ComposedMessages {
  /** Message the actor sees */
  actor: string;
  /** Message the target sees (if applicable) */
  target?: string;
  /** Message other observers see */
  others: string;
}

/**
 * Compose a message for a specific viewer.
 *
 * @param template The message template with tokens
 * @param viewer Who is viewing this message
 * @param actor The one performing the action
 * @param target The target of the action (if any)
 * @param objectStr Extra string argument (for $O token)
 * @returns The composed message for this viewer
 */
export function composeMessage(
  template: string,
  viewer: MudObject | null,
  actor: MudObject | null,
  target: MudObject | null = null,
  objectStr: string = ''
): string {
  const isActor = viewer === actor;
  const isTarget = viewer === target;
  const actorGender = getGender(actor);
  const actorName = getName(actor);
  const targetName = target ? getName(target) : '';

  let result = template;

  // Process tokens in order
  // $N/$n - Actor name ("You" for actor, name for others)
  result = result.replace(/\$N/g, isActor ? 'You' : capitalize(actorName));
  result = result.replace(/\$n/g, isActor ? 'you' : actorName.toLowerCase());

  // $V - Verb conjugation (extract verb and conjugate)
  // Pattern: $vverb or $Vverb
  result = result.replace(/\$V(\w+)/g, (_, verb) => {
    return isActor ? capitalize(verb) : capitalize(conjugateVerb(verb));
  });
  result = result.replace(/\$v(\w+)/g, (_, verb) => {
    return isActor ? verb : conjugateVerb(verb);
  });

  // $T/$t - Target name
  if (target) {
    result = result.replace(/\$T/g, isTarget ? 'You' : capitalize(targetName));
    result = result.replace(/\$t/g, isTarget ? 'you' : targetName.toLowerCase());
  } else {
    result = result.replace(/\$[Tt]/g, '');
  }

  // $P/$p - Actor's possessive
  result = result.replace(/\$P/g, isActor ? 'Your' : capitalize(getPossessive(actorName)));
  result = result.replace(/\$p/g, isActor ? 'your' : getPossessive(actorName).toLowerCase());

  // $Q/$q - Target's possessive
  if (target) {
    result = result.replace(/\$Q/g, isTarget ? 'Your' : capitalize(getPossessive(targetName)));
    result = result.replace(/\$q/g, isTarget ? 'your' : getPossessive(targetName).toLowerCase());
  } else {
    result = result.replace(/\$[Qq]/g, '');
  }

  // $O/$o - Object string
  result = result.replace(/\$O/g, capitalize(objectStr));
  result = result.replace(/\$o/g, objectStr.toLowerCase());

  // $R/$r - Reflexive
  result = result.replace(/\$R/g, isActor ? 'Yourself' : capitalize(getReflexive(actorGender)));
  result = result.replace(/\$r/g, isActor ? 'yourself' : getReflexive(actorGender));

  // Clean up any double spaces
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Compose messages for all viewers (actor, target, and others).
 *
 * @param template The message template with tokens
 * @param actor The one performing the action
 * @param target The target of the action (if any)
 * @param objectStr Extra string argument (for $O token)
 * @returns Object containing messages for actor, target, and others
 */
export function composeAllMessages(
  template: string,
  actor: MudObject | null,
  target: MudObject | null = null,
  objectStr: string = ''
): ComposedMessages {
  // Create a dummy "other" viewer for the third-person message
  const result: ComposedMessages = {
    actor: composeMessage(template, actor, actor, target, objectStr),
    others: composeMessage(template, null, actor, target, objectStr),
  };

  if (target && target !== actor) {
    result.target = composeMessage(template, target, actor, target, objectStr);
  }

  return result;
}

/**
 * Add "From afar, " prefix for remote emotes.
 */
export function makeRemoteMessage(message: string): string {
  return `From afar, ${message.charAt(0).toLowerCase()}${message.slice(1)}`;
}

export default {
  composeMessage,
  composeAllMessages,
  makeRemoteMessage,
  conjugateVerb,
};
