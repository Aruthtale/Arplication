import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Tag, Plus, CheckSquare, ListPlus } from 'lucide-react';

const COLORS = [
  { value: 'yellow', label: 'Kuning', bg: 'bg-[#FFE600]', border: 'border-[#FFE600]' },
  { value: 'mint',   label: 'Mint',   bg: 'bg-[#38E54D]', border: 'border-[#38E54D]' },
  { value: 'pink',   label: 'Pink',   bg: 'bg-[#FF70A6]', border: 'border-[#FF70A6]' },
  { value: 'cyan',   label: 'Cyan',   bg: 'bg-[#C4FAF8]', border: 'border-[#C4FAF8]' },
  { value: 'purple', label: 'Ungu',   bg: 'bg-[#D8B4FE]', border: 'border-[#D8B4FE]' },
  { value: 'white',  label: 'Putih',  bg: 'bg-[#FFFFFF]', border: 'border-[#FFFFFF]' },
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
  const [title, setTitle]     = useState('');
  const [content, setContent] = useState('');
  const [color, setColor]     = useState('yellow');
  const [tags, setTags]       = useState([]);
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
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
    >
      <div
        className="w-full max-w-lg bg-[#F8F5EE] border-2 sm:border-[2.5px] border-[#121212] shadow-[5px_5px_0px_#121212] rounded-2xl flex flex-col overflow-hidden max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b-2 border-[#121212] ${previewBg} transition-colors`}>
          <h2 className="font-black text-base sm:text-lg text-[#121212]">
            {editingNote ? '✏️ Edit Catatan' : '📝 Catatan Baru'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border-2 border-[#121212] bg-white/90 hover:bg-white text-[#121212] shadow-[1.5px_1.5px_0px_#121212] active:translate-y-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex flex-col gap-3.5 p-4 sm:p-5 overflow-y-auto">

          {/* Title Input */}
          <div>
            <label className="block text-[11px] font-black text-[#121212] mb-1 uppercase tracking-wider">Judul</label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Judul catatan..."
              maxLength={120}
              className="w-full px-3.5 py-2 sm:py-2.5 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] bg-white text-[#121212] font-black placeholder:text-[#121212]/30 focus:outline-none focus:shadow-[3px_3px_0px_#121212]"
            />
          </div>

          {/* Content TextArea with Toolbar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-black text-[#121212] uppercase tracking-wider">Isi Catatan</label>
              <button
                type="button"
                onClick={handleInsertChecklist}
                className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 bg-white border border-[#121212] rounded-md shadow-[1px_1px_0px_#121212] hover:bg-yellow-100 active:translate-y-0.5 cursor-pointer"
              >
                <ListPlus className="w-3 h-3 text-[#121212]" />
                + Checklist
              </button>
            </div>
            <textarea
              ref={contentRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={"Tulis catatan disini...\n- [ ] Todo item\n- [x] Selesai"}
              rows={6}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] bg-white text-[#121212] font-mono text-xs sm:text-sm placeholder:text-[#121212]/30 focus:outline-none focus:shadow-[3px_3px_0px_#121212] resize-none leading-relaxed"
            />
          </div>

          {/* Color Palette Selector */}
          <div>
            <label className="block text-[11px] font-black text-[#121212] mb-1.5 uppercase tracking-wider">Warna Bento</label>
            <div className="flex gap-2 flex-wrap items-center">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className={`w-8 h-8 rounded-xl border-2 cursor-pointer transition-all ${c.bg} ${
                    color === c.value
                      ? 'border-[#121212] shadow-[2.5px_2.5px_0px_#121212] scale-110 ring-2 ring-black/10'
                      : 'border-[#121212]/30 hover:border-[#121212]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-black text-[#121212] mb-1 uppercase tracking-wider">Tag / Kategori</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Tambah tag, lalu tekan Enter..."
                className="flex-1 px-3 py-1.5 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] bg-white text-xs text-[#121212] placeholder:text-[#121212]/30 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
                className="px-3 py-1.5 bg-[#121212] text-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] hover:bg-[#333] disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 bg-[#121212] text-white rounded-lg border border-[#121212]"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-300 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-4 py-3 border-t-2 border-[#121212] bg-[#F8F5EE]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border-2 border-[#121212] bg-white text-[#121212] font-black text-xs shadow-[2px_2px_0px_#121212] hover:bg-gray-100 active:translate-y-0.5 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim() && !content.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl border-2 border-[#121212] bg-[#121212] text-white font-black text-xs shadow-[3px_3px_0px_#FFE600] hover:bg-[#282828] active:translate-y-0.5 active:shadow-[1px_1px_0px_#FFE600] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-[#FFE600]" />
            Simpan Catatan
          </button>
        </div>
      </div>
    </div>
  );
}
