# Gold System Implementation Plan

## Overview
Add a complete gold/currency mechanic to the MUD including:
- NPCs drop gold when killed (already partially implemented)
- Players can loot gold from corpses
- Gold displayed in inventory and score commands
- Bank system to save gold (protected from death)
- Gold lost on death goes to player's corpse

## Current State Analysis

### What Already Exists
- **NPC gold**: `npc.ts` has `_gold` property, `goldDrop: {min, max}` config, and `generateGoldDrop()` method
- **Corpse gold**: `corpse.ts` has `_gold` property, `lootGold(looter)` method, displays gold in description
- **Death handling**: NPC `onDeath()` creates corpse, generates gold, transfers to corpse
- **Player death code references gold**: `player.ts:1370-1375` tries to recover gold from corpse but player has no `gold` property

### What's Missing
- Player class has no `gold` property
- Gold not in `PlayerSaveData` interface
- Gold not shown in `score` or `inventory` commands
- No way to `get gold from corpse`
- No bank system
- Player death doesn't transfer gold to corpse

## Implementation Steps

### Phase 1: Player Gold Property
**File: `mudlib/std/player.ts`**

1. Add private `_gold: number = 0` and `_bankedGold: number = 0` properties
2. Add public getters/setters for `gold` and `bankedGold`
3. Add `gold: number` and `bankedGold: number` to `PlayerSaveData` interface
4. Update `save()` method to include gold values
5. Update `restore()` method to restore gold values (with backwards compatibility)

### Phase 2: Gold Display
**File: `mudlib/cmds/player/_score.ts`**

1. Add gold to `StatsPlayer` interface
2. Add gold display in full character sheet (in Vitals or new Wealth section)
3. Add gold to brief mode display

**File: `mudlib/cmds/player/_inventory.ts`**

1. At the end of inventory listing, show "Gold: X coins" or "Coin purse: X gold"

### Phase 3: Gold Looting
**File: `mudlib/cmds/player/_get.ts`**

1. Add special handling for "get gold" and "get gold from <corpse>"
2. When target is a Corpse with gold > 0, call `corpse.lootGold(player)`
3. Display message like "You pick up X gold coins."
4. Broadcast to room

### Phase 4: Player Death Gold Transfer
**File: `mudlib/std/player.ts`**

1. In `onDeath()` method (or wherever player corpse is created):
   - Transfer `this.gold` to `corpse.gold`
   - Set `this.gold = 0`
   - Note: banked gold is NOT transferred (safe in bank)
2. When player retrieves corpse/resurrects:
   - Gold should be recovered from corpse automatically (existing code at line 1370+)

### Phase 5: Bank System
**New Files:**
- `mudlib/areas/valdoria/aldric/bank.ts` - Bank room
- `mudlib/npcs/banker.ts` or inline NPC - Bank teller NPC

**Bank Room (`bank.ts`):**
1. Create room extending `Room`
2. Atmospheric description of a sturdy bank building
3. Exit back to center or market
4. Spawn banker NPC in `onCreate()`
5. Add custom commands: `deposit`, `withdraw`, `balance`

**Deposit Command:**
- `deposit <amount>` or `deposit all`
- Validate player has enough gold
- Transfer from `player.gold` to `player.bankedGold`
- Display confirmation

**Withdraw Command:**
- `withdraw <amount>` or `withdraw all`
- Validate player has enough banked gold
- Transfer from `player.bankedGold` to `player.gold`
- Display confirmation

**Balance Command:**
- Show current banked gold amount
- Optionally show carried gold too

**Banker NPC:**
- Simple NPC with chat/response triggers
- Greets players, explains banking
- Not hostile, not killable (or respawns instantly)

### Phase 6: Wire Up Exits
**File: `mudlib/areas/valdoria/aldric/center.ts` or nearby**
1. Add exit to bank from town center or market

**File: `mudlib/master.ts`**
1. Add bank to preload list

## Files to Create
- `mudlib/areas/valdoria/aldric/bank.ts`

## Files to Modify
- `mudlib/std/player.ts` - gold property, save/restore, death handling
- `mudlib/cmds/player/_score.ts` - display gold
- `mudlib/cmds/player/_inventory.ts` - display gold
- `mudlib/cmds/player/_get.ts` - loot gold from corpses
- `mudlib/areas/valdoria/aldric/center.ts` - add bank exit
- `mudlib/master.ts` - preload bank

## Testing Checklist
- [ ] Player gold persists after save/quit/login
- [ ] NPCs drop gold when killed
- [ ] "get gold from corpse" works
- [ ] Score command shows gold
- [ ] Inventory command shows gold
- [ ] Bank deposit works
- [ ] Bank withdraw works
- [ ] Bank balance shows correct amount
- [ ] Player death transfers carried gold to corpse
- [ ] Banked gold survives player death
- [ ] Recovering corpse returns gold

## Design Notes

### Currency System
- Using single "gold" currency for simplicity
- The codebase mentions copper/silver in shop descriptions but those aren't implemented
- Can extend to multi-denomination later if needed

### Starting Gold
- New players start with **0 gold** (must earn everything)

### Bank Location
- **New standalone building** accessible from town center or market
- Exit from center.ts to bank.ts

### Bank Security
- Banked gold is stored on the player object, not in a separate vault
- This simplifies implementation and persistence
- No interest/fees for initial implementation

### Gold Display Format
- Use `{yellow}X gold{/}` for gold amounts (consistent with existing corpse display)
- Consider singular/plural: "1 gold coin" vs "5 gold coins"
