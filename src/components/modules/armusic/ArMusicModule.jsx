import React, { useState, useEffect, useRef } from 'react';
import {
  Music, Play, Pause, SkipBack, SkipForward, Search, FolderOpen,
  FileUp, ScanLine, Trash2, ListMusic, Loader2, AlertCircle,
  Shuffle, Repeat, Home, Clock3, Mic, ChevronDown, ChevronRight,
  SlidersHorizontal, Timer, TimerOff, ListPlus, Plus, X, Pencil, Check,
} from 'lucide-react';
import { isNative } from '../../../services/http.js';
import {
  loadLibrary, saveLibrary, removeTrack, mergeScanResults,
  scanLocalAudio, toPlayableSrc, formatTrackDuration, isAudioFilename,
} from '../../../services/localMusic.js';
import {
  publishNowPlaying, setPlaybackState, setPositionState, clearNowPlaying,
} from '../../../services/mediaSession.js';
import {
  showNativeNowPlaying, dismissNativeNowPlaying, onNativeMediaControl,
  nativePlaybackSupported, shouldUseNativePlayback,
  playNativeQueue, updateNativeQueue, pauseNativePlayback, resumeNativePlayback,
  nextNativeTrack, prevNativeTrack, stopNativePlayback,
  seekNativePlayback, getNativePlaybackState,
  getNativeEqualizer, setNativeEqualizerEnabled, setNativeEqualizerBand,
  setNativeEqualizerPreset, setNativeSleepTimer, getNativeSleepTimer,
  formatEqFreq, formatEqGain, formatSleepRemaining,
} from '../../../services/armusicNative.js';
import {
  loadPlaylists, savePlaylists, createPlaylist, renamePlaylist, deletePlaylist,
  addTrackToPlaylist, removeTrackFromPlaylist, resolvePlaylistTracks,
  purgeTrackFromPlaylists, isTrackInPlaylist, groupTracksBy,
} from '../../../services/playlistManager.js';
import {
  fetchLyrics, activeLyricIndex,
} from '../../../services/lyrics.js';
import { registerBackHandler } from '../../../services/backHandler.js';

function filterTracks(tracks, query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return tracks;
  return tracks.filter((t) =>
    `${t.title} ${t.artist} ${t.filename || ''}`.toLowerCase().includes(q)
  );
}

function LyricsPanel({ lyricsState, elapsed, lyricBoxRef }) {
  const { status, synced, plain, instrumental } = lyricsState || {};
  const hasSynced = Array.isArray(synced) && synced.length > 0;
  const idx = hasSynced ? activeLyricIndex(synced, elapsed || 0) : -1;

  // Auto-scroll baris aktif ke tengah panel
  useEffect(() => {
    if (idx < 0) return;
    const box = lyricBoxRef?.current;
    if (!box) return;
    const active = box.querySelector('[data-active="true"]');
    if (active && typeof active.scrollIntoView === 'function') {
      active.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [idx, lyricBoxRef]);

  return (
    <div className="rounded-xl bg-white/5 border border-white/15 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10">
        <Mic className="w-3.5 h-3.5 text-[#FFE600]" />
        <p className="text-[10px] font-mono-code font-black uppercase tracking-wider text-white/70">
          Lirik
        </p>
      </div>
      {status === 'loading' && (
        <div className="flex items-center gap-2 px-3 py-4">
          <Loader2 className="w-4 h-4 animate-spin text-[#FFE600]" />
          <p className="text-xs font-bold text-white/60">Mencari lirik...</p>
        </div>
      )}
      {status === 'notfound' && (
        <p className="px-3 py-4 text-xs font-bold text-white/50">
          Lirik tidak ditemukan untuk lagu ini.
        </p>
      )}
      {status === 'error' && (
        <p className="px-3 py-4 text-xs font-bold text-white/50">
          Gagal memuat lirik. Periksa koneksi lalu ganti lagu untuk coba lagi.
        </p>
      )}
      {status === 'ready' && instrumental && (
        <p className="px-3 py-4 text-xs font-bold text-white/60 italic">
          Lagu instrumental — tidak ada lirik.
        </p>
      )}
      {status === 'ready' && !instrumental && hasSynced && (
        <div ref={lyricBoxRef} className="max-h-56 overflow-y-auto px-3 py-2 space-y-1.5">
          {synced.map((line, i) => {
            const active = i === idx;
            return (
              <p
                key={`${line.t}-${i}`}
                data-active={active ? 'true' : 'false'}
                className={`text-xs leading-relaxed transition-all rounded-md px-2 py-1 ${active ? 'font-black text-[#FFE600] bg-white/10 scale-[1.01]' : 'font-bold text-white/45'}`}
              >
                {line.text}
              </p>
            );
          })}
        </div>
      )}
      {status === 'ready' && !instrumental && !hasSynced && plain && (
        <div className="max-h-56 overflow-y-auto px-3 py-2">
          <p className="text-xs font-bold text-white/70 leading-relaxed whitespace-pre-line">
            {plain}
          </p>
        </div>
      )}
    </div>
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
  const [musicView, setMusicView] = useState('semua'); // semua | artis | folder | playlist — sub-navbar ala Spotify
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsState, setLyricsState] = useState({ status: 'idle', synced: [], plain: '', instrumental: false }); // idle | loading | ready | notfound | error
  // Fase 2: EQ + sleep timer + playlist
  const [playlists, setPlaylists] = useState(() => loadPlaylists());
  const [openPlaylistId, setOpenPlaylistId] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [addToPickTrack, setAddToPickTrack] = useState(null); // track yg mau dimasukkan playlist
  const [groupOpen, setGroupOpen] = useState({}); // artis/folder collapsible: { key: true }
  const [showEq, setShowEq] = useState(false);
  const [eqInfo, setEqInfo] = useState(null);
  const [eqLoading, setEqLoading] = useState(false);
  const [showSleep, setShowSleep] = useState(false);
  const [sleepStatus, setSleepStatus] = useState({ active: false, remainingMs: 0, totalMin: 0 });
  const SLEEP_OPTIONS = [0, 15, 30, 45, 60, 90];

  const showEqRef = useRef(showEq);
  const showSleepRef = useRef(showSleep);
  const addToPickTrackRef = useRef(addToPickTrack);
  const openPlaylistIdRef = useRef(openPlaylistId);

  useEffect(() => { showEqRef.current = showEq; }, [showEq]);
  useEffect(() => { showSleepRef.current = showSleep; }, [showSleep]);
  useEffect(() => { addToPickTrackRef.current = addToPickTrack; }, [addToPickTrack]);
  useEffect(() => { openPlaylistIdRef.current = openPlaylistId; }, [openPlaylistId]);

  useEffect(() => {
    const unregister = registerBackHandler(() => {
      if (showEqRef.current) {
        setShowEq(false);
        return true;
      }
      if (showSleepRef.current) {
        setShowSleep(false);
        return true;
      }
      if (addToPickTrackRef.current) {
        setAddToPickTrack(null);
        return true;
      }
      if (openPlaylistIdRef.current) {
        setOpenPlaylistId(null);
        return true;
      }
      return false;
    });
    return () => unregister();
  }, []);

  const audioRef = useRef(null);
  const fileRef = useRef(null);
  const endRef = useRef(false);
  const lyricBoxRef = useRef(null);
  const lyricReqRef = useRef(0);
  // Routing native-first (ExoPlayer service anti-kill):
  // nativeModeRef=true → audio dimainkan service, WebView <audio> idle (fallback saja).
  const nativeModeRef = useRef(false);
  const nativeSupportRef = useRef(null); // null=belum deteksi, bool=hasil nativePlaybackSupported()
  const effectiveQueueRef = useRef([]); // snapshot list yang dikirim ke native (peta index→id)
  const currentIdRef = useRef(null);
  const pollNativeOnceRef = useRef(null);
  // Refs agar MediaSession action handler selalu memanggil versi terbaru
  const togglePlayRef = useRef(null);
  const nextTrackRef = useRef(null);
  const prevTrackRef = useRef(null);
  const seekToRef = useRef(null);
  const stopRef = useRef(null);
  const toggleShuffleRef = useRef(null);

  const filtered = filterTracks(tracks, query);
  const current = tracks.find((t) => t.id === currentId) || null;

  const persist = (next) => {
    setTracks(next);
    saveLibrary(next);
  };

  // Boot audio element sekali — SINGLETON global agar lagu TIDAK mati
  // saat pindah tab / komponen re-mount. Cleanup hanya lepas listener,
  // TIDAK pernah pause di sini (pause hanya via aksi user / stopPlayback).
  useEffect(() => {
    let audio = globalThis.__arMusicAudio || null;
    if (!audio) {
      audio = document.createElement('audio');
      audio.preload = 'metadata';
      globalThis.__arMusicAudio = audio;
    }
    audioRef.current = audio;
    const onTime = () => setElapsed(audio.currentTime || 0);
    const onMeta = () => setDuration(audio.duration && Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnd = () => { endRef.current = true; setPlaying(false); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    // Sinkronkan state awal kalau audio sudah bunyi sebelum mount (mis. balik ke tab music)
    if (!audio.paused) setPlaying(true);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
      audioRef.current = null;
    };
  }, []);

  // Auto-next setelah track selesai (jalur WebView saja — native memakai
  // auto-advance ExoPlayer + event 'advanced').
  useEffect(() => {
    if (nativeModeRef.current) { endRef.current = false; return; }
    if (!endRef.current) return;
    endRef.current = false;
    if (repeatOne && current) {
      playTrack(current, true);
      return;
    }
    nextTrack(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // Daftar efektif = hasil search (bila aktif) atau seluruh library.
  const effectiveList = () => (filtered.length > 0 ? filtered : tracks);

  // Terapkan urutan shuffle ke list (sinkron dgn state order).
  const buildOrdered = (list, useShuffle) => {
    if (!useShuffle) return list;
    const ord = order.length === list.length ? order : pickFromList(list);
    if (order.length !== list.length) setOrder(ord);
    return ord.map((i) => list[i]).filter(Boolean);
  };

  // Publikasikan metadata ke Web MediaSession + state playback (kedua mode).
  const syncMetaFor = (track, isPlaying) => {
    setPlaybackState(isPlaying);
    if (!track) return;
    publishNowPlaying({
      title: track.title,
      artist: track.artist,
      album: track.folder || 'ArMusic',
      onPlay: () => togglePlayRef.current?.(),
      onPause: () => togglePlayRef.current?.(),
      onPrev: () => prevTrackRef.current?.(),
      onNext: () => nextTrackRef.current?.(),
      onStop: () => stopRef.current?.(),
      onShuffle: () => toggleShuffleRef.current?.(),
      onSeek: (sec) => seekToRef.current?.(sec),
    });
  };

  // Poll sekali state ExoPlayer → sinkronkan UI (posisi, index, playing).
  const pollNativeOnce = async () => {
    const s = await getNativePlaybackState();
    if (!s) return;
    const q = effectiveQueueRef.current;
    if (s.queueSize > 0 && s.index >= 0 && s.index < q.length) {
      const id = q[s.index]?.id ?? q[s.index];
      if (id && id !== currentIdRef.current) {
        currentIdRef.current = id;
        setCurrentId(id);
        setElapsed(0);
      }
    }
    setPlaying(s.playing);
    setPlaybackState(s.playing);
    setElapsed(s.positionMs / 1000);
    if (s.durationMs > 0) setDuration(s.durationMs / 1000);
  };

  // Jalur WebView <audio> — fallback (blob:/data:, browser, atau native gagal).
  const playViaWeb = async (track, src, forceReplay = false) => {
    nativeModeRef.current = false;
    try {
      const audio = audioRef.current;
      if (currentId !== track.id || forceReplay) {
        audio.src = src;
        currentIdRef.current = track.id;
        setCurrentId(track.id);
        setElapsed(0);
        setDuration(track.durationSec || 0);
      }
      await audio.play();
      setPlaying(true);
      syncMetaFor(track, true);
      showNativeNowPlaying({
        title: track.title, artist: track.artist,
        album: track.folder || 'ArMusic', playing: true,
      });
    } catch (e) {
      setError(`Gagal memutar: ${e?.message || e}`);
      setPlaying(false);
    }
  };

  const playTrack = async (track, forceReplay = false, queueOverride = null) => {
    if (!track || track.unavailable) return;
    setError(null);
    const src = toPlayableSrc(track.uri);
    if (!src) {
      setError(`File "${track.filename || track.title}" tidak bisa dibuka. Pilih ulang dari storage.`);
      return;
    }
    // Deteksi dukungan ExoPlayer sekali per sesi
    if (nativeSupportRef.current === null) {
      try {
        nativeSupportRef.current = await nativePlaybackSupported();
      } catch {
        nativeSupportRef.current = false;
      }
    }
    const useNative = shouldUseNativePlayback({
      nativeSupported: nativeSupportRef.current === true,
      uri: track.uri,
    });
    if (!useNative) {
      await playViaWeb(track, src, forceReplay);
      return;
    }
    // Lagu sama sedang dipegang native → lanjutkan saja
    if (nativeModeRef.current && currentIdRef.current === track.id && !forceReplay) {
      await resumeNativePlayback();
      setPlaying(true);
      setPlaybackState(true);
      return;
    }
    // Matikan fallback WebView agar tidak bunyi ganda
    try { audioRef.current?.pause(); } catch { /* abaikan */ }
    // queueOverride dipakai putar-dari-playlist: queue native = isi playlist,
    // bukan list search/library aktif.
    const baseList = (Array.isArray(queueOverride) && queueOverride.length > 0)
      ? queueOverride
      : effectiveList();
    let ordered = buildOrdered(baseList, shuffle);
    let idx = ordered.findIndex((t) => t.id === track.id);
    if (idx < 0) { ordered = [track, ...ordered]; idx = 0; }
    const ok = await playNativeQueue(ordered, idx, { repeatOne });
    if (ok) {
      nativeModeRef.current = true;
      effectiveQueueRef.current = ordered;
      currentIdRef.current = track.id;
      setCurrentId(track.id);
      setElapsed(0);
      setDuration(track.durationSec || 0);
      setPlaying(true);
      syncMetaFor(track, true);
      // Notifikasi kini milik service — JANGAN showNativeNowPlaying (legacy meta-only).
      return;
    }
    // Native gagal terkirim → fallback WebView
    setError('Pemutar native gagal — memakai pemutar WebView.');
    await playViaWeb(track, src, forceReplay);
  };

  const togglePlay = () => {
    if (nativeModeRef.current) {
      if (playing) {
        pauseNativePlayback();
        setPlaying(false);
        setPlaybackState(false);
      } else if (current) {
        resumeNativePlayback();
        setPlaying(true);
        setPlaybackState(true);
        pollNativeOnceRef.current?.();
      } else if (filtered.length > 0) {
        playTrack(filtered[0]);
      }
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      setPlaybackState(false);
      showNativeNowPlaying({
        title: current.title, artist: current.artist,
        album: current.folder || 'ArMusic', playing: false,
      });
    } else if (current) {
      audio.play().then(() => {
        setPlaying(true);
        setPlaybackState(true);
        showNativeNowPlaying({
          title: current.title, artist: current.artist,
          album: current.folder || 'ArMusic', playing: true,
        });
        publishNowPlaying({
          title: current.title,
          artist: current.artist,
          album: current.folder || 'ArMusic',
          onPlay: () => togglePlayRef.current?.(),
          onPause: () => togglePlayRef.current?.(),
          onPrev: () => prevTrackRef.current?.(),
          onNext: () => nextTrackRef.current?.(),
          onStop: () => stopRef.current?.(),
          onShuffle: () => toggleShuffleRef.current?.(),
          onSeek: (sec) => seekToRef.current?.(sec),
        });
      }).catch((e) => setError(`Gagal memutar: ${e?.message || e}`));
    } else if (filtered.length > 0) {
      playTrack(filtered[0]);
    }
  };

  const pickFromList = (fromFiltered) => (shuffle
    ? [...Array(fromFiltered.length).keys()].sort(() => Math.random() - 0.5)
    : [...Array(fromFiltered.length).keys()]);

  const nextTrack = (auto = false) => {
    if (nativeModeRef.current) {
      if (auto) return; // auto-advance dipegang ExoPlayer; event 'advanced' sinkronkan UI
      nextNativeTrack();
      // Optimistic UI — poll koreksi posisi/index aktual
      setTimeout(() => pollNativeOnceRef.current?.(), 350);
      return;
    }
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
    if (nativeModeRef.current) {
      prevNativeTrack();
      setTimeout(() => pollNativeOnceRef.current?.(), 350);
      return;
    }
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
    const pct = Number(e.target.value);
    setProgress(pct);
    if (nativeModeRef.current) {
      if (duration > 0) {
        const sec = (pct / 100) * duration;
        setElapsed(sec);
        seekNativePlayback(sec * 1000);
      }
      return;
    }
    const audio = audioRef.current;
    if (audio && duration > 0) {
      audio.currentTime = (pct / 100) * duration;
    }
  };

  const seekTo = (sec) => {
    if (nativeModeRef.current) {
      if (Number.isFinite(sec) && duration > 0) {
        const clamped = Math.min(Math.max(0, sec), duration);
        setElapsed(clamped);
        seekNativePlayback(clamped * 1000);
      }
      return;
    }
    const audio = audioRef.current;
    if (audio && Number.isFinite(sec) && duration > 0) {
      audio.currentTime = Math.min(Math.max(0, sec), duration);
    }
  };

  const stopPlayback = () => {
    if (nativeModeRef.current) {
      stopNativePlayback();
      nativeModeRef.current = false;
      effectiveQueueRef.current = [];
      setPlaying(false);
      setPlaybackState(false);
      clearNowPlaying();
      try { localStorage.removeItem('armusic-native-queue'); } catch { /* abaikan */ }
      return;
    }
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    setPlaybackState(false);
    dismissNativeNowPlaying();
    clearNowPlaying();
  };

  const toggleShuffle = () => {
    const nextVal = !shuffle;
    setShuffle(nextVal);
    // Sinkronkan urutan ke ExoPlayer tanpa memutus lagu aktif
    if (nativeModeRef.current && effectiveQueueRef.current.length > 0) {
      let target;
      if (nextVal) {
        target = [...effectiveQueueRef.current].sort(() => Math.random() - 0.5);
        const curId = currentIdRef.current;
        if (curId) {
          const at = target.findIndex((t) => t.id === curId);
          if (at > 0) { const [c] = target.splice(at, 1); target.unshift(c); }
        }
      } else {
        // Kembali ke urutan library/search semula
        const base = effectiveList();
        target = base.filter((t) => effectiveQueueRef.current.some((q) => q.id === t.id));
        if (target.length !== effectiveQueueRef.current.length) {
          target = effectiveQueueRef.current; // fallback aman
        }
      }
      effectiveQueueRef.current = target;
      updateNativeQueue(target, -1, repeatOne);
    }
  };

  const toggleRepeatOne = () => {
    const nextVal = !repeatOne;
    setRepeatOne(nextVal);
    if (nativeModeRef.current && effectiveQueueRef.current.length > 0) {
      updateNativeQueue(effectiveQueueRef.current, -1, nextVal);
    }
  };

  // Terima event dari service + aksi tombol notifikasi/lockscreen/headset.
  // Service SUDAH mengeksekusi perintah secara native — JS hanya sinkronkan UI.
  useEffect(() => {
    const off = onNativeMediaControl((ev) => {
      const action = typeof ev === 'string' ? ev : ev?.action;
      if (!nativeModeRef.current) {
        if (action === 'toggle') togglePlayRef.current?.();
        else if (action === 'next') nextTrackRef.current?.();
        else if (action === 'prev') prevTrackRef.current?.();
        else if (action === 'stop') stopRef.current?.();
        return;
      }
      // Mode native: service sudah eksekusi, JS sinkron UI via poll.
      if (action === 'stop') { stopRef.current?.(); return; }
      if (action === 'sleep-ended' || action === 'sleepended') {
        setPlaying(false);
        setPlaybackState(false);
        refreshSleepStatus();
        return;
      }
      if (action === 'queue-ended' || action === 'queueended') {
        setPlaying(false);
        setPlaybackState(false);
        return;
      }
      if (action === 'error') {
        setError(typeof ev === 'object' && ev?.message ? String(ev.message) : 'Pemutar native error.');
        return;
      }
      if (action === 'advanced' && typeof ev === 'object' && ev?.index != null) {
        const q = effectiveQueueRef.current;
        const item = q[Number(ev.index)];
        const id = item?.id ?? item;
        if (id && id !== currentIdRef.current) {
          currentIdRef.current = id;
          setCurrentId(id);
          setElapsed(0);
          setPlaying(true);
          setPlaybackState(true);
          const track = tracks.find((t) => t.id === id);
          if (track) syncMetaFor(track, true);
        }
      }
      // toggle/next/prev → poll koreksi state aktual
      setTimeout(() => pollNativeOnceRef.current?.(), 250);
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sinkronkan refs agar handler notif/lockscreen tak pernah stale
  useEffect(() => {
    togglePlayRef.current = togglePlay;
    nextTrackRef.current = nextTrack;
    prevTrackRef.current = prevTrack;
    seekToRef.current = seekTo;
    stopRef.current = stopPlayback;
    toggleShuffleRef.current = toggleShuffle;
    pollNativeOnceRef.current = pollNativeOnce;
  });

  // Polling posisi ExoPlayer tiap 1 detik saat mode native agar progress bar,
  // timer, dan lirik tetap hidup walau WebView di-background.
  useEffect(() => {
    if (!playing || !nativeModeRef.current) return undefined;
    const t = setInterval(() => { pollNativeOnceRef.current?.(); }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, currentId]);

  // Progress bar di notif lockscreen/shade
  useEffect(() => {
    if (current && playing && duration > 0) {
      setPositionState({ duration, position: elapsed, playbackRate: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  // Ambil lirik tiap ganti lagu (cache-first, batalkan request basi)
  useEffect(() => {
    if (!current) {
      setLyricsState({ status: 'idle', synced: [], plain: '', instrumental: false });
      return;
    }
    const reqId = ++lyricReqRef.current;
    setLyricsState({ status: 'loading', synced: [], plain: '', instrumental: false });
    fetchLyrics({
      artist: current.artist,
      title: current.title,
      durationSec: current.durationSec || duration || 0,
    }).then((res) => {
      if (lyricReqRef.current !== reqId) return; // lagu sudah ganti — abaikan
      if (res?.found) {
        setLyricsState({
          status: 'ready',
          synced: res.synced || [],
          plain: res.plain || '',
          instrumental: Boolean(res.instrumental),
        });
      } else {
        setLyricsState({ status: 'notfound', synced: [], plain: '', instrumental: false });
      }
    }).catch(() => {
      if (lyricReqRef.current !== reqId) return;
      setLyricsState({ status: 'error', synced: [], plain: '', instrumental: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

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
      if (nativeModeRef.current) {
        // Keluarkan dari queue native; bila tersisa lanjutkan, bila habis stop.
        const rest = effectiveQueueRef.current.filter((t) => t.id !== id);
        if (rest.length > 0) {
          effectiveQueueRef.current = rest;
          updateNativeQueue(rest, 0, repeatOne).then(() => pollNativeOnceRef.current?.());
        } else {
          stopPlayback();
        }
        currentIdRef.current = rest[0]?.id ?? null;
        setCurrentId(rest[0]?.id ?? null);
      } else {
        audioRef.current?.pause();
        setPlaying(false);
        setPlaybackState(false);
        dismissNativeNowPlaying();
        clearNowPlaying();
        currentIdRef.current = null;
        setCurrentId(null);
      }
    } else if (nativeModeRef.current) {
      // Hapus lagu lain dari queue native juga
      const rest = effectiveQueueRef.current.filter((t) => t.id !== id);
      if (rest.length !== effectiveQueueRef.current.length) {
        effectiveQueueRef.current = rest;
        updateNativeQueue(rest, -1, repeatOne);
      }
    }
    persist(removeTrack(loadLibrary(), id));
    // Sinkron: keluarkan dari semua playlist agar tak ada track yatim
    setPlaylists((prev) => savePlaylists(purgeTrackFromPlaylists(prev, id)));
  };

  // ---------------------------------------------------------- Fase 2: playlist

  const persistPlaylists = (next) => {
    const clean = savePlaylists(next);
    setPlaylists(clean);
    return clean;
  };

  const handleCreatePlaylist = () => {
    const { next } = createPlaylist(playlists, newPlaylistName);
    persistPlaylists(next);
    setNewPlaylistName('');
    const created = next[next.length - 1];
    if (created) setOpenPlaylistId(created.id);
  };

  const handleRenamePlaylist = (id) => {
    persistPlaylists(renamePlaylist(playlists, id, editingName));
    setEditingPlaylistId(null);
    setEditingName('');
  };

  const handleDeletePlaylist = (id) => {
    persistPlaylists(deletePlaylist(playlists, id));
    if (openPlaylistId === id) setOpenPlaylistId(null);
  };

  const handleAddTrackToPlaylist = (playlistId, trackId) => {
    persistPlaylists(addTrackToPlaylist(playlists, playlistId, trackId));
    setAddToPickTrack(null);
  };

  const handleRemoveTrackFromPlaylist = (playlistId, trackId) => {
    persistPlaylists(removeTrackFromPlaylist(playlists, playlistId, trackId));
  };

  const handlePlayPlaylist = (playlistId) => {
    const list = resolvePlaylistTracks(playlists, playlistId, tracks);
    if (list.length > 0) playTrack(list[0], false, list);
  };

  // ---------------------------------------------------------- Fase 2: sleep timer

  const refreshSleepStatus = async () => {
    const s = await getNativeSleepTimer().catch(() => null);
    if (s) setSleepStatus(s);
    else setSleepStatus({ active: false, remainingMs: 0, totalMin: 0 });
  };

  const handleSetSleep = async (minutes) => {
    await setNativeSleepTimer(minutes).catch(() => {});
    await refreshSleepStatus();
    setShowSleep(false);
  };

  // ---------------------------------------------------------- Fase 2: equalizer

  const refreshEqInfo = async () => {
    setEqLoading(true);
    try {
      if (isNative()) {
        const info = await getNativeEqualizer().catch(() => null);
        if (info) setEqInfo(info);
      } else {
        setEqInfo((prev) => prev || {
          supported: true,
          attached: true,
          enabled: true,
          bandCount: 5,
          minGainMb: -1500,
          maxGainMb: 1500,
          centerFreqs: [60000, 230000, 910000, 3600000, 14000000],
          gains: [0, 0, 0, 0, 0],
          presetCount: 5,
          presetNames: ['Flat', 'Bass Boost', 'Treble Boost', 'Vocal', 'Rock'],
          presetIndex: 0,
        });
      }
    } finally {
      setEqLoading(false);
    }
  };

  const handleEqToggle = async () => {
    const nextVal = !(eqInfo?.enabled ?? false);
    await setNativeEqualizerEnabled(nextVal).catch(() => {});
    setEqInfo((prev) => (prev ? { ...prev, enabled: nextVal } : prev));
  };

  const handleEqBand = async (band, gainMb) => {
    setEqInfo((prev) => {
      if (!prev) return prev;
      const gains = [...(prev.gains || [])];
      gains[band] = gainMb;
      return { ...prev, gains, presetIndex: -1, enabled: true };
    });
    await setNativeEqualizerBand(band, gainMb).catch(() => {});
  };

  const handleEqPreset = async (preset) => {
    if (isNative()) {
      await setNativeEqualizerPreset(preset).catch(() => {});
      await refreshEqInfo();
    } else {
      const presetsMap = [
        [0, 0, 0, 0, 0], // Flat
        [600, 400, 0, -200, -300], // Bass Boost
        [-200, 0, 100, 400, 600], // Treble Boost
        [-100, 200, 500, 200, -100], // Vocal
        [500, 200, -100, 300, 500], // Rock
      ];
      const gains = presetsMap[preset] || [0, 0, 0, 0, 0];
      setEqInfo((prev) => (prev ? { ...prev, gains, presetIndex: preset, enabled: true } : prev));
    }
  };

  const handleEqReset = async () => {
    if (isNative()) {
      for (let b = 0; b < (eqInfo?.bandCount || 5); b++) {
        await setNativeEqualizerBand(b, 0).catch(() => {});
      }
      await refreshEqInfo();
    } else {
      setEqInfo((prev) => (prev ? { ...prev, gains: [0, 0, 0, 0, 0], presetIndex: 0 } : prev));
    }
  };

  // Countdown badge timer — refresh tiap 5 detik saat aktif agar label hidup.
  useEffect(() => {
    if (!sleepStatus.active) return undefined;
    const t = setInterval(() => { refreshSleepStatus(); }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepStatus.active]);

  // Ambil status timer sekali saat modul dibuka (native tahan restart service).
  useEffect(() => {
    refreshSleepStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          onClick={(e) => { e.stopPropagation(); setAddToPickTrack(track); }}
          className="w-7 h-7 rounded-lg bg-white hover:bg-yellow-100 border border-black flex items-center justify-center text-[#121212] transition-colors shadow-[1px_1px_0px_#121212] shrink-0"
          title="Tambah ke playlist"
        >
          <ListPlus className="w-3.5 h-3.5" />
        </button>
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
            <button
              onClick={() => setShowLyrics((v) => !v)}
              title={showLyrics ? 'Sembunyikan lirik' : 'Tampilkan lirik'}
              className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${showLyrics ? 'bg-[#FFE600] text-[#121212] border-[#FFE600]' : 'bg-transparent text-white/60 border-white/30 hover:text-white'}`}
            >
              {showLyrics ? <ChevronDown className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
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
              onClick={toggleShuffle}
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
              onClick={toggleRepeatOne}
              title="Ulangi satu lagu"
              className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all ${repeatOne ? 'bg-[#FFE600] text-[#121212] border-[#FFE600]' : 'bg-transparent text-white/60 border-white/30'}`}
            >
              <Repeat className="w-4 h-4" />
            </button>
            <button
              onClick={() => { refreshEqInfo(); setShowEq(true); }}
              title="Equalizer"
              className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all ${eqInfo?.enabled ? 'bg-[#FFE600] text-[#121212] border-[#FFE600]' : 'bg-transparent text-white/60 border-white/30'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={() => { refreshSleepStatus(); setShowSleep(true); }}
              title="Sleep timer"
              className={`relative w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all ${sleepStatus.active ? 'bg-[#FFE600] text-[#121212] border-[#FFE600]' : 'bg-transparent text-white/60 border-white/30'}`}
            >
              {sleepStatus.active ? <TimerOff className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
            </button>
          </div>
          {sleepStatus.active && sleepStatus.remainingMs > 0 && (
            <p className="text-center text-[10px] font-mono-code font-bold text-[#FFE600]">
              Tidur dalam {formatSleepRemaining(sleepStatus.remainingMs)} — ketuk ikon timer untuk batalkan
            </p>
          )}
          {showLyrics && (
            <LyricsPanel
              lyricsState={lyricsState}
              elapsed={elapsed}
              lyricBoxRef={lyricBoxRef}
            />
          )}
        </div>
      )}

      {/* Koleksi — sub-navbar: SEMUA | ARTIS | FOLDER | PLAYLIST */}
      <div className="nb-card p-4 bg-white space-y-3 shadow-[3px_3px_0px_#121212]">
        <div className="flex items-center justify-between border-b-2 border-black pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#121212]" />
            <h3 className="font-mono-code font-black text-xs text-[#121212] uppercase tracking-wider">
              KOLEKSI ({tracks.length})
            </h3>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[['semua', 'Semua'], ['artis', 'Artis'], ['folder', 'Folder'], ['playlist', `Playlist (${playlists.length})`]].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setMusicView(v)}
                className={`px-2 py-1 rounded-lg border border-black text-[10px] font-black uppercase shadow-[1.5px_1.5px_0px_#121212] ${musicView === v ? 'bg-[#121212] text-[#FFE600]' : 'bg-white text-[#121212]'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {musicView === 'semua' && (
          <>
            {filtered.length > 0 && (
              <button
                onClick={() => playTrack(filtered[0])}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#38E54D] border border-black text-[10px] font-black uppercase shadow-[1.5px_1.5px_0px_#121212]"
              >
                <Play className="w-3 h-3" />
                <span>Putar{query ? ' hasil' : ''} ({filtered.length})</span>
              </button>
            )}
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
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                {filtered.map((track) => renderTrackCard(track))}
              </div>
            )}
          </>
        )}

        {(musicView === 'artis' || musicView === 'folder') && (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {groupTracksBy(filtered, musicView === 'artis' ? 'artist' : 'folder').map(({ name, items }) => {
              const key = `${musicView}:${name}`;
              const open = groupOpen[key] ?? false;
              return (
                <div key={key} className="rounded-xl border-2 border-black overflow-hidden">
                  <button
                    onClick={() => setGroupOpen((p) => ({ ...p, [key]: !open }))}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-[#F8F5EE] hover:bg-[#FFE600]/40 transition-colors"
                  >
                    {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="flex-1 text-left text-xs font-black text-[#121212] truncate">{name}</span>
                    <span className="text-[10px] font-mono-code font-bold text-gray-500">{items.length} lagu</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); if (items[0]) playTrack(items[0], false, items); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); if (items[0]) playTrack(items[0], false, items); } }}
                      className="w-7 h-7 rounded-lg bg-[#38E54D] border border-black flex items-center justify-center shadow-[1px_1px_0px_#121212]"
                      title={`Putar semua dari ${name}`}
                    >
                      <Play className="w-3.5 h-3.5" />
                    </span>
                  </button>
                  {open && (
                    <div className="p-2 space-y-2 bg-white border-t-2 border-black">
                      {items.map((track) => renderTrackCard(track))}
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-xs font-bold text-gray-500 py-6">Belum ada lagu untuk dikelompokkan.</p>
            )}
          </div>
        )}

        {musicView === 'playlist' && (
          <div className="space-y-3">
            {/* Buat playlist baru */}
            <div className="flex gap-2">
              <input
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreatePlaylist(); }}
                placeholder="Nama playlist baru..."
                maxLength={60}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-bold text-[#121212] placeholder:text-gray-400 outline-none"
              />
              <button
                onClick={handleCreatePlaylist}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#38E54D] border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black uppercase"
              >
                <Plus className="w-4 h-4" />
                <span>Buat</span>
              </button>
            </div>
            {playlists.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <ListMusic className="w-10 h-10 mx-auto text-[#121212]/20" />
                <p className="text-sm font-black text-[#121212]">Belum ada playlist</p>
                <p className="text-xs font-medium text-gray-500 max-w-xs mx-auto">
                  Buat playlist di atas, lalu ketuk ikon tambah di tiap lagu untuk mengisinya.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {playlists.map((pl) => {
                  const list = resolvePlaylistTracks(playlists, pl.id, tracks);
                  const open = openPlaylistId === pl.id;
                  const editing = editingPlaylistId === pl.id;
                  return (
                    <div key={pl.id} className="rounded-xl border-2 border-black overflow-hidden">
                      <button
                        onClick={() => setOpenPlaylistId(open ? null : pl.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 transition-colors ${open ? 'bg-[#FFE600]' : 'bg-[#F8F5EE] hover:bg-[#FFE600]/40'}`}
                      >
                        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        {editing ? (
                          <span className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleRenamePlaylist(pl.id); if (e.key === 'Escape') setEditingPlaylistId(null); }}
                              autoFocus
                              maxLength={60}
                              className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-black text-xs font-bold outline-none"
                            />
                            <span role="button" tabIndex={0} onClick={() => handleRenamePlaylist(pl.id)} onKeyDown={(e) => { if (e.key === 'Enter') handleRenamePlaylist(pl.id); }} className="w-7 h-7 rounded-lg bg-[#38E54D] border border-black flex items-center justify-center" title="Simpan">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          </span>
                        ) : (
                          <>
                            <span className="flex-1 text-left text-xs font-black text-[#121212] truncate">{pl.name}</span>
                            <span className="text-[10px] font-mono-code font-bold text-gray-500">{list.length} lagu</span>
                          </>
                        )}
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); handlePlayPlaylist(pl.id); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handlePlayPlaylist(pl.id); } }}
                          className="w-7 h-7 rounded-lg bg-[#38E54D] border border-black flex items-center justify-center shadow-[1px_1px_0px_#121212]"
                          title={`Putar ${pl.name}`}
                        >
                          <Play className="w-3.5 h-3.5" />
                        </span>
                      </button>
                      {open && (
                        <div className="p-2 space-y-2 bg-white border-t-2 border-black">
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => { setEditingPlaylistId(pl.id); setEditingName(pl.name); }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-black text-[10px] font-black uppercase"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Ubah nama</span>
                            </button>
                            <button
                              onClick={() => handleDeletePlaylist(pl.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-black text-[10px] font-black uppercase text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Hapus</span>
                            </button>
                          </div>
                          {list.length === 0 ? (
                            <p className="text-[11px] font-bold text-gray-500 py-2 text-center">
                              Playlist kosong — ketuk ikon tambah di daftar Semua untuk mengisi.
                            </p>
                          ) : (
                            list.map((track) => (
                              <div
                                key={track.id}
                                onClick={() => playTrack(track, false, list)}
                                className={`nb-card p-2 flex items-center gap-2 transition-all cursor-pointer shadow-[1.5px_1.5px_0px_#121212] ${track.id === currentId ? 'bg-[#FFE600]' : 'bg-[#F8F5EE] hover:bg-white'}`}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-[#121212] truncate">{track.title}</p>
                                  <p className="text-[10px] font-mono-code font-bold text-gray-500 truncate">{track.artist}</p>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRemoveTrackFromPlaylist(pl.id, track.id); }}
                                  className="w-7 h-7 rounded-lg bg-white hover:bg-red-100 border border-black flex items-center justify-center text-red-600 shrink-0"
                                  title="Keluarkan dari playlist"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Equalizer */}
      {showEq && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3" onClick={() => setShowEq(false)}>
          <div
            className="w-full max-w-md bg-white rounded-2xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212] p-4 space-y-3 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                <h3 className="font-black text-sm uppercase">Equalizer</h3>
              </div>
              <button onClick={() => setShowEq(false)} className="w-8 h-8 rounded-lg bg-white border-2 border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#121212]" title="Tutup">
                <X className="w-4 h-4" />
              </button>
            </div>
            {eqLoading && !eqInfo ? (
              <p className="flex items-center gap-2 text-xs font-bold text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Memuat equalizer...</p>
            ) : !eqInfo || eqInfo.supported === false ? (
              <p className="text-xs font-bold text-gray-500">Perangkat ini tidak mendukung equalizer.</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase">{eqInfo.enabled ? 'Aktif' : 'Mati'}</span>
                  <button
                    onClick={handleEqToggle}
                    className={`px-3 py-1.5 rounded-xl border-2 border-black text-xs font-black uppercase shadow-[2px_2px_0px_#121212] ${eqInfo.enabled ? 'bg-[#FFE600]' : 'bg-white'}`}
                  >
                    {eqInfo.enabled ? 'Matikan' : 'Nyalakan'}
                  </button>
                </div>
                {eqInfo.presetNames?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono-code font-black uppercase text-gray-500 mb-1.5">Preset</p>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {eqInfo.presetNames.map((name, i) => (
                        <button
                          key={name}
                          onClick={() => handleEqPreset(i)}
                          className={`px-2.5 py-1.5 rounded-lg border border-black text-[11px] font-black whitespace-nowrap shadow-[1.5px_1.5px_0px_#121212] ${eqInfo.presetIndex === i ? 'bg-[#121212] text-[#FFE600]' : 'bg-[#F8F5EE]'}`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2.5">
                  {Array.from({ length: eqInfo.bandCount }).map((_, b) => (
                    <div key={b} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black">{formatEqFreq(eqInfo.centerFreqs?.[b])}</span>
                        <span className="text-[11px] font-mono-code font-bold text-gray-600">{formatEqGain(eqInfo.gains?.[b] ?? 0)}</span>
                      </div>
                      <input
                        type="range"
                        min={eqInfo.minGainMb}
                        max={eqInfo.maxGainMb}
                        step={100}
                        value={eqInfo.gains?.[b] ?? 0}
                        onChange={(e) => handleEqBand(b, Number(e.target.value))}
                        disabled={!eqInfo.enabled}
                        className="w-full accent-[#121212] disabled:opacity-40"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleEqReset}
                  className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-black uppercase shadow-[2px_2px_0px_#121212]"
                >
                  Reset ke Flat
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Sleep Timer */}
      {showSleep && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3" onClick={() => setShowSleep(false)}>
          <div
            className="w-full max-w-sm bg-white rounded-2xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212] p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4" />
                <h3 className="font-black text-sm uppercase">Sleep Timer</h3>
              </div>
              <button onClick={() => setShowSleep(false)} className="w-8 h-8 rounded-lg bg-white border-2 border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#121212]" title="Tutup">
                <X className="w-4 h-4" />
              </button>
            </div>
            {!isNative() ? (
              <p className="text-xs font-bold text-gray-500">Sleep timer hanya tersedia di aplikasi Android.</p>
            ) : (
              <>
                <p className="text-xs font-bold text-gray-700">
                  {sleepStatus.active && sleepStatus.remainingMs > 0
                    ? `Musik berhenti dalam ${formatSleepRemaining(sleepStatus.remainingMs)} (fade-out 3 detik).`
                    : 'Musik berhenti otomatis + fade-out 3 detik saat waktu habis.'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {SLEEP_OPTIONS.map((m) => {
                    const active = m === 0
                      ? !sleepStatus.active
                      : sleepStatus.active && sleepStatus.totalMin === m;
                    return (
                      <button
                        key={m}
                        onClick={() => handleSetSleep(m)}
                        className={`px-2 py-2.5 rounded-xl border-2 border-black text-xs font-black shadow-[2px_2px_0px_#121212] ${active ? 'bg-[#121212] text-[#FFE600]' : 'bg-[#F8F5EE]'}`}
                      >
                        {m === 0 ? 'Mati' : `${m} mnt`}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Tambah ke Playlist */}
      {addToPickTrack && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3" onClick={() => setAddToPickTrack(null)}>
          <div
            className="w-full max-w-sm bg-white rounded-2xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212] p-4 space-y-3 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <ListPlus className="w-4 h-4 shrink-0" />
                <h3 className="font-black text-sm uppercase truncate">Tambah ke Playlist</h3>
              </div>
              <button onClick={() => setAddToPickTrack(null)} className="w-8 h-8 rounded-lg bg-white border-2 border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#121212] shrink-0" title="Tutup">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-bold text-gray-600 truncate">{addToPickTrack.title} — {addToPickTrack.artist}</p>
            <div className="flex gap-2">
              <input
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreatePlaylist(); }}
                placeholder="Playlist baru..."
                maxLength={60}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[#F8F5EE] border-2 border-black text-xs font-bold outline-none placeholder:text-gray-400"
              />
              <button
                onClick={handleCreatePlaylist}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#38E54D] border-2 border-black text-xs font-black uppercase shadow-[2px_2px_0px_#121212]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {playlists.length === 0 ? (
              <p className="text-xs font-bold text-gray-500 text-center py-2">Belum ada playlist — buat dulu di atas.</p>
            ) : (
              <div className="space-y-1.5">
                {playlists.map((pl) => {
                  const inList = isTrackInPlaylist(playlists, pl.id, addToPickTrack.id);
                  return (
                    <button
                      key={pl.id}
                      onClick={() => handleAddTrackToPlaylist(pl.id, addToPickTrack.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-black text-left shadow-[1.5px_1.5px_0px_#121212] ${inList ? 'bg-[#FFE600]' : 'bg-[#F8F5EE] hover:bg-white'}`}
                    >
                      <span className="flex-1 min-w-0 text-xs font-black truncate">{pl.name}</span>
                      {inList && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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
