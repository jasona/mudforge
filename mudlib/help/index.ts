/**
 * Help System Initializer
 *
 * Loads all help topics from the help directory structure.
 * This should be called during game startup.
 */

import {
  registerPlayerHelp,
  registerBuilderHelp,
  registerAdminHelp,
  registerClassHelp,
} from '../lib/help-loader.js';

// Player help files
import playerBasics from './player/basics.js';

// Builder help files
import builderBasics from './builder/building-basics.js';

// Admin help files
import adminCommands from './admin/admin-commands.js';

// Class-specific help files
import fighterSkills from './classes/fighter/skills.js';
import thiefSkills from './classes/thief/skills.js';

/**
 * Initialize all help topics.
 * Call this during game startup.
 */
export function initializeHelp(): void {
  console.log('[Help] Initializing help system...');

  let totalTopics = 0;

  // Register player help (accessible to everyone)
  totalTopics += registerPlayerHelp(playerBasics);
  console.log(`[Help] Loaded ${playerBasics.length} player topics`);

  // Register builder help (requires builder permission)
  totalTopics += registerBuilderHelp(builderBasics);
  console.log(`[Help] Loaded ${builderBasics.length} builder topics`);

  // Register admin help (requires admin permission)
  totalTopics += registerAdminHelp(adminCommands);
  console.log(`[Help] Loaded ${adminCommands.length} admin topics`);

  // Register class-specific help
  totalTopics += registerClassHelp('fighter', fighterSkills);
  console.log(`[Help] Loaded ${fighterSkills.length} fighter topics`);

  totalTopics += registerClassHelp('thief', thiefSkills);
  console.log(`[Help] Loaded ${thiefSkills.length} thief topics`);

  console.log(`[Help] Help system initialized with ${totalTopics} additional topics`);
}

export default initializeHelp;
