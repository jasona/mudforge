/**
 * Announcement Modal - Build and display announcement modals.
 *
 * Creates GUI modals for viewing game announcements, either as a list
 * or as a single announcement with full content.
 */

import type {
  GUIOpenMessage,
  LayoutContainer,
  DisplayElement,
} from './gui-types.js';
import { getAnnouncementDaemon, type Announcement } from '../daemons/announcement.js';
import type { Living } from '../std/living.js';

/**
 * Format a timestamp for display.
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Convert markdown to basic HTML for display.
 * Handles common markdown patterns.
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Escape HTML special chars first
  html = html.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4 style="margin: 12px 0 8px 0; color: #f5f5f5;">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 style="margin: 16px 0 8px 0; color: #f5f5f5;">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 style="margin: 16px 0 8px 0; color: #fbbf24;">$1</h2>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Code inline
  html = html.replace(/`(.+?)`/g, '<code style="background: #222; padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>');

  // Horizontal rule
  html = html.replace(/^---+$/gm, '<hr style="border: none; border-top: 1px solid #333; margin: 16px 0;">');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li style="margin-left: 20px; list-style-type: disc;">$1</li>');

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: #5e6ad2;">$1</a>');

  // Paragraphs (double newlines)
  html = html.replace(/\n\n/g, '</p><p style="margin: 8px 0;">');

  // Single newlines to <br>
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraph
  html = `<p style="margin: 8px 0;">${html}</p>`;

  return html;
}

/**
 * Truncate text to a maximum length.
 */
function truncate(text: string, maxLength: number): string {
  // Get first paragraph or first n characters
  const firstParagraph = text.split('\n\n')[0].replace(/^#+ /gm, '').trim();
  if (firstParagraph.length <= maxLength) {
    return firstParagraph;
  }
  return firstParagraph.slice(0, maxLength - 3) + '...';
}

/**
 * Build an announcement card for the list view.
 */
function buildAnnouncementCard(announcement: Announcement): LayoutContainer {
  const preview = truncate(announcement.content, 100);
  const dateStr = formatDate(announcement.createdAt);
  const isEdited = announcement.updatedAt ? ' (edited)' : '';

  return {
    type: 'vertical',
    gap: '8px',
    style: {
      padding: '16px',
      borderBottom: '1px solid #333',
      cursor: 'pointer',
    },
    className: 'announcement-card',
    children: [
      // Title row
      {
        type: 'horizontal',
        gap: '8px',
        style: {
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        children: [
          {
            type: 'text',
            id: `ann-title-${announcement.id}`,
            content: announcement.title,
            style: {
              color: '#fbbf24',
              fontWeight: 'bold',
              fontSize: '15px',
            },
          } as DisplayElement,
          {
            type: 'text',
            id: `ann-date-${announcement.id}`,
            content: dateStr + isEdited,
            style: {
              color: '#666',
              fontSize: '12px',
            },
          } as DisplayElement,
        ],
      },
      // Preview
      {
        type: 'text',
        id: `ann-preview-${announcement.id}`,
        content: preview,
        style: {
          color: '#888',
          fontSize: '13px',
          lineHeight: '1.4',
        },
      } as DisplayElement,
      // Author
      {
        type: 'text',
        id: `ann-author-${announcement.id}`,
        content: `Posted by ${announcement.author}`,
        style: {
          color: '#555',
          fontSize: '11px',
          fontStyle: 'italic',
        },
      } as DisplayElement,
    ],
  };
}

/**
 * Build the empty state for when no announcements exist.
 */
function buildEmptyState(): LayoutContainer {
  return {
    type: 'vertical',
    gap: '16px',
    style: {
      padding: '48px',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
    },
    children: [
      {
        type: 'text',
        id: 'ann-empty-message',
        content: 'No announcements yet.',
        style: {
          color: '#666',
          fontSize: '14px',
          textAlign: 'center',
        },
      } as DisplayElement,
      {
        type: 'text',
        id: 'ann-empty-hint',
        content: 'Check back later for news and updates!',
        style: {
          color: '#444',
          fontSize: '12px',
          textAlign: 'center',
        },
      } as DisplayElement,
    ],
  };
}

/**
 * Open the announcement list modal.
 *
 * @param viewer The player viewing the announcements
 */
export function openAnnouncementListModal(viewer: Living): void {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    return;
  }

  const daemon = getAnnouncementDaemon();
  const announcements = daemon.getAll();

  // Build announcement cards
  const announcementCards: LayoutContainer[] = announcements.map((ann) =>
    buildAnnouncementCard(ann)
  );

  // Build the content section
  const contentSection: LayoutContainer =
    announcementCards.length === 0
      ? buildEmptyState()
      : {
          type: 'vertical',
          gap: '0',
          style: {
            maxHeight: '500px',
            overflowY: 'auto',
          },
          children: announcementCards,
        };

  // Build the full modal layout
  const layout: LayoutContainer = {
    type: 'vertical',
    gap: '0',
    children: [contentSection],
  };

  // Build subtitle with count
  const count = announcements.length;
  const countText = count === 1 ? '1 Announcement' : `${count} Announcements`;

  // Send the modal
  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: 'announcement-list-modal',
      title: 'NEWS & ANNOUNCEMENTS',
      subtitle: countText,
      size: 'medium',
      width: '600px',
      closable: true,
      escapable: true,
      headerStyle: {
        textAlign: 'center',
      },
    },
    layout,
    buttons: [
      {
        id: 'close',
        label: 'Close',
        action: 'cancel',
        variant: 'secondary',
      },
    ],
  };

  efuns.guiSend(message);
}

/**
 * Open a single announcement modal.
 *
 * @param viewer The player viewing the announcement
 * @param announcementId The ID of the announcement to show
 */
export function openAnnouncementModal(viewer: Living, announcementId: string): void {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    return;
  }

  const daemon = getAnnouncementDaemon();
  const announcement = daemon.getById(announcementId);

  if (!announcement) {
    // Fallback to list modal if announcement not found
    openAnnouncementListModal(viewer);
    return;
  }

  const dateStr = formatDate(announcement.createdAt);
  const isEdited = announcement.updatedAt ? ' (edited)' : '';
  const contentHtml = markdownToHtml(announcement.content);

  // Build the content layout
  const layout: LayoutContainer = {
    type: 'vertical',
    gap: '16px',
    style: {
      padding: '16px',
    },
    children: [
      // Header with title and date
      {
        type: 'vertical',
        gap: '4px',
        style: {
          borderBottom: '1px solid #333',
          paddingBottom: '16px',
        },
        children: [
          {
            type: 'text',
            id: 'ann-title',
            content: announcement.title,
            style: {
              color: '#fbbf24',
              fontSize: '20px',
              fontWeight: 'bold',
            },
          } as DisplayElement,
          {
            type: 'text',
            id: 'ann-meta',
            content: `Posted by ${announcement.author} on ${dateStr}${isEdited}`,
            style: {
              color: '#666',
              fontSize: '12px',
            },
          } as DisplayElement,
        ],
      },
      // Content (rendered as HTML)
      {
        type: 'html',
        id: 'ann-content',
        content: contentHtml,
        style: {
          color: '#ddd',
          fontSize: '14px',
          lineHeight: '1.6',
          maxHeight: '400px',
          overflowY: 'auto',
        },
      } as DisplayElement,
    ],
  };

  // Send the modal
  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: 'announcement-modal',
      title: 'ANNOUNCEMENT',
      size: 'medium',
      width: '650px',
      closable: true,
      escapable: true,
      headerStyle: {
        textAlign: 'center',
      },
    },
    layout,
    buttons: [
      {
        id: 'view-all',
        label: 'View All',
        action: 'custom',
        customAction: 'view-all-announcements',
        variant: 'ghost',
      },
      {
        id: 'close',
        label: 'Close',
        action: 'cancel',
        variant: 'secondary',
      },
    ],
  };

  efuns.guiSend(message);
}

/**
 * Open the latest announcement modal.
 *
 * @param viewer The player viewing the announcement
 */
export function openLatestAnnouncementModal(viewer: Living): void {
  const daemon = getAnnouncementDaemon();
  const latest = daemon.getLatest();

  if (!latest) {
    openAnnouncementListModal(viewer);
    return;
  }

  openAnnouncementModal(viewer, latest.id);
}

export default {
  openAnnouncementListModal,
  openAnnouncementModal,
  openLatestAnnouncementModal,
};
