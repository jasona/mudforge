# Party System

The Party System enables players to group together for cooperative gameplay, with features for experience sharing, gold splitting, coordinated movement, and synchronized combat assistance.

## Overview

- **Minimum Size**: 2 members
- **Maximum Size**: 6 members
- **Auto-Disband**: Party disbands if it drops below 2 members

## Basic Commands

| Command | Description |
|---------|-------------|
| `party` | Show party status |
| `party help` | Display help |
| `party invite <player>` | Invite a player |
| `party accept` | Accept pending invite |
| `party decline` | Decline pending invite |
| `party leave` | Leave the party |
| `party kick <player>` | Remove a member (leader only) |
| `party disband` | Disband the party (leader only) |
| `party leader <player>` | Transfer leadership |
| `party follow` | Toggle follow mode |
| `party assist` | Toggle auto-assist |
| `party split` | Toggle gold auto-split (leader only) |
| `party say <message>` | Send party chat |
| `psay <message>` | Quick party chat |

## Creating and Joining Parties

### Creating a Party

Any player can create a party by inviting another player:

```
party invite hero
```

The inviter automatically becomes the party leader. The party is created when the first invite is sent.

### Accepting Invites

Invited players see a notification and can respond:

```
party accept    # Join the party
party decline   # Reject the invite
```

Invites expire after 60 seconds.

### Leaving a Party

```
party leave
```

If only 2 members remain after someone leaves, the party automatically disbands.

## Party Leadership

### Leader Abilities

Only the party leader can:
- Invite new members
- Kick members
- Disband the party
- Toggle gold auto-split
- Transfer leadership

### Transferring Leadership

```
party leader otherhero
```

### Auto-Promotion

When the leader disconnects or leaves:
1. Leadership transfers to the longest-standing online member
2. If no one is online, falls back to the first offline member

## Party Status Display

```
party
```

Shows:
- Member count and capacity
- Leader marked with yellow star (★)
- Online status: green dot (●) = online, red circle (○) = offline
- Follow status: cyan arrow (→)
- Auto-assist status: red sword (⚔)

For detailed statistics:

```
party stats
```

Shows contribution tracking:
- Kills per member
- XP earned per member
- Gold earned per member
- Party totals

## Experience Sharing

When a party member kills an NPC:
- XP is split equally among eligible members
- Members must be online and in the same room
- Each member receives: `totalXP / memberCount`

Message displayed:
```
(Party XP: 150 each from Forest Wolf)
```

## Gold Sharing

### Auto-Split Mode

The leader can enable automatic gold splitting:

```
party split
```

When enabled:
- Gold from NPC corpses is automatically divided
- Split happens immediately at death
- Remainder (if any) goes to the killer
- Members must be online and in the same room

Message displayed:
```
[Auto-split] You receive 25 gold.
```

Toggle off with the same command:

```
party split
```

## Follow System

Members can automatically follow the party leader:

```
party follow
```

When enabled:
- You move automatically when the leader moves
- You must be in the same room as the leader
- Combat blocks following (you stay behind)
- Leaders cannot use follow (they are followed)

Message displayed:
```
You follow Hero north.
```

Toggle off:

```
party follow
```

## Auto-Assist (Combat Cooperation)

Members can automatically join combat when the leader attacks:

```
party assist
```

When enabled:
- You automatically attack when the leader initiates combat
- You must be in the same room as the leader
- You must not already be in combat
- Leaders cannot use auto-assist

Message displayed:
```
[Auto-assist] You join Hero in attacking Forest Wolf!
```

Toggle off:

```
party assist
```

## Party Chat

Send messages to all online party members:

```
party say Let's head to the dungeon
psay Watch out for traps!
```

You see:
```
[Party] You say: Let's head to the dungeon
```

Others see:
```
[Party] Hero says: Let's head to the dungeon
```

## Connection Handling

### Disconnection

When a member disconnects:
- Status changes to 'offline'
- Follow mode is disabled
- Party is notified: "Hero has gone link-dead."
- If leader disconnects, new leader is promoted

### Reconnection

When a member reconnects:
- Status changes back to 'online'
- Party is notified: "Hero has reconnected."
- Member rejoins the same party automatically

## Integration with Other Systems

### Combat

- Auto-assist triggers when leader attacks
- All attackers get kill credit for quest objectives
- Combat music starts for all participants

### Quests

- Kill contributions are tracked for all party members
- Shared objectives can be completed cooperatively

### Loot

- Gold auto-split works with corpse loot
- Item loot is not automatically distributed

## Restrictions and Limits

| Action | Restriction |
|--------|-------------|
| Invite | Leader only |
| Kick | Leader only, cannot kick self |
| Disband | Leader only |
| Split | Leader only |
| Follow | Cannot use if you are leader |
| Assist | Cannot use if you are leader |
| Accept | Must have pending invite |
| Leave | Cannot if it would leave party below 2 members |

## Example Session

```
# Hero creates a party
> party invite wizard
You invite Wizard to join your party.

# Wizard accepts
> party accept
You have joined Hero's party.

# Hero enables auto-split
> party split
Auto-split enabled. Gold will be divided among party members.

# Wizard enables follow
> party follow
You are now following Hero.

# Hero moves north, Wizard follows automatically
> north
You follow Hero north.

# Combat - party fights together
> kill wolf
[Auto-assist] Wizard joins you in attacking Forest Wolf!

# Wolf dies, rewards split
(Party XP: 75 each from Forest Wolf)
[Auto-split] You receive 12 gold.

# Party chat
> psay Good fight!
[Party] You say: Good fight!
```

## Tips

1. **Coordinate Movement**: Use follow mode to keep the party together
2. **Enable Auto-Assist**: Speeds up combat by having everyone attack together
3. **Use Auto-Split**: Prevents arguments over gold distribution
4. **Check Status**: Use `party stats` to see contribution tracking
5. **Stay Together**: XP/gold sharing requires being in the same room
