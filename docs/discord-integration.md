# Discord Integration

MudForge integrates with Discord to provide a two-way message bridge between a Discord channel and an in-game "discord" channel. Players in-game see Discord messages, and Discord users see in-game messages.

## Overview

The Discord integration provides:

- **Two-Way Message Bridge**: Messages flow seamlessly between Discord and in-game
- **Real-Time Sync**: Discord users and players communicate in real-time
- **Player Name Formatting**: In-game messages show as `**PlayerName**: message` on Discord
- **Discord User Formatting**: Discord messages show as `[Discord] Username: message` in-game
- **Admin Commands**: Configure and manage the bridge via `discordadmin` command
- **Auto-Connect on Startup**: Optionally connect automatically when the server starts

## Quick Start

### 1. Create a Discord Bot

1. Visit the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" in the left sidebar
4. Click "Add Bot"
5. Under "Privileged Gateway Intents", enable:
   - **Message Content Intent** (required to read message content)
   - **Server Members Intent** (optional, for display names)
6. Click "Reset Token" and copy the token

### 2. Invite the Bot to Your Server

1. Go to "OAuth2" > "URL Generator" in the Developer Portal
2. Select scopes: `bot`
3. Select permissions:
   - Read Messages/View Channels
   - Send Messages
   - Read Message History
4. Copy the generated URL and open it in your browser
5. Select your server and authorize

### 3. Get Server and Channel IDs

1. In Discord, go to User Settings > Advanced
2. Enable "Developer Mode"
3. Right-click your server name > "Copy Server ID" (this is the Guild ID)
4. Right-click the channel you want to bridge > "Copy Channel ID"

### 4. Configure Environment

Add to your `.env` file:

```env
DISCORD_ENABLED=true
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here
DISCORD_CHANNEL_ID=your_channel_id_here
```

### 5. Restart Server

```bash
npm run dev
```

The Discord bridge will connect automatically on startup.

## Message Flow

```
In-Game Player                 MudForge Server                 Discord
      │                              │                            │
      │  "discord Hello!"            │                            │
      │  ─────────────────────────►  │                            │
      │                              │  Send to Discord           │
      │                              │  ─────────────────────────►│
      │                              │                            │  **PlayerName**: Hello!
      │                              │                            │
      │                              │                            │
      │                              │         Message received   │
      │                              │  ◄─────────────────────────│
      │  [Discord] Username: Hi!     │                            │
      │  ◄─────────────────────────  │                            │
      │                              │                            │
```

## User Guide

### Sending Messages to Discord

Use the `discord` channel like any other communication channel:

```
discord Hello from the MUD!
discord :waves at Discord users
```

**What Discord users see:**
```
**YourPlayerName**: Hello from the MUD!
**YourPlayerName**: *waves at Discord users*
```

### Receiving Messages from Discord

When Discord users send messages in the bridged channel, you'll see:

```
[Discord] DiscordUsername: Hey everyone!
```

### Channel Subscription

The `discord` channel works like other channels. You can:

```
channels                    # List all channels (discord will appear)
-discord                    # Unsubscribe from discord channel
+discord                    # Subscribe to discord channel
```

## Admin Commands

The `discordadmin` command provides full control over the Discord bridge.

### Status

View the current configuration and connection status:

```
discordadmin status
```

Output:
```
Discord Channel Bridge Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  State:      connected
  Enabled:    Yes
  Bot Token:  Set
  Guild ID:   123456789012345678
  Channel ID: 987654321098765432
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Configure

Set the Discord server (guild) and channel IDs:

```
discordadmin configure <guildId> <channelId>
```

Example:
```
discordadmin configure 123456789012345678 987654321098765432
```

### Enable

Connect to Discord and enable the bridge:

```
discordadmin enable
```

This will:
1. Connect to Discord using the configured token
2. Register the `discord` channel
3. Start forwarding messages

### Disable

Disconnect from Discord and disable the bridge:

```
discordadmin disable
```

### Test

Send a test message to verify the connection:

```
discordadmin test
```

This sends a timestamped test message to Discord.

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_ENABLED` | No | Set to `true` to auto-connect on startup |
| `DISCORD_BOT_TOKEN` | Yes | Your Discord bot token |
| `DISCORD_GUILD_ID` | Yes | The Discord server (guild) ID |
| `DISCORD_CHANNEL_ID` | Yes | The Discord channel ID to bridge |

### In-Game Settings

Administrators can view and modify Discord settings using the `config` command:

```
config discord.enabled          # View current setting
config set discord.enabled true # Enable Discord
config discord.guildId          # View guild ID
config discord.channelId        # View channel ID
```

**Note:** The bot token is NOT stored in the config daemon for security. It must be set via environment variable.

### Available Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `discord.enabled` | boolean | `false` | Enable/disable the Discord bridge |
| `discord.guildId` | string | `''` | Discord server (guild) ID |
| `discord.channelId` | string | `''` | Discord channel ID to bridge |

## Efuns Reference

### discordIsConnected()

Check if Discord is currently connected.

```typescript
if (efuns.discordIsConnected()) {
  // Discord is connected and ready
}
```

### discordGetState()

Get the current connection state.

```typescript
const state = efuns.discordGetState();
// Returns: 'disconnected', 'connecting', 'connected', or 'reconnecting'
```

### discordGetConfig()

Get the current Discord configuration.

```typescript
const config = efuns.discordGetConfig();
if (config) {
  console.log(config.guildId);    // Guild ID
  console.log(config.channelId);  // Channel ID
}
```

### discordConnect(config)

Connect to Discord with the given configuration.

```typescript
const success = await efuns.discordConnect({
  token: 'your_bot_token',
  guildId: '123456789012345678',
  channelId: '987654321098765432',
});

if (success) {
  console.log('Connected to Discord!');
}
```

**Parameters:**
- `config.token: string` - Discord bot token
- `config.guildId: string` - Discord server (guild) ID
- `config.channelId: string` - Discord channel ID

**Returns:** `Promise<boolean>` - `true` if connected successfully

### discordDisconnect()

Disconnect from Discord.

```typescript
await efuns.discordDisconnect();
```

### discordSend(playerName, message)

Send a message to Discord.

```typescript
const success = await efuns.discordSend('PlayerName', 'Hello Discord!');
// Discord shows: **PlayerName**: Hello Discord!
```

**Parameters:**
- `playerName: string` - Name to display as the sender
- `message: string` - Message content

**Returns:** `Promise<boolean>` - `true` if sent successfully

### discordOnMessage(callback)

Register a callback to receive Discord messages.

```typescript
efuns.discordOnMessage((author, content) => {
  console.log(`Discord message from ${author}: ${content}`);
});
```

**Parameters:**
- `callback: (author: string, content: string) => void` - Function called when a message is received

## Architecture

### Three-Layer Design

The Discord integration follows the same pattern as other external integrations (Grapevine, Intermud):

```
┌─────────────────────────────────────────────────────────────┐
│                     Network Layer                            │
│                src/network/discord-client.ts                 │
│  - discord.js connection management                          │
│  - Event handling (message, connect, disconnect)             │
│  - Message sending/receiving                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Efun Bridge                              │
│                src/driver/efun-bridge.ts                     │
│  - Exposes Discord functions to mudlib                       │
│  - discordConnect, discordSend, discordOnMessage, etc.       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Daemon Layer                             │
│                mudlib/daemons/discord.ts                     │
│  - State management                                          │
│  - Configuration                                             │
│  - Message routing to/from channel daemon                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Channel Integration                      │
│                mudlib/daemons/channels.ts                    │
│  - 'discord' channel registration                            │
│  - Message broadcasting to players                           │
│  - Forwarding player messages to Discord                     │
└─────────────────────────────────────────────────────────────┘
```

### Files

| File | Purpose |
|------|---------|
| `src/network/discord-client.ts` | Discord.js client wrapper |
| `src/driver/config.ts` | Driver configuration (environment variables) |
| `src/driver/efun-bridge.ts` | Efuns for Discord operations |
| `src/driver/driver.ts` | Auto-connect on startup |
| `mudlib/daemons/discord.ts` | Discord daemon (state & routing) |
| `mudlib/daemons/channels.ts` | Channel integration |
| `mudlib/daemons/config.ts` | In-game config settings |
| `mudlib/cmds/admin/_discordadmin.ts` | Admin command |
| `mudlib/efuns.d.ts` | Type declarations |

### Data Flow: In-Game to Discord

```
Player types: "discord Hello!"
        │
        ▼
channels.ts:send()
        │
        ├──► Broadcast to local players: [Discord] PlayerName: Hello!
        │
        └──► channel.source === 'discord'
                    │
                    ▼
             sendToDiscord()
                    │
                    ▼
             discord.ts:sendToDiscord()
                    │
                    ▼
             efuns.discordSend('PlayerName', 'Hello!')
                    │
                    ▼
             discord-client.ts:sendMessage()
                    │
                    ▼
             Discord shows: **PlayerName**: Hello!
```

### Data Flow: Discord to In-Game

```
Discord user sends message
        │
        ▼
discord-client.ts receives message
        │
        └──► Filter: ignore bot messages
        │
        ▼
efunBridge.discordOnMessage callback
        │
        ▼
discord.ts:receiveFromDiscord(author, content)
        │
        ▼
channels.ts:receiveDiscordMessage(author, content)
        │
        ├──► Add to channel history
        │
        └──► Broadcast to subscribers:
             [Discord] DiscordUsername: message
```

## Discord Daemon API

The Discord daemon provides programmatic control over the bridge.

```typescript
import { getDiscordDaemon } from '../daemons/discord.js';

const daemon = getDiscordDaemon();

// Configure the connection
await daemon.configure('123456789', '987654321');

// Enable and connect
const result = await daemon.enable();
if (!result.success) {
  console.log(result.error);
}

// Check status
const status = daemon.getStatus();
console.log(status.connected);  // true/false
console.log(status.state);      // 'connected', 'disconnected', etc.

// Send a message
await daemon.sendToDiscord('System', 'Server is restarting!');

// Disable and disconnect
await daemon.disable();
```

### Methods

| Method | Description |
|--------|-------------|
| `configure(guildId, channelId)` | Set the Discord server and channel IDs |
| `enable()` | Connect to Discord and enable the bridge |
| `disable()` | Disconnect and disable the bridge |
| `sendToDiscord(name, message)` | Send a message to Discord |
| `receiveFromDiscord(author, content)` | Handle incoming Discord message |
| `getStatus()` | Get current connection status |
| `isConnected()` | Check if connected |

## Error Handling

### Connection Errors

If the bot fails to connect, check:

1. **Invalid Token**: Verify the bot token is correct and hasn't been regenerated
2. **Missing Intents**: Ensure Message Content Intent is enabled in Developer Portal
3. **Bot Not in Server**: Make sure the bot is invited to the correct server
4. **Invalid IDs**: Verify guild and channel IDs are correct (18-digit numbers)
5. **Channel Not Found**: Ensure the channel exists and bot has access

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `DISCORD_BOT_TOKEN environment variable not set` | No token configured | Add token to `.env` file |
| `Guild not found` | Invalid guild ID or bot not in server | Check guild ID, invite bot |
| `Channel not found` | Invalid channel ID or wrong guild | Check channel ID |
| `Channel is not a text channel` | Trying to bridge a voice/category | Use a text channel |
| `Failed to connect to Discord` | Network or auth error | Check token and network |

### Auto-Reconnection

The Discord client automatically handles reconnection when the connection is lost:

1. Connection lost → State changes to `reconnecting`
2. Discord.js attempts to reconnect automatically
3. On success → State returns to `connected`
4. Messages are not lost during brief disconnections

## Security Considerations

### Bot Token Security

- **Never commit tokens to git** - Use environment variables
- **Regenerate if exposed** - If a token is leaked, regenerate it immediately
- **Token is not stored in-game** - Only accessible via environment variable

### Message Filtering

- Bot's own messages are ignored (prevents message loops)
- Only messages from the configured channel are processed
- Empty messages are ignored

### Permissions

- `discordadmin` command requires Administrator permission (level 3)
- Regular players can only send/receive via the `discord` channel
- Channel subscription follows normal channel rules

## Performance

### Message Handling

- Messages are processed asynchronously
- Discord.js handles rate limiting automatically
- No message queue - messages are sent immediately

### Connection Overhead

- Single WebSocket connection to Discord
- Heartbeat handled by Discord.js
- Minimal CPU/memory overhead

## Troubleshooting

### Discord Not Connecting

1. Run `discordadmin status` to check configuration
2. Verify `DISCORD_BOT_TOKEN` is set in environment
3. Check server logs for connection errors
4. Ensure bot has proper permissions in Discord

### Messages Not Appearing in Discord

1. Verify bot has "Send Messages" permission in the channel
2. Check that the channel ID is correct
3. Run `discordadmin test` to verify connection

### Messages Not Appearing In-Game

1. Verify you're subscribed to the `discord` channel (`+discord`)
2. Check that messages aren't from the bot itself
3. Verify Message Content Intent is enabled

### Bot Goes Offline

1. Check server logs for disconnection reasons
2. Verify network connectivity
3. The bot should auto-reconnect within a few seconds
4. If persistent, check Discord API status

## Example: Custom Integration

You can use the Discord efuns for custom integrations:

```typescript
// Announce server events to Discord
export async function announceToDiscord(message: string): Promise<void> {
  if (!efuns.discordIsConnected()) {
    console.log('Discord not connected, skipping announcement');
    return;
  }

  await efuns.discordSend('Server', message);
}

// Usage
announceToDiscord('The dragon has been slain by Hero!');
announceToDiscord('Server maintenance in 5 minutes');
```

## Related Documentation

- [Channels System](daemons.md#channels-daemon) - Channel daemon details
- [Grapevine Integration](giphy-integration.md) - Similar external chat integration
- [Commands Reference](commands.md) - All admin commands
- [Efuns Reference](efuns.md) - Complete efuns API
- [Configuration](mudlib-guide.md#configuration) - Config daemon guide
