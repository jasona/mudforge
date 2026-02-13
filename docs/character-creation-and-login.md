# Character Creation and Login

This guide covers the full account flow for both first-time and returning players.

## Overview

MudForge supports two login paths:

- **Text login flow** (classic prompt-based)
- **GUI auth flow** (launcher/web client auth messages)

Core logic is in `mudlib/daemons/login.ts`.

## Name Rules

Character names must be:

- 3 to 16 characters
- letters only (`a-z`, case-insensitive)

Names are normalized to capitalized form for storage and lookup.

## Returning Player Login

1. Enter character name.
2. If character exists, enter password.
3. Password is verified (hashed password path, with legacy upgrade support).
4. Character state is restored and connected.

On success:

- location is restored (with safety fallbacks)
- inventory/equipment are restored
- pets/mercenaries are restored
- quest/map/stats/client state is refreshed

## New Character Registration

### Text Flow

The text flow collects:

- name
- password + confirmation
- email (optional but supported)
- gender

Text-flow accounts default to race `human`.

### GUI Flow

GUI registration supports:

- name
- password + confirmation
- email
- gender
- avatar
- race

Invalid race values safely fall back to `human`.

## First Player Bootstrap

If no existing players are found, the first registered character is granted Administrator access automatically.

## Race and Avatar Initialization

On registration:

- race is applied through the race daemon
- race bonuses/abilities are initialized
- avatar is set from selection or sensible defaults

See also `docs/races.md`.

## Where New Players Start

Newly created players are placed in tutorial area:

- `/areas/tutorial/war_camp`

Returning players start at saved location, with safeguards:

- saved void locations are redirected to default town location
- tutorial-complete players saved in tutorial areas are redirected to town

## Reconnection and Session Takeover

During login, the daemon checks for an already-active player object:

- if found and connected: new login can take over the existing session
- if found but disconnected: reconnect rebinds and resumes

See `docs/connection-and-session-lifecycle.md`.

## Security Notes

- Password hashing/verification uses efun-backed secure helpers when available.
- Legacy plain-text password fields are migrated to hash on successful login.
- Email is stored as account metadata.

## Builder/Admin Customization Points

Common places to customize:

- welcome banner text and branding
- registration fields and validation rules
- starting locations and onboarding gates
- first-player bootstrap policy
- reconnect messaging behavior

Primary file: `mudlib/daemons/login.ts`.

## Related Docs

- `docs/tutorial-system.md`
- `docs/races.md`
- `docs/player-features.md`
- `docs/connection-and-session-lifecycle.md`
