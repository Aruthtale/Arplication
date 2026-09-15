import React, { useState, useEffect, useRef } from 'react';
import {
  Music, Play, Pause, SkipBack, SkipForward, Search, FolderOpen,
  FileUp, ScanLine, Trash2, ListMusic, Loader2, AlertCircle,
  Shuffle, Repeat, Home, Clock3,
} from 'lucide-react';
import { isNative } from '../../../services/http.js';
import {
  loadLibrary, saveLibrary, removeTrack, mergeScanResults,
  scanLocalAudio, toPlayableSrc, formatTrackDuration, isAudioFilename,
} from '../../../services/localMusic.js';

function filterTracks(tracks, query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return tracks;
  return tracks.filter((t) =>
    `${t.title} ${t.artist} ${t.filename || ''}`.toLowerCase().includes(q)
  );
}

export default function ArMusicModule({ setActiveTab }) {
  const [tracks, setTracks] = useState(() => loadLibrary());
  const [query, setQuery] = useState('');
  const [currentId, setCurrentId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatOne, setRepeatOne] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0); // persen 0-100
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [order, setOrder] = useState([]); // index order untuk shuffle
  const [musicView, setMusicView] = useState('semua'); // semua | artis | folder — sub-navbar ala Spotify

  const audioRef = useRef(null);
  const fileRef = useRef(null);
  const endRef = useRef(false);

  const filteredByQuery = filterTracks(tracks, query);
  // Sub-navbar view: semua = flat list, artis = grup per artis, folder = grup per folder
  const groupedByArtist = {};
  const groupedByFolder = {};
  for (const t of filteredByQuery) {
    const artistKey = (t.artist || 'Artis Tidak Dikenal').trim() || 'Artis Tidak Dikenal';
    const folderKey = (t.folder || 'Lainnya').trim() || 'Lainnya';
    if (!groupedByArtist[artistKey]) groupedByArtist[artistKey] = [];
    if (!groupedByFolder[folderKey]) groupedByFolder[folderKey] = [];
    groupedByArtist[artistKey].push(t);
    groupedByFolder[folderKey].push(t);
  }
  const artistNames = Object.keys(groupedByArtist).sort((a, b) => a.localeCompare(b, 'id'));
  const folderNames = Object.keys(groupedByFolder).sort((a, b) => a.localeCompare(b, 'id'));
  const filtered = filteredByQuery;
  const current = tracks.find((t) => t.id === currentId) || null;

  const persist = (next) => {
    setTracks(next);
    saveLibrary(next);
  };

  // Boot audio element sekali
  useEffect(() => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audioRef.current = audio;
    const onTime = () => setElapsed(audio.currentTime || 0);
    const onMeta = () => setDuration(audio.duration && Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnd = () => { endRef.current = true; setPlaying(false); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
      audioRef.current = null;
    };
  }, []);

  // Auto-next setelah track selesai (hormati repeat-one)
  useEffect(() => {
    if (!endRef.current) return;
    endRef.current = false;
    if (repeatOne && current) {
      playTrack(current, true);
      return;
    }
    nextTrack(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const playTrack = async (track, forceReplay = false) => {
    if (!track || track.unavailable) return;
    setError(null);
    const src = toPlayableSrc(track.uri);
    if (!src) {
      setError(`File "${track.filename || track.title}" tidak bisa dibuka. Pilih ulang dari storage.`);
      return;
    }
    try {
      const audio = audioRef.current;
      if (currentId !== track.id || forceReplay) {
        audio.src = src;
        setCurrentId(track.id);
        setElapsed(0);
        setDuration(track.durationSec || 0);
      }
      await audio.play();
      setPlaying(true);
    } catch (e) {
      setError(`Gagal memutar: ${e?.message || e}`);
      setPlaying(false);
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else if (current) {
      audio.play().then(() => setPlaying(true)).catch((e) => setError(`Gagal memutar: ${e?.message || e}`));
    } else if (filtered.length > 0) {
      playTrack(filtered[0]);
    }
  };

  const pickFromList = (fromFiltered) => (shuffle
    ? [...Array(fromFiltered.length).keys()].sort(() => Math.random() - 0.5)
    : [...Array(fromFiltered.length).keys()]);

  const nextTrack = (auto = false) => {
    const list = filtered.length > 0 ? filtered : tracks;
    if (!list.length) return;
    const idx = list.findIndex((t) => t.id === currentId);
    let next;
    if (shuffle) {
      const ord = order.length === list.length ? order : pickFromList(list);
      if (order.length !== list.length) setOrder(ord);
      const pos = ord.indexOf(idx);
      next = list[ord[(pos + 1) % ord.length]];
    } else {
      next = list[(idx + 1) % list.length];
    }
    if (auto && repeatOne && current) return playTrack(current, true);
    playTrack(next);
  };

  const prevTrack = () => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const list = filtered.length > 0 ? filtered : tracks;
    if (!list.length) return;
    const idx = list.findIndex((t) => t.id === currentId);
    const prev = list[(idx - 1 + list.length) % list.length];
    playTrack(prev);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    const pct = Number(e.target.value);
    setProgress(pct);
    if (audio && duration > 0) {
      audio.currentTime = (pct / 100) * duration;
    }
  };

  useEffect(() => {
    if (duration > 0) setProgress((elapsed / duration) * 100);
  }, [elapsed, duration]);

  const handleScan = async () => {
    setScanning(true);
    setScanMsg('');
    setError(null);
    try {
      const scanned = await scanLocalAudio({
        onProgress: (n, name) => setScanMsg(`${n} file — ${name}`),
      });
      persist(mergeScanResults(loadLibrary(), scanned));
      setScanMsg(scanned.length > 0
        ? `Selesai: ${scanned.length} lagu ditemukan.`
        : 'Selesai: tidak ada file audio di folder Arloader/Music.');
    } catch (e) {
      setError(e?.message || 'Scan gagal.');
    } finally {
      setScanning(false);
    }
  };

  const handlePickFiles = (e) => {
    const files = Array.from(e.target.files || []).filter((f) => isAudioFilename(f.name));
    if (!files.length) return;
    const additions = files.map((f) => {
      const base = f.name.replace(/\.[a-zA-Z0-9]+$/, '').replace(/_+/g, ' ').trim();
      return {
        id: `pick:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: base || f.name,
        artist: 'File Lokal',
        filename: f.name,
        folder: 'Dipilih manual',
        uri: URL.createObjectURL(f),
        durationSec: 0,
        source: 'pick',
      };
    });
    persist([...additions, ...loadLibrary()].slice(0, 500));
    e.target.value = '';
  };

  const handleRemove = (id) => {
    const target = tracks.find((t) => t.id === id);
    if (target && String(target.uri || '').startsWith('blob:')) {
      try { URL.revokeObjectURL(target.uri); } catch { /* abaikan */ }
    }
    if (id === currentId) {
      audioRef.current?.pause();
      setPlaying(false);
      setCurrentId(null);
    }
    persist(removeTrack(loadLibrary(), id));
  };

  const onLoadedMeta = (e) => {
    // Simpan durasi hasil file-picker ke library
    const secs = Math.floor(e.target.duration || 0);
    if (secs > 0 && current && !current.durationSec) {
      const next = tracks.map((t) => (t.id === current.id ? { ...t, durationSec: secs } : t));
      persist(next);
    }
  };

  const renderTrackCard = (track) => {
    const isCurrent = track.id === currentId;
    return (
      <div
        key={track.id}
        onClick={() => playTrack(track)}
        className={`nb-card p-2.5 flex items-center gap-2.5 transition-all cursor-pointer shadow-[1.5px_1.5px_0px_#121212] ${isCurrent ? 'bg-[#FFE600]' : 'bg-[#F8F5EE] hover:bg-white'}`}
      >
        <div className={`w-9 h-9 rounded-lg border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#121212] ${isCurrent ? 'bg-[#121212]' : 'bg-[#D8B4FE]'}`}>
          {isCurrent && playing
            ? <Pause className="w-4 h-4 text-[#FFE600]" />
            : <Play className={`w-4 h-4 ${isCurrent ? 'text-[#FFE600]' : 'text-[#121212]'}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-[#121212] truncate">{track.title}</p>
          <p className="text-[10px] font-mono-code font-bold text-gray-500 truncate">
            {track.artist}{track.folder ? ` • ${track.folder}` : ''}
          </p>
        </div>
        {track.durationSec > 0 && (
          <span className="text-[10px] font-mono-code font-bold text-gray-500 shrink-0">
            {formatTrackDuration(track.durationSec)}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); handleRemove(track.id); }}
          className="w-7 h-7 rounded-lg bg-white hover:bg-red-100 border border-black flex items-center justify-center text-red-600 transition-colors shadow-[1px_1px_0px_#121212] shrink-0"
          title="Hapus dari koleksi"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const renderGroupSection = (name, list) => (
    <div key={name} className="space-y-2">
      <div className="flex items-center justify-between px-1 pt-1">
        <p className="text-[11px] font-black uppercase tracking-wider text-[#121212] truncate">
          {name} <span className="font-mono-code text-gray-500">({list.length})</span>
        </p>
        <button
          onClick={() => list.length > 0 && playTrack(list[0])}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#D8B4FE] border border-black text-[10px] font-black uppercase shadow-[1.5px_1.5px_0px_#121212] shrink-0"
        >
          <Play className="w-3 h-3" />
          <span>Putar</span>
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {list.map((t) => renderTrackCard(t))}
      </div>
    </div>
  );

  return (
    <div className="space-y-3.5 sm:space-y-5 font-sans">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-[#D8B4FE] rounded-2xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212] space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212] text-[11px] font-mono-code font-black uppercase hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Hub</span>
          </button>
          <div className="flex items-center gap-1.5 font-mono-code text-[10px] font-black bg-white px-2 py-0.5 rounded-md border border-[#121212] shadow-[1px_1px_0px_#121212]">
            <ListMusic className="w-3 h-3" />
            <span>{tracks.length} LAGU</span>
          </div>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#121212] uppercase leading-tight">
            ArMusic
          </h1>
          <p className="text-xs font-bold text-gray-800 leading-relaxed mt-1">
            Pemutar lagu lokal dari storage HP — hasil unduhan Arloader & file musikmu, 100% offline.
          </p>
        </div>
        {/* Search */}
        <div className="flex items-center gap-2 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] px-3 py-2">
          <Search className="w-4 h-4 text-[#121212] shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul, artis, nama file..."
            className="flex-1 min-w-0 bg-transparent outline-none text-sm font-bold text-[#121212] placeholder:text-gray-400"
          />
        </div>
        {/* Sub-navbar ala Spotify: Semua / Artis / Folder */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {[
            { id: 'semua', label: 'Semua' },
            { id: 'artis', label: `Artis (${artistNames.length})` },
            { id: 'folder', label: `Folder (${folderNames.length})` },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setMusicView(v.id)}
              className={`px-3.5 py-1.5 rounded-full border-2 border-[#121212] text-xs font-black uppercase whitespace-nowrap transition-all shadow-[2px_2px_0px_#121212] ${
                musicView === v.id
                  ? 'bg-[#121212] text-white'
                  : 'bg-white text-[#121212] hover:bg-[#FFE600]'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleScan}
            disabled={scanning || !isNative()}
            title={isNative() ? 'Scan folder Arloader & Music' : 'Scan hanya tersedia di aplikasi Android'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#38E54D] border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black uppercase hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
            <span>{scanning ? 'Memindai...' : 'Scan Storage'}</span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black uppercase hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
          >
            <FileUp className="w-4 h-4" />
            <span>Pilih File</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.ogg,.wav,.flac,.opus"
            multiple
            className="hidden"
            onChange={handlePickFiles}
          />
          {!isNative() && (
            <span className="text-[10px] font-mono-code font-bold text-[#121212]/60 self-center">
              *Scan storage aktif di aplikasi Android
            </span>
          )}
        </div>
        {(scanning || scanMsg) && (
          <p className="text-[11px] font-mono-code font-bold text-[#121212]/70 truncate">{scanMsg}</p>
        )}
        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white border-2 border-[#121212] shadow-[2px_2px_0px_#121212]">
            <AlertCircle className="w-4 h-4 text-[#FF525E] shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-[#121212]">{error}</p>
          </div>
        )}
      </div>

      {/* Now Playing */}
      {current && (
        <div className="p-4 bg-[#121212] rounded-2xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212] space-y-3 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#FFE600] border-2 border-white/20 flex items-center justify-center shrink-0">
              <Music className="w-6 h-6 text-[#121212]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm truncate">{current.title}</p>
              <p className="text-[11px] font-mono-code font-bold text-white/60 truncate">{current.artist}</p>
            </div>
            <span className="text-[10px] font-mono-code font-bold text-white/60 shrink-0 flex items-center gap-1">
              <Clock3 className="w-3 h-3" />
              {formatTrackDuration(elapsed) || '0:00'} / {formatTrackDuration(duration) || formatTrackDuration(current.durationSec) || '--:--'}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSeek}
            className="w-full accent-[#FFE600]"
          />
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShuffle((v) => !v)}
              title="Acak"
              className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all ${shuffle ? 'bg-[#FFE600] text-[#121212] border-[#FFE600]' : 'bg-transparent text-white/60 border-white/30'}`}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={prevTrack}
              className="w-11 h-11 rounded-xl bg-white text-[#121212] border-2 border-white flex items-center justify-center hover:bg-[#FFE600] transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-2xl bg-[#FFE600] text-[#121212] border-2 border-[#FFE600] flex items-center justify-center hover:scale-105 transition-transform"
            >
              {playing ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
            </button>
            <button
              onClick={() => nextTrack()}
              className="w-11 h-11 rounded-xl bg-white text-[#121212] border-2 border-white flex items-center justify-center hover:bg-[#FFE600] transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            <button
              onClick={() => setRepeatOne((v) => !v)}
              title="Ulangi satu lagu"
              className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all ${repeatOne ? 'bg-[#FFE600] text-[#121212] border-[#FFE600]' : 'bg-transparent text-white/60 border-white/30'}`}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Track List */}
      <div className="nb-card p-4 bg-white space-y-3 shadow-[3px_3px_0px_#121212]">
        <div className="flex items-center justify-between border-b-2 border-black pb-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#121212]" />
            <h3 className="font-mono-code font-black text-xs text-[#121212] uppercase tracking-wider">
              KOLEKSI ({filtered.length})
            </h3>
          </div>
          {filtered.length > 0 && (
            <button
              onClick={() => playTrack(filtered[0])}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#38E54D] border border-black text-[10px] font-black uppercase shadow-[1.5px_1.5px_0px_#121212]"
            >
              <Play className="w-3 h-3" />
              <span>Putar</span>
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Music className="w-10 h-10 mx-auto text-[#121212]/20" />
            <p className="text-sm font-black text-[#121212]">
              {tracks.length === 0 ? 'Belum ada lagu' : 'Tidak ada hasil'}
            </p>
            <p className="text-xs font-medium text-gray-500 max-w-xs mx-auto">
              {tracks.length === 0
                ? 'Ketuk "Scan Storage" untuk memindai hasil unduhan Arloader, atau "Pilih File" untuk menambah manual.'
                : 'Coba kata kunci lain.'}
            </p>
          </div>
        ) : musicView === 'artis' ? (
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {artistNames.map((name) => renderGroupSection(name, groupedByArtist[name]))}
          </div>
        ) : musicView === 'folder' ? (
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {folderNames.map((name) => renderGroupSection(name, groupedByFolder[name]))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
            {filtered.map((track) => renderTrackCard(track))}
          </div>
        )}
      </div>

      {/* Hidden probe untuk durasi file-picker */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        src={current ? toPlayableSrc(current.uri) || undefined : undefined}
        preload="metadata"
        onLoadedMetadata={onLoadedMeta}
        className="hidden"
      />
    </div>
  );
}
