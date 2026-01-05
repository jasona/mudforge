/**
 * Help Loader - Loads help topics from file definitions.
 *
 * Help files are organized in directories:
 *   /help/player/     - General player help
 *   /help/builder/    - Builder-specific help
 *   /help/admin/      - Admin-specific help
 *   /help/classes/<class>/ - Class-specific help
 */

import { getHelpDaemon, type HelpTopic, type HelpCategory, type HelpAccess } from '../daemons/help.js';

/**
 * Help file definition format.
 * These can be exported from .ts files in the help directories.
 */
export interface HelpFileDefinition {
  /** Topic name (required) */
  name: string;
  /** Display title (defaults to name) */
  title?: string;
  /** Category (required) */
  category: HelpCategory;
  /** Alternative names */
  aliases?: string[];
  /** Keywords for searching */
  keywords?: string[];
  /** Related topics */
  seeAlso?: string[];
  /** The help content */
  content: string;
}

/**
 * Register a help topic from a definition.
 */
export function registerHelpTopic(
  definition: HelpFileDefinition,
  access?: HelpAccess
): boolean {
  const helpDaemon = getHelpDaemon();

  const topic: HelpTopic = {
    name: definition.name,
    title: definition.title ?? definition.name,
    category: definition.category,
    content: definition.content,
    aliases: definition.aliases,
    keywords: definition.keywords,
    seeAlso: definition.seeAlso,
    access,
  };

  return helpDaemon.registerTopic(topic);
}

/**
 * Register multiple help topics with the same access level.
 */
export function registerHelpTopics(
  definitions: HelpFileDefinition[],
  access?: HelpAccess
): number {
  let count = 0;
  for (const def of definitions) {
    if (registerHelpTopic(def, access)) {
      count++;
    }
  }
  return count;
}

/**
 * Register player help topics (no access restrictions).
 */
export function registerPlayerHelp(definitions: HelpFileDefinition[]): number {
  return registerHelpTopics(definitions);
}

/**
 * Register builder help topics (requires builder permission).
 */
export function registerBuilderHelp(definitions: HelpFileDefinition[]): number {
  return registerHelpTopics(definitions, { minPermission: 1 });
}

/**
 * Register senior builder help topics.
 */
export function registerSeniorHelp(definitions: HelpFileDefinition[]): number {
  return registerHelpTopics(definitions, { minPermission: 2 });
}

/**
 * Register admin help topics (requires admin permission).
 */
export function registerAdminHelp(definitions: HelpFileDefinition[]): number {
  return registerHelpTopics(definitions, { minPermission: 3 });
}

/**
 * Register class-specific help topics.
 */
export function registerClassHelp(
  className: string,
  definitions: HelpFileDefinition[]
): number {
  return registerHelpTopics(definitions, { requiredClass: className });
}

/**
 * Register guild/clan-specific help topics.
 */
export function registerGuildHelp(
  guildName: string,
  definitions: HelpFileDefinition[]
): number {
  return registerHelpTopics(definitions, {
    requiredProperty: { key: 'guild', value: guildName.toLowerCase() },
  });
}

/**
 * Register clan-specific help topics.
 */
export function registerClanHelp(
  clanName: string,
  definitions: HelpFileDefinition[]
): number {
  return registerHelpTopics(definitions, {
    requiredProperty: { key: 'clan', value: clanName.toLowerCase() },
  });
}

export default {
  registerHelpTopic,
  registerHelpTopics,
  registerPlayerHelp,
  registerBuilderHelp,
  registerSeniorHelp,
  registerAdminHelp,
  registerClassHelp,
  registerGuildHelp,
  registerClanHelp,
};
