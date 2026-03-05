import type { CinematicSection } from './cinematic-types.js';

export const INTRO_CINEMATIC_ID = 'world-intro';

/**
 * Build the default world-introduction cinematic shown to newly created players.
 */
export function buildIntroCinematicSections(gameName: string): CinematicSection[] {
  return [
    {
      id: 'prologue',
      backgroundImage: 'images/intros/arrival.jpg',
      blocks: [
        { type: 'heading', text: `Welcome to ${gameName}`, level: 1 },
        {
          type: 'paragraph',
          text:
            'Stormlight fractures across the sky as the old roads awaken. Empires fade, but rumors of power still pull the brave toward the frontier.',
        },
        { type: 'divider' },
      ],
    },
    {
      id: 'setting',
      blocks: [
        { type: 'heading', text: 'A Realm In Motion', level: 2 },
        {
          type: 'paragraph',
          text:
            'Guilds compete in shadow and steel, caravans vanish on forest roads, and ancient shrines whisper to anyone willing to listen.',
        },
        {
          type: 'image',
          src: 'images/intros/valdoria-road.jpg',
          alt: 'The western roads of Valdoria at dawn',
          caption: 'The road west is never as quiet as it looks.',
        },
      ],
    },
    {
      id: 'call',
      blocks: [
        { type: 'heading', text: 'Your Story Starts Now', level: 2 },
        {
          type: 'paragraph',
          text:
            'Every pact, battle, and betrayal will leave a mark. Choose your path, gather allies, and step into the world that waits beyond the gate.',
        },
        { type: 'spacer', height: '8px' },
      ],
    },
  ];
}
