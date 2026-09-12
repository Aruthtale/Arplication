import { registerPlugin } from '@capacitor/core';
import { getAllNotes } from './notesDb';

const ArNoteWidgetPlugin = registerPlugin('ArNoteWidgetPlugin');

export async function syncNotesToWidget() {
  try {
    const notes = await getAllNotes();
    const pinnedNote = notes.find(n => n.isPinned) || notes[0] || null;
    const recentNotes = notes.slice(0, 8).map(n => ({
      id: n.id,
      title: n.title,
      contentSnippet: (n.content || '').substring(0, 100),
      color: n.color,
      isPinned: n.isPinned,
      updatedAt: n.updatedAt
    }));

    const payload = {
      pinnedNote: pinnedNote ? {
        id: pinnedNote.id,
        title: pinnedNote.title,
        content: pinnedNote.content,
        color: pinnedNote.color,
        updatedAt: pinnedNote.updatedAt
      } : null,
      recentNotes
    };

    if (ArNoteWidgetPlugin && typeof ArNoteWidgetPlugin.syncWidgetData === 'function') {
      await ArNoteWidgetPlugin.syncWidgetData({ jsonPayload: JSON.stringify(payload) });
    }
  } catch (err) {
    // Non-fatal if plugin is not available on web platform
    console.log('Widget sync skipped or not supported on this platform:', err.message);
  }
}
