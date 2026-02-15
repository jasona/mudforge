# mudlib/help/ - Help System

## Structure

```
help/
├── player/           - Player-accessible help topics
├── builder/          - Builder documentation
├── admin/            - Admin command reference
├── classes/          - Class/guild-specific topics
│   ├── fighter/
│   └── thief/
└── index.ts          - Central initialization
```

## Initialization

`initializeHelp()` in `index.ts` registers all help topics on startup:
```typescript
registerPlayerHelp(playerBasics);
registerBuilderHelp(builderBasics);
registerAdminHelp(adminCommands);
registerClassHelp('fighter', fighterSkills);
```

## Access Control

Help topics are permission-gated. Players only see player-level topics. Builders see builder+player topics. Admins see all.

## Help Daemon

Managed by `daemons/help.ts` (~1306 lines). Provides search, topic listing, and formatted display.
