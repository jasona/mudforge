# Announcements

The Announcement System allows administrators to create game-wide announcements that players can view on login and in-game.

## Player Commands

### View Announcements

```
news                 # Open announcements list
news latest          # Show most recent announcement
announcements        # Alias for news
```

### Announcement Modal

The `news` command opens a modal showing:
- List of all announcements (sorted by date)
- Click to view full announcement
- Timestamp and author information

## Administrator Commands

### Create Announcement

```
announce <title>
```

Opens a modal to compose the announcement with:
- Title (pre-filled from command)
- Content (supports markdown formatting)
- Preview before posting

### Manage Announcements

```
announce list        # List all announcements
announce delete <id> # Delete an announcement
announce edit <id>   # Edit an existing announcement
```

## Announcement Properties

Each announcement contains:

| Property | Description |
|----------|-------------|
| `id` | Unique identifier |
| `title` | Announcement title |
| `content` | Full text (markdown supported) |
| `author` | Creator's name |
| `createdAt` | Creation timestamp |
| `updatedAt` | Last edit timestamp (if edited) |

## Login Display

The latest announcement is automatically shown to players on login if:
- There are any announcements
- The announcement is relatively recent

## Persistence

Announcements are saved to `/mudlib/data/announcements/` and persist across server restarts.

## Code Usage (Builders/Admins)

### Creating Announcements

```typescript
const daemon = getAnnouncementDaemon();

const announcement = daemon.create(
  'Server Maintenance',           // Title
  'The server will be down...',   // Content
  'Admin'                         // Author
);
```

### Retrieving Announcements

```typescript
const daemon = getAnnouncementDaemon();

// Get all announcements
const all = daemon.getAll();

// Get latest announcement
const latest = daemon.getLatest();

// Get specific announcement
const specific = daemon.getById('1');
```

### Updating Announcements

```typescript
daemon.update('1', {
  title: 'Updated Title',
  content: 'Updated content...'
});
```

### Deleting Announcements

```typescript
daemon.delete('1');
```

## Best Practices

1. **Keep titles concise**: They appear in list view
2. **Use markdown**: Format content with headers, lists, emphasis
3. **Date important info**: Include dates for time-sensitive announcements
4. **Archive old news**: Delete outdated announcements to keep the list clean
