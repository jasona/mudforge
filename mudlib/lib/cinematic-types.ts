import type { ElementStyle } from './gui-types.js';

export type CinematicBlock =
  | { type: 'heading'; text: string; level?: 1 | 2 | 3; style?: ElementStyle }
  | { type: 'paragraph'; text: string; style?: ElementStyle }
  | { type: 'image'; src: string; alt?: string; caption?: string; style?: ElementStyle }
  | { type: 'divider'; style?: ElementStyle }
  | { type: 'spacer'; height?: string };

export interface CinematicSection {
  id: string;
  blocks: CinematicBlock[];
  backgroundImage?: string;
  backgroundColor?: string;
  style?: ElementStyle;
}

export interface CinematicConfig {
  sections: CinematicSection[];
  narration?: { src: string; autoPlay?: boolean; volume?: number };
  theme?: 'parchment' | 'dark' | 'ethereal';
  fadeInSections?: boolean;
}
