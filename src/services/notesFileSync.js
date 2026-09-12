import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const FOLDER_NAME = 'ArNote';

export async function exportNoteToMd(note) {
  try {
    const safeTitle = (note.title || 'Catatan')
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    const fileName = `${safeTitle || 'Note'}_${note.id.split('_').pop()}.md`;

    // YAML Frontmatter + Markdown content
    const fileContent = `---
id: "${note.id}"
title: "${(note.title || '').replace(/"/g, '\\"')}"
color: "${note.color || 'yellow'}"
tags: [${(note.tags || []).map(t => `"${t}"`).join(', ')}]
isPinned: ${note.isPinned ? 'true' : 'false'}
updatedAt: "${note.updatedAt}"
---

${note.content || ''}
`;

    // Try Capacitor Filesystem
    try {
      // Ensure directory exists
      try {
        await Filesystem.mkdir({
          path: FOLDER_NAME,
          directory: Directory.Documents,
          recursive: true
        });
      } catch (e) {
        // Ignored if folder already exists
      }

      const filePath = `${FOLDER_NAME}/${fileName}`;
      await Filesystem.writeFile({
        path: filePath,
        data: fileContent,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      return { success: true, fileName, path: `Documents/${filePath}` };
    } catch (fsError) {
      console.warn('Capacitor Filesystem not available or permission denied, using web download fallback:', fsError);
      
      // Web Fallback
      const blob = new Blob([fileContent], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, fileName, path: fileName };
    }
  } catch (error) {
    console.error('Failed to export note to MD:', error);
    return { success: false, error: error.message };
  }
}
