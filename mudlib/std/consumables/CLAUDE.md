# mudlib/std/consumables/ - Food, Drinks, Potions

Pre-built consumable items extending the Consumable base class.

## Files

- `healing_potion.ts` - 5 strengths: minor(15HP/$25), lesser(30/$50), standard(50/$100), greater(80/$200), major(120/$400)
- `mana_potion.ts` - Mana restoration potions
- `bread.ts`, `apple.ts`, `cooked_meat.ts`, `travel_rations.ts` - Food items
- `hearty_stew.ts` - Complex meal with stat buffs

## Consumable Base (from consumable.ts)

Types: food, drink, potion
Effects: healHp, healMp, regenEffect {duration, healPerTick, tickInterval}, statBuffs [{stat, amount, duration}]
Properties: portions (depleted on use → destroyed), consumeMessage, roomMessage
Auto-verbs: food→eat/consume, drink/potion→drink/quaff

## Creating New Consumables

```typescript
import { Consumable } from '../consumable.js';
export class MyPotion extends Consumable {
  constructor() {
    super();
    this.setConsumable({
      type: 'potion',
      healHp: 50,
      portions: 1,
      consumeMessage: 'You drink the potion.',
      roomMessage: '$N drinks a potion.',
    });
    this.shortDesc = 'a healing potion';
    this.addId('potion');
  }
}
```
