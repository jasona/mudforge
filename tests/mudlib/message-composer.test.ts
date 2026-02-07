/**
 * Tests for the message composer system.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock efuns for testing (message-composer uses efuns.capitalize)
(globalThis as unknown as { efuns: { capitalize: (str: string) => string } }).efuns = {
  capitalize: (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
};

import {
  composeMessage,
  composeAllMessages,
  makeRemoteMessage,
  conjugateVerb,
} from '../../mudlib/lib/message-composer.js';

// Mock MudObject for testing
interface MockMudObject {
  name?: string;
  gender?: 'male' | 'female' | 'neutral';
}

describe('Message Composer', () => {
  describe('conjugateVerb', () => {
    it('should handle regular verbs', () => {
      expect(conjugateVerb('smile')).toBe('smiles');
      expect(conjugateVerb('nod')).toBe('nods');
      expect(conjugateVerb('wave')).toBe('waves');
    });

    it('should handle verbs ending in s, x, z, ch, sh', () => {
      expect(conjugateVerb('pass')).toBe('passes');
      expect(conjugateVerb('fix')).toBe('fixes');
      expect(conjugateVerb('buzz')).toBe('buzzes');
      expect(conjugateVerb('match')).toBe('matches');
      expect(conjugateVerb('push')).toBe('pushes');
    });

    it('should handle verbs ending in consonant + y', () => {
      expect(conjugateVerb('cry')).toBe('cries');
      expect(conjugateVerb('try')).toBe('tries');
      expect(conjugateVerb('fly')).toBe('flies');
    });

    it('should handle verbs ending in vowel + y', () => {
      expect(conjugateVerb('play')).toBe('plays');
      expect(conjugateVerb('stay')).toBe('stays');
    });

    it('should handle irregular verbs', () => {
      expect(conjugateVerb('have')).toBe('has');
      expect(conjugateVerb('do')).toBe('does');
      expect(conjugateVerb('go')).toBe('goes');
    });
  });

  describe('composeMessage', () => {
    let actor: MockMudObject;
    let target: MockMudObject;
    let bystander: MockMudObject;

    beforeEach(() => {
      actor = { name: 'Hero', gender: 'male' };
      target = { name: 'Acer', gender: 'female' };
      bystander = { name: 'Bob', gender: 'male' };
    });

    describe('$N token (actor name)', () => {
      it('should show "You" for the actor', () => {
        const msg = composeMessage('$N $vsmile.', actor, actor);
        expect(msg).toBe('You smile.');
      });

      it('should show actor name for others', () => {
        const msg = composeMessage('$N $vsmile.', bystander, actor);
        expect(msg).toBe('Hero smiles.');
      });

      it('should handle lowercase $n', () => {
        const msg = composeMessage('Look at $n.', bystander, actor);
        expect(msg).toBe('Look at hero.');
      });
    });

    describe('$V token (verb conjugation)', () => {
      it('should use base verb for actor', () => {
        const msg = composeMessage('$N $vsmile happily.', actor, actor);
        expect(msg).toBe('You smile happily.');
      });

      it('should conjugate verb for others', () => {
        const msg = composeMessage('$N $vsmile happily.', bystander, actor);
        expect(msg).toBe('Hero smiles happily.');
      });

      it('should handle capitalized $V', () => {
        const msg = composeMessage('$N $Vcry.', actor, actor);
        expect(msg).toBe('You Cry.');
      });
    });

    describe('$T token (target name)', () => {
      it('should show "You" for the target', () => {
        const msg = composeMessage('$N $vsmile at $T.', target, actor, target);
        expect(msg).toBe('Hero smiles at You.');
      });

      it('should show target name for others', () => {
        const msg = composeMessage('$N $vsmile at $T.', bystander, actor, target);
        expect(msg).toBe('Hero smiles at Acer.');
      });

      it('should handle lowercase $t', () => {
        const msg = composeMessage('$N $vlook at $t.', bystander, actor, target);
        expect(msg).toBe('Hero looks at acer.');
      });
    });

    describe('$P token (actor possessive)', () => {
      it('should show "your" for the actor', () => {
        const msg = composeMessage('$N $vshake $p head.', actor, actor);
        expect(msg).toBe('You shake your head.');
      });

      it('should show possessive pronoun for others viewing male', () => {
        const msg = composeMessage('$N $vshake $p head.', bystander, actor);
        expect(msg).toBe('Hero shakes his head.');
      });

      it('should show possessive pronoun for others viewing female', () => {
        const femaleActor = { name: 'Jane', gender: 'female' as const };
        const msg = composeMessage('$N $vshake $p head.', bystander, femaleActor);
        expect(msg).toBe('Jane shakes her head.');
      });

      it('should show possessive pronoun for others viewing neutral', () => {
        const neutralActor = { name: 'Pat', gender: 'neutral' as const };
        const msg = composeMessage('$N $vshake $p head.', bystander, neutralActor);
        expect(msg).toBe('Pat shakes their head.');
      });
    });

    describe('$R token (reflexive)', () => {
      it('should show "yourself" for the actor', () => {
        const msg = composeMessage('$N $vlook at $r.', actor, actor);
        expect(msg).toBe('You look at yourself.');
      });

      it('should show gendered reflexive for others viewing male', () => {
        const msg = composeMessage('$N $vlook at $r.', bystander, actor);
        expect(msg).toBe('Hero looks at himself.');
      });

      it('should show gendered reflexive for others viewing female', () => {
        const femaleActor = { name: 'Jane', displayName: 'Jane', gender: 'female' as const };
        const msg = composeMessage('$N $vlook at $r.', bystander, femaleActor);
        expect(msg).toBe('Jane looks at herself.');
      });

      it('should show neutral reflexive for neutral gender', () => {
        const neutralActor = { name: 'Pat', displayName: 'Pat', gender: 'neutral' as const };
        const msg = composeMessage('$N $vlook at $r.', bystander, neutralActor);
        expect(msg).toBe('Pat looks at themselves.');
      });
    });

    describe('$O token (object string)', () => {
      it('should insert object string', () => {
        const msg = composeMessage('$N $vsmile $o.', bystander, actor, null, 'happily');
        expect(msg).toBe('Hero smiles happily.');
      });

      it('should handle capitalized $O', () => {
        const msg = composeMessage('$N $vsay, "$O"', bystander, actor, null, 'hello');
        expect(msg).toBe('Hero says, "Hello"');
      });
    });

    describe('$Q token (target possessive)', () => {
      it('should show "your" for the target', () => {
        const msg = composeMessage('$N $vpat $Q back.', target, actor, target);
        expect(msg).toBe('Hero pats Your back.');
      });

      it('should show possessive pronoun for others viewing female target', () => {
        const msg = composeMessage('$N $vpat $q back.', bystander, actor, target);
        expect(msg).toBe('Hero pats her back.');
      });

      it('should show possessive pronoun for others viewing male target', () => {
        const maleTarget = { name: 'Bob', gender: 'male' as const };
        const msg = composeMessage('$N $vpat $q back.', bystander, actor, maleTarget);
        expect(msg).toBe('Hero pats his back.');
      });
    });
  });

  describe('composeAllMessages', () => {
    let actor: MockMudObject;
    let target: MockMudObject;

    beforeEach(() => {
      actor = { name: 'Hero', gender: 'male' };
      target = { name: 'Acer', gender: 'female' };
    });

    it('should compose messages for actor, target, and others', () => {
      const result = composeAllMessages('$N $vsmile at $T.', actor, target);

      expect(result.actor).toBe('You smile at Acer.');
      expect(result.target).toBe('Hero smiles at You.');
      expect(result.others).toBe('Hero smiles at Acer.');
    });

    it('should not include target message when no target', () => {
      const result = composeAllMessages('$N $vsmile.', actor);

      expect(result.actor).toBe('You smile.');
      expect(result.target).toBeUndefined();
      expect(result.others).toBe('Hero smiles.');
    });

    it('should not include target message when target is actor', () => {
      const result = composeAllMessages('$N $vlook at $r.', actor, actor);

      expect(result.actor).toBe('You look at yourself.');
      expect(result.target).toBeUndefined();
      expect(result.others).toBe('Hero looks at himself.');
    });
  });

  describe('makeRemoteMessage', () => {
    it('should add "From afar, " prefix with proper capitalization', () => {
      // Actor viewing their own message - "You" at start becomes lowercase
      expect(makeRemoteMessage('You smile at Acer.')).toBe('From afar, you smile at Acer.');

      // Target viewing - actor name stays capitalized, "You" in middle becomes lowercase
      expect(makeRemoteMessage('Hero smiles at You.')).toBe('From afar, Hero smiles at you.');

      // Third party message - no "You" to change
      expect(makeRemoteMessage('Hero smiles at Acer.')).toBe('From afar, Hero smiles at Acer.');
    });
  });
});
