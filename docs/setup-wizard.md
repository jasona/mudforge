# Setup Wizard

The setup wizard is a first-run configuration interface that guides new game owners through initial game setup. It appears automatically when no admin account exists.

## Overview

The wizard provides a 5-step flow:

1. **Welcome** - Introduction to MudForge
2. **Game Identity** - Name, tagline, description, website, established year
3. **Game Logo** - Upload a custom logo image
4. **Game Mechanics** - Configure gameplay settings
5. **Review & Complete** - Confirm settings and create admin account

## Trigger Condition

The setup wizard is shown when:

1. The client loads and fetches `GET /api/config`
2. The response contains `setupComplete: false`
3. The launcher renders the setup wizard instead of the normal login form

After completion, `setupComplete` is set to `true` and the launcher transitions to the standard login/registration interface.

## Wizard Steps

### Step 1: Welcome

A brief introduction explaining what MudForge is and what the wizard will configure. No input required.

### Step 2: Game Identity

| Field | Required | Description |
|-------|----------|-------------|
| Game Name | Yes | The name of your MUD |
| Tagline | No | Short tagline displayed on the login screen |
| Description | No | Longer description of your game world |
| Website | No | External website URL |
| Established Year | No | Year the game was founded |

### Step 3: Game Logo

Upload a custom logo image for the login screen:

- Supported formats: PNG, JPEG, SVG
- Maximum file size: 256KB
- Uploaded as a data URI and stored in game config

### Step 4: Game Mechanics

Configurable gameplay settings organized by category, presented as toggles, number inputs, and select dropdowns. Settings are fetched from `GET /api/setup/defaults` which returns setting metadata including types and valid ranges.

### Step 5: Review & Complete

Shows a summary of the configured game name and tagline. On confirmation, the wizard:

1. Submits all configuration via `POST /api/setup`
2. Creates the admin account
3. Transitions to the normal launcher

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/config` | GET | Returns game config including `setupComplete` flag |
| `/api/setup/defaults` | GET | Returns setting definitions with types and defaults |
| `/api/setup` | POST | Submit game config (name, tagline, logo, settings) |

### POST /api/setup Payload

```typescript
{
  game: {
    name: string,
    tagline?: string,
    description?: string,
    website?: string,
    established?: number,
  },
  logo?: string,        // data URI
  settings: Record<string, unknown>,
}
```

## UI Features

- Step indicator dots showing progress through the wizard
- Validation (game name is required)
- Values persist when navigating back and forth between steps
- Error display for failed submissions

## Launcher Integration

The launcher (`src/client/launcher.ts`) handles the overall pre-game flow:

1. Fetch game config from `/api/config`
2. If `setupComplete` is false, show the setup wizard
3. After wizard completion (or if already set up), show the login/registration UI

The launcher itself provides:

- Login form (username, password)
- Registration modal (name, password, email, gender, race picker, avatar picker)
- Announcement section (latest news)
- Race selection with stat bonuses and ability previews

## Key Source Files

- `src/client/setup-wizard.ts` - Setup wizard UI (`SetupWizard` class)
- `src/client/launcher.ts` - Launcher with login/registration (`Launcher` class)

## Related Docs

- [Getting Started](getting-started.md) - Initial server setup
- [Client](client.md) - Web client overview
