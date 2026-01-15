/**
 * Master Vorn - The combat trainer.
 *
 * A grizzled veteran who trains adventurers in combat skills.
 */

import { Living, Room } from '../../../lib/std.js';
import { Trainer } from '../../../std/trainer.js';

export class MasterVorn extends Trainer {
  constructor() {
    super();

    this.setNPC({
      name: 'Master Vorn',
      shortDesc: 'Master Vorn, the combat trainer',
      longDesc: `Master Vorn is a grizzled veteran with more scars than hair remaining
on his weathered head. His arms are thick with muscle despite his age,
and his eyes hold the sharp awareness of someone who has survived
countless battles. He wears simple training clothes - a loose tunic
and leather pants - but carries himself with the quiet confidence of
a master warrior. A wooden training sword rests against the wall
beside him, well-worn from years of instruction.`,
      gender: 'male',
      maxHealth: 200,
      health: 200,
      chatChance: 10,
    });

    this.addId('vorn');
    this.addId('master');
    this.addId('trainer');
    this.addId('master vorn');
    this.addId('combat trainer');

    // Configure trainer capabilities
    this.setTrainerConfig({
      canTrainLevel: true,
      // Trains all stats
      greeting: "Ah, another soul seeking to grow stronger! Let's see what you've got.",
      costMultiplier: 1.0,
    });

    // Set up stats - he's a tough old warrior
    this.setBaseStats({
      strength: 18,
      dexterity: 14,
      constitution: 16,
      intelligence: 12,
      wisdom: 14,
      charisma: 10,
      luck: 10,
    });

    this.setupChats();
    this.setupResponses();
  }

  private setupChats(): void {
    this.addChat('stretches his arms and cracks his knuckles.', 'emote');
    this.addChat('Practice makes perfect. Never stop training.', 'say');
    this.addChat('examines a training dummy critically.', 'emote');
    this.addChat('The body and mind must grow together.', 'say');
    this.addChat('picks up a wooden sword and swings it experimentally.', 'emote');
    this.addChat('Every scar tells a story. Learn from each one.', 'say');
    this.addChat("I've trained warriors who went on to become legends.", 'say');
  }

  private setupResponses(): void {
    // Respond to greetings
    this.addResponse(
      /hello|hi|greetings|hey/i,
      (speaker) => `Welcome, ${speaker.name || 'adventurer'}. Ready to work on your skills?`,
      'say'
    );

    // Respond to training questions
    this.addResponse(
      /train|learn|teach|stronger|level/i,
      "Type 'train' to see what I can help you with. I can improve your combat abilities and help you reach new heights of power.",
      'say'
    );

    // Respond to thanks
    this.addResponse(
      /thank|thanks/i,
      'nods approvingly.',
      'emote'
    );

    // Respond to questions about himself
    this.addResponse(
      /who are you|your name|yourself/i,
      "I am Master Vorn. I've spent forty years mastering the arts of combat, and now I pass that knowledge to the next generation.",
      'say'
    );

    // Respond to questions about experience
    this.addResponse(
      /experience|xp|cost/i,
      "Training requires experience points. The more skilled you become, the harder it is to improve further. Type 'train' to see the costs.",
      'say'
    );

    // Respond to questions about stats
    this.addResponse(
      /stat|strength|dex|int|wis|con|cha|luck/i,
      "I can train all of your core attributes - strength, dexterity, constitution, intelligence, wisdom, charisma, and even luck. Each makes you stronger in different ways.",
      'say'
    );
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    if (typeof efuns !== 'undefined' && efuns.setHeartbeat) {
      efuns.setHeartbeat(this, true);
    }
  }

  override async onEnter(who: Living, from?: Room): Promise<void> {
    const random = Math.random() * 100;
    if (random < 40) {
      setTimeout(() => {
        const name = who.name || 'adventurer';
        this.say(`Ah, ${name}. Come to train, have you?`);
      }, 1000);
    }
  }
}

export default MasterVorn;
