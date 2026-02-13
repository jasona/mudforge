# Banking and Gold Economy

This guide explains currency flow, banking behavior, and player-facing banking commands.

## Overview

MudForge tracks two gold pools per player:

- **Carried gold** (`gold`): on-character currency, vulnerable on death
- **Banked gold** (`bankedGold`): account currency, protected from death loss

Core player currency methods are in `mudlib/std/player.ts`.

## Currency Behavior

### Carried Gold

- used for normal spending/trading
- moved to corpse on player death
- can be dropped, looted, and transferred

### Banked Gold

- stored in bank account balance
- not dropped on death
- must be withdrawn before use where physical gold is required

## Bank Location and Commands

Reference bank room:

- `mudlib/areas/valdoria/aldric/bank.ts`

Bank actions are room-scoped:

```text
deposit <amount>
deposit all
withdraw <amount>
withdraw all
balance
```

## Command Semantics

### Deposit

- Transfers from carried gold to banked gold.
- `deposit all` deposits all carried gold.
- Fails if amount invalid or insufficient carried gold.

### Withdraw

- Transfers from banked gold to carried gold.
- `withdraw all` withdraws full account balance.
- Fails if amount invalid or insufficient banked gold.

### Balance

Shows:

- account holder
- banked balance
- gold on hand

## Death Interaction

On death:

- carried gold transfers to corpse
- banked gold remains untouched

This makes banking a major risk-management tool.

## Builder Notes

To add banking in custom areas:

1. create a room that registers `deposit` / `withdraw` / `balance` actions
2. call player currency helpers (`depositGold`, `withdrawGold`)
3. provide clear failure/success messaging

## Economy Design Tips

- place banks in high-traffic safe hubs
- encourage deposit behavior before dangerous zones
- align merchant prices with expected carry vs bank usage
- test death loop so recovery remains meaningful but not punitive

## Related Docs

- `docs/player-features.md`
- `docs/death-resurrection.md`
- `docs/merchants.md`
