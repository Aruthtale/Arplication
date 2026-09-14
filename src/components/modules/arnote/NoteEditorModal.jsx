import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, X, Save, Tag, Plus, ListPlus } from 'lucide-react';

const COLORS = [
  { value: 'yellow', label: 'Kuning', bg: 'bg-[#FFE600]' },
  { value: 'mint',   label: 'Mint',   bg: 'bg-[#38E54D]' },
  { value: 'pink',   label: 'Pink',   bg: 'bg-[#FF70A6]' },
  { value: 'cyan',   label: 'Cyan',   bg: 'bg-[#C4FAF8]' },
  { value: 'purple', label: 'Ungu',   bg: 'bg-[#D8B4FE]' },
  { value: 'white',  label: 'Putih',  bg: 'bg-[#FFFFFF]' },
];

const COLOR_BG = {
  yellow: 'bg-[#FFE600]',
  mint:   'bg-[#38E54D]',
  pink:   'bg-[#FF70A6]',
  cyan:   'bg-[#C4FAF8]',
  purple: 'bg-[#D8B4FE]',
  white:  'bg-[#FFFFFF]',
};

export default function NoteEditorModal({ isOpen, onClose, editingNote, onSave }) {
  const [title, setTitle]       = useState('');
  const [content, setContent]   = useState('');
  const [color, setColor]       = useState('yellow');
  const [tags, setTags]         = useState([]);
  const [tagInput, setTagInput] = useState('');
  const titleRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (editingNote) {
        setTitle(editingNote.title || '');
        setContent(editingNote.content || '');
        setColor(editingNote.color || 'yellow');
        setTags(Array.isArray(editingNote.tags) ? editingNote.tags : []);
      } else {
        setTitle('');
        setContent('');
        setColor('yellow');
        setTags([]);
      }
      setTagInput('');
      setTimeout(() => titleRef.current?.focus(), 60);
    }
  }, [isOpen, editingNote]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tag) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleInsertChecklist = () => {
    const prefix = content.length > 0 && !content.endsWith('\n') ? '\n- [ ] ' : '- [ ] ';
    setContent(prev => prev + prefix);
    setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.focus();
        contentRef.current.selectionStart = contentRef.current.value.length;
        contentRef.current.selectionEnd = contentRef.current.value.length;
      }
    }, 40);
  };

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle && !content.trim()) return;
    onSave({
      ...(editingNote || {}),
      title: trimmedTitle || 'Catatan Tanpa Judul',
      content: content,
      color,
      tags,
    });
  };

  if (!isOpen) return null;

  const previewBg = COLOR_BG[color] || COLOR_BG.yellow;

  return (
    <div className="fixed inset-0 z-50 bg-[#F8F5EE] flex flex-col w-full h-full overflow-hidden">
      {/* Full Screen Header */}
      <header className={`flex items-center justify-between px-4 py-3 border-b-2 border-[#121212] ${previewBg} transition-colors shrink-0`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-[#121212] bg-white text-[#121212] font-black text-xs shadow-[2px_2px_0px_#121212] active:translate-y-0.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
          <span className="font-black text-sm sm:text-base text-[#121212] hidden sm:inline ml-2">
            {editingNote ? '✏️ Edit Catatan' : '📝 Catatan Baru'}
          </span>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInsertChecklist}
            className="inline-flex items-center gap-1 text-xs font-black px-3 py-1.5 bg-white text-[#121212] border-2 border-[#121212] rounded-xl shadow-[2px_2px_0px_#121212] hover:bg-yellow-100 active:translate-y-0.5 cursor-pointer"
          >
            <ListPlus className="w-4 h-4 text-[#121212]" />
            <span className="hidden sm:inline">+ Checklist</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim() && !content.trim()}
            className="flex items-center gap-1.5 px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl border-2 border-[#121212] bg-[#121212] text-white font-black text-xs sm:text-sm shadow-[2.5px_2.5px_0px_#FFE600] hover:bg-[#282828] active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Save className="w-4 h-4 text-[#FFE600]" />
            <span>Simpan</span>
          </button>
        </div>
      </header>

      {/* Main Full Screen Body */}
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-3.5 sm:p-6 gap-3.5 overflow-y-auto">
        {/* Title Input */}
        <div>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Judul catatan..."
            maxLength={120}
            className="w-full px-4 py-3 rounded-xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] bg-white text-[#121212] font-black text-base sm:text-xl placeholder:text-[#121212]/30 focus:outline-none focus:shadow-[4px_4px_0px_#121212]"
          />
        </div>

        {/* Color Palette Selector & Tags Input */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white/70 p-3 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212]">
          {/* Colors */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-[#121212] uppercase tracking-wider shrink-0">Warna:</span>
            <div className="flex gap-1.5 items-center">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className={`w-7 h-7 rounded-lg border-2 cursor-pointer transition-all ${c.bg} ${
                    color === c.value
                      ? 'border-[#121212] shadow-[2px_2px_0px_#121212] scale-110'
                      : 'border-[#121212]/30 hover:border-[#121212]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Tag Input */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 flex-1 sm:w-64">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Tambah tag..."
                className="w-full px-3 py-1.5 rounded-lg border-2 border-[#121212] bg-white text-xs font-bold text-[#121212] placeholder:text-[#121212]/30 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
                className="p-1.5 bg-[#121212] text-white rounded-lg border-2 border-[#121212] hover:bg-[#333] disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tag List */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 bg-[#121212] text-white rounded-lg border border-[#121212]"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-300 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Full Height Wide Textarea */}
        <div className="flex-1 flex flex-col min-h-[380px]">
          <textarea
            ref={contentRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={"Tulis isi catatan di sini...\n\n- [ ] Checklist item\n- [x] Item selesai"}
            className="flex-1 w-full p-4 sm:p-5 rounded-xl border-2 border-[#121212] shadow-[3.5px_3.5px_0px_#121212] bg-white text-[#121212] font-mono text-sm sm:text-base placeholder:text-[#121212]/30 focus:outline-none focus:shadow-[4px_4px_0px_#121212] resize-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
