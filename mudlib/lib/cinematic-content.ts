import type { CinematicSection } from './cinematic-types.js';

export const INTRO_CINEMATIC_ID = 'world-intro';

/**
 * Build the default world-introduction cinematic shown to newly created players.
 */
export function buildIntroCinematicSections(gameName: string): CinematicSection[] {
  return [
    {
      id: 'intro-image',
      blocks: [
        {
          type: 'image',
          src: 'images/intros/the-narrator.jpg',
          alt: 'A hooded narrator overlooking the burning frontier',
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          },
        },
      ],
    },
    {
      id: 'intro-content',
      blocks: [
        { type: 'heading', text: `Welcome to ${gameName}`, level: 1 },
        {
          type: 'paragraph',
          text:
            "The world of Valdoria has existed long before you arrived. Kingdoms have risen. Heroes have been forgotten. The land doesn't care who you are — only what you become. You have guilds to join, enemies to face, and a story that hasn't been written yet. Your name is known here now... Make it MEAN something!",
        },
      ],
    },
  ];
}
