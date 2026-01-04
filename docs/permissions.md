# Permission System

MudForge includes a tiered permission system that controls who can read, write, and execute game files.

## Permission Levels

| Level | Value | Description |
|-------|-------|-------------|
| Player | 0 | Regular players - can only play the game |
| Builder | 1 | Can edit files in assigned domains |
| SeniorBuilder | 2 | Can edit /lib/, expanded access |
| Administrator | 3 | Full access to everything |

## How Permissions Work

### Read Access

- **Players**: Can read `/std/`, `/areas/`, `/lib/`
- **Builders**: Can read all mudlib files
- **Administrators**: Can read everything

### Write Access

- **Players**: Cannot write any files
- **Builders**: Can write to their assigned domains only
- **SeniorBuilders**: Can also write to `/lib/`
- **Administrators**: Can write everywhere

### Protected Paths

These paths require administrator access to modify:

- `/std/` - Standard library classes
- `/core/` - Core driver hooks
- `/daemon/` - System daemons
- `/master.ts` - Master object
- `/simul_efun.ts` - Simulated efuns

## Domains

Domains are directory paths that builders are allowed to edit. Each builder can be assigned multiple domains.

```
Example domains:
- /areas/castle/     - Full access to castle area
- /areas/forest/     - Full access to forest area
```

## Managing Permissions

### Granting Permission Levels

Administrators can grant permission levels using the `grant` command:

```
grant playername builder
grant playername seniorbuilder
grant playername admin
```

### Revoking Permissions

```
revoke playername
```

This resets the player to normal Player level.

### Managing Domains

Add a domain to a builder:
```
adddomain playername /areas/myzone/
```

Remove a domain:
```
rmdomain playername /areas/myzone/
```

List domains:
```
domains playername
```

### Viewing Audit Log

View recent permission changes:
```
audit 20
```

## Using Permissions in Code

### Checking Permissions

```typescript
// Check if current player can read a path
if (efuns.checkReadPermission('/areas/secret/')) {
  // Can read
}

// Check if current player can write to a path
if (efuns.checkWritePermission('/areas/myzone/')) {
  // Can write
}
```

### Checking Permission Level

```typescript
// Check if player is an administrator
if (efuns.isAdmin()) {
  // Admin-only code
}

// Check if player is a builder (or higher)
if (efuns.isBuilder()) {
  // Builder-only code
}

// Get exact permission level
const level = efuns.getPermissionLevel();
// 0=Player, 1=Builder, 2=SeniorBuilder, 3=Administrator
```

### Getting Assigned Domains

```typescript
const domains = efuns.getDomains();
// Returns: string[] (e.g., ['/areas/castle/', '/areas/forest/'])
```

## Audit Logging

All permission changes are logged for security:

```typescript
interface AuditEntry {
  timestamp: number;
  action: 'grant' | 'revoke' | 'addDomain' | 'removeDomain';
  target: string;      // Who was affected
  admin: string;       // Who made the change
  details: string;     // What changed
}
```

The audit log is retained in memory and can be viewed with the `audit` command.

## Best Practices

1. **Principle of Least Privilege**: Only grant the minimum permissions needed
2. **Use Domains**: Give builders access to specific areas, not everything
3. **Review Audit Logs**: Regularly check for unusual permission changes
4. **Protect Sensitive Paths**: Keep `/std/`, `/core/`, `/daemon/` admin-only
5. **Test Permission Checks**: Verify your code properly checks permissions before sensitive operations

## Configuration

Permission data is stored in player save files:

```json
{
  "name": "Builder1",
  "permissionLevel": 1,
  "domains": ["/areas/castle/", "/areas/forest/"]
}
```

Administrators can be configured in the driver configuration file.
