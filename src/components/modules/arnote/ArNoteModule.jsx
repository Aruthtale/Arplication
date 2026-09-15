import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Tag, X } from 'lucide-react';
import NoteBentoCard from './NoteBentoCard';
import NoteEditorModal from './NoteEditorModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import NeubrutalistFilterPicker from './NeubrutalistFilterPicker';
import { getAllNotes, saveNote, deleteNote, togglePinNote } from '../../../services/notesDb';
import { exportNoteToMd } from '../../../services/notesFileSync';
import { syncNotesToWidget } from '../../../services/widgetBridge';

const COLOR_OPTIONS = [
  { value: '', label: 'Semua Warna', colorBg: '' },
  { value: 'yellow', label: 'Kuning', colorBg: 'bg-[#FFE600]' },
  { value: 'mint',   label: 'Mint',   colorBg: 'bg-[#38E54D]' },
  { value: 'pink',   label: 'Pink',   colorBg: 'bg-[#FF70A6]' },
  { value: 'cyan',   label: 'Cyan',   colorBg: 'bg-[#C4FAF8]' },
  { value: 'purple', label: 'Ungu',   colorBg: 'bg-[#D8B4FE]' },
  { value: 'white',  label: 'Putih',  colorBg: 'bg-[#FFFFFF]' }
];

export default function ArNoteModule() {
  const [notes, setNotes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [deletingNote, setDeletingNote] = useState(null); // Note object to delete
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    if (!isSaving) {
      const handler = setTimeout(() => {
        syncNotesToWidget();
      }, 1200);
      return () => clearTimeout(handler);
    }
  }, [notes, isSaving]);

  const loadNotes = async () => {
    try {
      const loadedNotes = await getAllNotes();
      setNotes(loadedNotes);
      const tags = Array.from(
        new Set(loadedNotes.flatMap(n => n.tags || []))
      );
      setAllTags(tags);
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };

  const handleSaveNote = async (noteData) => {
    setIsSaving(true);
    try {
      await saveNote(noteData);
      await loadNotes();
      setIsModalOpen(false);
      setEditingNote(null);
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromptDelete = (note) => {
    setDeletingNote(note);
  };

  const handleConfirmDelete = async () => {
    if (!deletingNote) return;
    try {
      await deleteNote(deletingNote.id);
      await loadNotes();
      setDeletingNote(null);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleTogglePin = async (id) => {
    try {
      await togglePinNote(id);
      await loadNotes();
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleExportNote = async (note) => {
    try {
      const result = await exportNoteToMd(note);
      if (result.success) {
        alert(`Berhasil diekspor ke ${result.fileName || 'file .md'}`);
      } else {
        alert('Ekspor gagal: ' + result.error);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleToggleChecklist = async (note, lineIndex, newCheckedState) => {
    try {
      const lines = (note.content || '').split('\n');
      let checklistCount = 0;
      const updatedLines = lines.map((line) => {
        if (line.startsWith('- [ ] ') || line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
          if (checklistCount === lineIndex) {
            checklistCount++;
            const text = line.replace(/^-\s*\[[ xX]\]\s*/, '');
            return newCheckedState ? `- [x] ${text}` : `- [ ] ${text}`;
          }
          checklistCount++;
        }
        return line;
      });

      const updatedNote = { ...note, content: updatedLines.join('\n') };
      await saveNote(updatedNote);
      await loadNotes();
    } catch (err) {
      console.error('Failed to toggle checklist:', err);
    }
  };

  const openCreateModal = () => {
    setEditingNote(null);
    setIsModalOpen(true);
  };

  const openEditModal = (note) => {
    setEditingNote(note);
    setIsModalOpen(true);
  };

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchTerm === '' ||
      (note.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.content || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTag = filterTag === '' || (note.tags && note.tags.includes(filterTag));
    const matchesColor = filterColor === '' || note.color === filterColor;

    return matchesSearch && matchesTag && matchesColor;
  });

  const tagOptions = [
    { value: '', label: 'Semua Tag' },
    ...allTags.map(t => ({ value: t, label: `#${t}` }))
  ];

  return (
    <div className="w-full space-y-3.5 sm:space-y-5">
      {/* Module Title & Quick Add */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-[#121212] tracking-tight uppercase">
              ArNote
            </h1>
            <span className="text-[10px] font-mono-code font-black bg-[#FFE600] px-2 py-0.5 border border-[#121212] rounded-md shadow-[1px_1px_0px_#121212]">
              {notes.length} Catatan
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-[#121212]/70 font-semibold">
             • Sinkron otomatis ke homescreen widget
          </p>
        </div>

        {/* Catatan Baru Button (Desktop & Tablet) */}
        <button
          type="button"
          onClick={openCreateModal}
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#121212] text-white rounded-xl border-2 border-[#121212] shadow-[3px_3px_0px_#FFE600] hover:bg-[#282828] active:translate-y-0.5 active:shadow-[1px_1px_0px_#FFE600] transition-all font-black text-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#FFE600]" />
          Catatan Baru
        </button>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#121212]/50" />
          <input
            type="text"
            placeholder="Cari judul atau isi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] bg-white text-xs sm:text-sm text-[#121212] placeholder:text-[#121212]/40 font-bold focus:outline-none focus:shadow-[3px_3px_0px_#121212]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-black/10 text-[#121212]/60 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Custom Neubrutalist Dropdowns: Tag & Color Filter */}
        <div className="flex items-center gap-2">
          {allTags.length > 0 && (
            <NeubrutalistFilterPicker
              icon={Tag}
              label="Tag"
              value={filterTag}
              options={tagOptions}
              onChange={setFilterTag}
              className="flex-1 sm:w-36"
            />
          )}

          <NeubrutalistFilterPicker
            icon={Filter}
            label="Warna"
            value={filterColor}
            options={COLOR_OPTIONS}
            onChange={setFilterColor}
            className="flex-1 sm:w-36"
          />

          {/* Mobile Catatan Baru Button */}
          <button
            type="button"
            onClick={openCreateModal}
            className="sm:hidden flex items-center justify-center p-2 bg-[#121212] text-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#FFE600] active:translate-y-0.5 active:shadow-[1px_1px_0px_#FFE600] cursor-pointer shrink-0"
            title="Catatan Baru"
          >
            <Plus className="w-4 h-4 text-[#FFE600]" />
          </button>
        </div>
      </div>

      {/* Note Grid (1 baris = 2 kotak di mobile!) */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 auto-rows-fr">
          {filteredNotes.map(note => (
            <div key={note.id} className="h-full">
              <NoteBentoCard
                note={note}
                onEdit={() => openEditModal(note)}
                onDelete={() => handlePromptDelete(note)}
                onTogglePin={() => handleTogglePin(note.id)}
                onExport={() => handleExportNote(note)}
                onToggleChecklist={(n, idx, checked) => handleToggleChecklist(n, idx, checked)}
              />
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border-2 border-[#121212] bg-white shadow-[3.5px_3.5px_0px_#121212] my-2">
          <div className="w-14 h-14 rounded-2xl bg-[#FFE600] border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex items-center justify-center text-2xl mb-2.5">
            📝
          </div>
          <h2 className="text-base font-black text-[#121212] mb-1">
            {searchTerm || filterTag || filterColor ? 'Tidak Ada Catatan yang Cocok' : 'Belum Ada Catatan'}
          </h2>
          <p className="text-xs text-[#121212]/70 max-w-xs mb-4">
            {searchTerm || filterTag || filterColor
              ? 'Coba ubah filter atau kata kunci pencarian kamu.'
              : 'Ketuk tombol Tambah untuk membuat catatan pertama.'}
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#121212] text-white rounded-xl border-2 border-[#121212] shadow-[2.5px_2.5px_0px_#38E54D] hover:bg-[#282828] active:translate-y-0.5 active:shadow-[1px_1px_0px_#38E54D] font-black text-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#38E54D]" />
            Buat Catatan
          </button>
        </div>
      )}

      {/* Editor Modal */}
      <NoteEditorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingNote(null);
        }}
        editingNote={editingNote}
        onSave={handleSaveNote}
      />

      {/* Neubrutalist Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingNote}
        noteTitle={deletingNote?.title}
        onClose={() => setDeletingNote(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Saving Toast */}
      {isSaving && (
        <div className="fixed bottom-24 right-4 z-30 px-3.5 py-1.5 bg-[#FFE600] border-2 border-[#121212] rounded-xl shadow-[2.5px_2.5px_0px_#121212] text-xs font-black text-[#121212] flex items-center gap-1.5 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-[#121212]" />
          Menyimpan...
        </div>
      )}
    </div>
  );
}
