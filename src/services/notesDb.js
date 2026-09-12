// IndexedDB Service for ArNote (100% Offline Local Database)

const DB_NAME = 'arnote_db';
const DB_VERSION = 1;
const STORE_NAME = 'notes';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('isPinned', 'isPinned', { unique: false });
        store.createIndex('color', 'color', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function getAllNotes() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const notes = request.result || [];
      // Sort pinned first, then by updatedAt descending
      notes.sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
      resolve(notes);
    };
    request.onerror = () => reject(tx.error);
  });
}

export async function getNoteById(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(tx.error);
  });
}

export async function saveNote(note) {
  const db = await openDb();
  const now = new Date().toISOString();
  
  const noteToSave = {
    id: note.id || `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    title: note.title || 'Catatan Tanpa Judul',
    content: note.content || '',
    color: note.color || 'yellow', // yellow, mint, pink, cyan, purple, white
    tags: Array.isArray(note.tags) ? note.tags : [],
    isPinned: Boolean(note.isPinned),
    createdAt: note.createdAt || now,
    updatedAt: now,
    fileName: note.fileName || ''
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(noteToSave);

    request.onsuccess = () => resolve(noteToSave);
    request.onerror = () => reject(tx.error);
  });
}

export async function deleteNote(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(tx.error);
  });
}

export async function togglePinNote(id) {
  const note = await getNoteById(id);
  if (!note) return null;
  note.isPinned = !note.isPinned;
  return await saveNote(note);
}
