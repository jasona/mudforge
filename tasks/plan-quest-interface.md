# Active Quests Client Interface Implementation Plan

## Overview
Add a docked "Active Quests" sidebar on the left side of the client interface that shows the last 3 accepted quests with progress. Clicking a quest name opens a GUI modal with details of all active quests.

## Architecture

### New Components
1. **QuestPanel** (`src/client/quest-panel.ts`) - Docked sidebar component
2. **Quest Message Protocol** - New `[QUEST]` WebSocket message type
3. **Quest GUI Modal** - Server-side GUI modal for full quest details

### Data Flow
```
Quest State Change (accept/progress/complete)
  → QuestDaemon triggers update
  → EfunBridge.sendQuestUpdate()
  → WebSocket [QUEST] message
  → Client QuestPanel updates display

Quest Click
  → Client sends [GUI] message with action
  → Server receives and opens quest log GUI modal
```

---

## Implementation Steps

### 1. Add Quest Container to HTML
**File:** `src/client/index.html`

Add quest container div inside `#main-content`, before `#terminal-container`:
```html
<main id="main-content">
  <div id="quest-container" aria-label="Active quests"></div>
  <div id="terminal-container">
    <!-- existing content -->
  </div>
</main>
```

### 2. Add Quest Message Type (Client)
**File:** `src/client/websocket-client.ts`

- Add `QuestMessage` interface:
  ```typescript
  interface QuestMessage {
    type: 'update';
    quests: Array<{
      questId: string;
      name: string;
      progress: number;     // 0-100 percentage
      progressText: string; // e.g., "3/5 rats killed"
      status: 'active' | 'completed';
    }>;
  }
  ```
- Add `'quest-message'` to `WebSocketClientEvent` type
- Add `[QUEST]` prefix handler in `onmessage` (around line 227)

### 3. Create Quest Panel Component
**New File:** `src/client/quest-panel.ts`

Create a docked sidebar component:
- Fixed width (~200px) docked on left side
- Header: "Active Quests" with collapse toggle
- Show last 3 quests (most recent first, by `acceptedAt`)
- Each quest entry shows:
  - Quest name (clickable, opens full quest modal)
  - Progress bar (green gradient for complete, yellow for in-progress)
  - Brief objective summary text
- Empty state when no active quests
- Collapsed state saves to localStorage

### 4. Add CSS Styles
**File:** `src/client/styles.css`

Add styles for quest sidebar:
```css
/* Quest Sidebar - Docked Left */
#quest-container {
  width: 220px;
  min-width: 220px;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.quest-panel { /* inner panel */ }
.quest-panel-header { /* title bar with collapse toggle */ }
.quest-panel-content { /* scrollable quest list */ }
.quest-item { /* individual quest entry */ }
.quest-name { /* clickable title */ }
.quest-progress { /* progress bar container */ }
.quest-progress-bar { /* filled progress */ }
.quest-progress-text { /* objective text */ }
```

Color states:
- Active quest: yellow accent
- Completed quest: green accent, ready to turn in indicator

### 5. Integrate Quest Panel in Client
**File:** `src/client/client.ts`

- Import and instantiate `QuestPanel`
- Add event handler for `'quest-message'`
- Pass callback for quest clicks → sends request to server for full quest GUI

### 6. Add Server-Side Quest Updates
**File:** `src/driver/efun-bridge.ts`

Add `sendQuestUpdate()` method:
- Gets player's active quests from QuestDaemon
- Sorts by `acceptedAt` descending (most recent first)
- Takes last 3 quests
- Calculates overall progress percentage for each
- Formats as QuestMessage
- Sends via connection with `[QUEST]` prefix

### 7. Trigger Quest Updates
**File:** `mudlib/daemons/quest.ts`

Call `efuns.sendQuestUpdate(player)` after quest state changes:
- `acceptQuest()` - when quest accepted
- `updateKillObjective()` / `updateFetchObjective()` / etc. - on progress
- `turnInQuest()` - when quest turned in
- `abandonQuest()` - when quest abandoned

Also send on player login to populate initial state.

### 8. Create Quest Log GUI Modal
**New File:** `mudlib/lib/quest-gui.ts`

Function to build and send quest log GUI:
- Uses existing GUI system (`efuns.guiSend()`)
- Modal with scrollable content
- Shows ALL active quests (not just 3)
- Each quest displays:
  - Name and description
  - All objectives with progress (X/Y format)
  - Status (In Progress / Ready to Turn In)
  - Rewards summary
  - Abandon button per quest
- Footer with "Close" button

### 9. Handle Quest GUI Request from Client
**File:** `src/driver/driver.ts`

When receiving `[GUI]` message with `action: 'quest-panel-click'`:
- Call the quest-gui builder to open the modal
- Set up response handler for abandon/close actions

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/client/index.html` | Add `#quest-container` div |
| `src/client/websocket-client.ts` | Add QuestMessage type and handler |
| `src/client/client.ts` | Integrate QuestPanel component |
| `src/client/styles.css` | Add quest sidebar styles |
| `src/driver/efun-bridge.ts` | Add sendQuestUpdate method |
| `src/driver/driver.ts` | Handle quest panel GUI requests |
| `mudlib/daemons/quest.ts` | Trigger updates on state changes |
| `mudlib/efuns.d.ts` | Add sendQuestUpdate type declaration |

## New Files

| File | Purpose |
|------|---------|
| `src/client/quest-panel.ts` | Quest sidebar component |
| `mudlib/lib/quest-gui.ts` | Quest log GUI modal builder |

---

## Verification

1. **Manual Testing:**
   - Login and verify empty quest panel shows "No active quests"
   - Accept a quest from an NPC
   - Verify quest appears in sidebar with name and progress bar
   - Make progress on quest objectives
   - Verify progress bar and text update in real-time
   - Click quest name → verify GUI modal opens
   - Verify modal shows all quests with correct objective details
   - Test abandon button in modal
   - Turn in completed quest → verify it's removed from sidebar

2. **Edge Cases:**
   - Test with 0 active quests (empty state message)
   - Test with exactly 3 quests (all shown)
   - Test with more than 3 quests (shows 3 most recent)
   - Test with completed quest ready for turn-in (green styling)
   - Test collapsing sidebar (state persists across refresh)
   - Test time-limited quests (countdown display if applicable)
