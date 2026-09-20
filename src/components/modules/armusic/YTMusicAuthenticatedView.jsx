import React, { useState, useEffect } from 'react';
import {
  Music, Play, Pause, Download, Loader2, AlertCircle, Heart, Clock, User, LogOut,
} from 'lucide-react';
import { loginYouTubeMusic, logoutYouTubeMusic, loadAuthState } from '../../../services/youtubeMusicAuth.js';
import { getLibrary, getLikedSongs, searchAuthenticated, getRecommendations } from '../../../services/youtubeMusicClient.js';
import { resolveYouTubeMusicAudioUrl } from '../../../services/musicStream.js';
import { isBotBlockError, formatResolverError } from '../../../services/scrapers/youtube.js';

export default function YTMusicAuthenticatedView({ playTrack, onDownload, currentId, playing, onPlayError }) {
  const [authState, setAuthState] = useState(() => loadAuthState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'liked' | 'recommendations'
  const [tracks, setTracks] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);

  useEffect(() => {
    if (authState && activeTab === 'library') {
      loadLibrary();
    } else if (authState && activeTab === 'liked') {
      loadLikedSongs();
    } else if (authState && activeTab === 'recommendations') {
      loadRecommendations();
    }
  }, [authState, activeTab]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loginYouTubeMusic();
      setAuthState(result);
    } catch (err) {
      setError(err.message || 'Login gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutYouTubeMusic();
    setAuthState(null);
    setTracks([]);
  };

  const loadLibrary = async () => {
    setLoading(true);
    setError(null);
    try {
      const library = await getLibrary();
      setTracks(library);
    } catch (err) {
      setError(err.message || 'Gagal memuat library.');
    } finally {
      setLoading(false);
    }
  };

  const loadLikedSongs = async () => {
    setLoading(true);
    setError(null);
    try {
      const liked = await getLikedSongs();
      setTracks(liked);
    } catch (err) {
      setError(err.message || 'Gagal memuat liked songs.');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const recs = await getRecommendations();
      // Flatten sections → single track list
      const allTracks = recs.flatMap(section => section.tracks);
      setTracks(allTracks);
    } catch (err) {
      setError(err.message || 'Gagal memuat rekomendasi.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async (track) => {
    if (!track?.videoId || resolvingId) return;
    setError(null);
    setResolvingId(track.videoId);

    try {
      const audioUrl = await resolveYouTubeMusicAudioUrl({
        videoId: track.videoId,
        query: `${track.title} ${track.artist}`,
        onProgress: null,
      });

      if (!audioUrl) {
        throw new Error('Stream audio tidak dapat di-resolve.');
      }

      const playableTrack = {
        id: `ytm:${track.videoId}`,
        title: track.title,
        artist: track.artist || 'YouTube Music',
        filename: `${track.title}.mp3`,
        folder: 'YouTube Music',
        uri: audioUrl,
        durationSec: track.duration || 0,
        source: 'stream',
        streamRef: track,
      };

      await playTrack(playableTrack);
    } catch (err) {
      const msg = formatResolverError(err, track?.title || '');
      setError(isBotBlockError(err)
        ? 'YouTube Music sedang memblokir permintaan. Tunggu sebentar lalu coba lagi.'
        : msg);
      if (onPlayError) onPlayError(msg);
    } finally {
      setResolvingId(null);
    }
  };

  const handleDownload = (track) => {
    if (!track?.videoId) return;
    if (onDownload) {
      onDownload({
        videoId: track.videoId,
        title: track.title,
        artist: track.artist || 'YouTube Music',
        url: `https://music.youtube.com/watch?v=${track.videoId}`,
        youtubeUrl: `https://www.youtube.com/watch?v=${track.videoId}`,
        cover: track.cover,
        duration: track.duration,
      });
    }
  };

  const isTrackPlaying = (videoId) => currentId === `ytm:${videoId}` && playing;
  const isTrackCurrent = (videoId) => currentId === `ytm:${videoId}`;

  // ============ RENDER ============

  if (!authState) {
    // Not logged in → show login prompt
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 px-4 text-center rounded-xl bg-[#F8F5EE] border-2 border-dashed border-gray-300">
        <Music className="w-12 h-12 text-[#121212]/20" />
        <p className="text-sm font-black text-[#121212]">YouTube Music Personal</p>
        <p className="text-xs font-bold text-gray-500 max-w-xs">
          Login dengan akun Google untuk akses library personal, liked songs, dan rekomendasi.
        </p>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="mt-2 px-4 py-2 rounded-lg bg-[#FFE600] hover:bg-[#FFE600]/80 border-2 border-black text-sm font-black text-[#121212] shadow-[2px_2px_0px_#121212] disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : '🔐 Login dengan Google'}
        </button>
        {error && (
          <div className="mt-2 p-2 rounded-lg bg-white border border-[#FF525E] text-xs font-bold text-[#121212]">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Logged in → show tabs + content
  return (
    <div className="space-y-3">
      {/* Header dengan user info + logout */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8F5EE] border border-black">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#38E54D] border border-black flex items-center justify-center">
            <User className="w-3 h-3 text-[#121212]" />
          </div>
          <span className="text-xs font-bold text-[#121212]">{authState.userEmail || 'Logged In'}</span>
        </div>
        <button
          onClick={handleLogout}
          className="px-2 py-1 rounded-lg bg-white hover:bg-gray-100 border border-black text-[10px] font-mono-code font-black uppercase"
        >
          <LogOut className="w-3 h-3 inline mr-1" />
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'library', label: 'Library', icon: Music },
          { id: 'liked', label: 'Liked Songs', icon: Heart },
          { id: 'recommendations', label: 'For You', icon: Sparkles },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 px-2 py-1.5 rounded-lg border border-black text-[10px] font-mono-code font-black uppercase shadow-[1px_1px_0px_#121212] ${
              activeTab === id ? 'bg-[#FFE600]' : 'bg-white hover:bg-[#F8F5EE]'
            }`}
          >
            <Icon className="w-3 h-3 inline mr-1 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#D8B4FE]/30 border border-black/20">
          <Loader2 className="w-4 h-4 animate-spin text-[#121212]" />
          <p className="text-xs font-bold text-[#121212]">Memuat...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white border-2 border-[#FF525E] shadow-[2px_2px_0px_#FF525E]">
          <AlertCircle className="w-4 h-4 text-[#FF525E] shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-[#121212]">{error}</p>
        </div>
      )}

      {/* Tracks */}
      {!loading && tracks.length > 0 && (
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {tracks.map((track) => {
            const playingNow = isTrackPlaying(track.videoId);
            const isCurrent = isTrackCurrent(track.videoId);
            return (
              <div
                key={track.videoId}
                onClick={() => handlePlay(track)}
                className={`nb-card p-2.5 flex items-center gap-2.5 cursor-pointer transition-all shadow-[1.5px_1.5px_0px_#121212] ${
                  isCurrent ? 'bg-[#FFE600]' : 'bg-[#F8F5EE] hover:bg-white'
                }`}
              >
                <div className="w-11 h-11 rounded-lg overflow-hidden border border-black bg-[#D8B4FE] shrink-0 flex items-center justify-center shadow-[1px_1px_0px_#121212]">
                  {track.cover ? (
                    <img src={track.cover} alt={track.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Music className="w-5 h-5 text-[#121212]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black truncate text-[#121212]">{track.title}</p>
                  <p className="text-[10px] font-mono-code font-bold text-gray-500 truncate flex items-center gap-1">
                    <User className="w-2.5 h-2.5" />
                    {track.artist}
                    {track.durationFormatted ? ` • ${track.durationFormatted}` : ''}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePlay(track); }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-black shadow-[1px_1px_0px_#121212] ${
                    playingNow ? 'bg-[#121212] text-[#FFE600]' : 'bg-white text-[#121212] hover:bg-[#FFE600]'
                  }`}
                  title={playingNow ? 'Sedang diputar' : 'Putar'}
                >
                  {resolvingId === track.videoId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : playingNow ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5 ml-0.5" />
                  )}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(track); }}
                  className="w-8 h-8 rounded-lg bg-white hover:bg-[#38E54D] border border-black flex items-center justify-center text-[#121212] shrink-0 shadow-[1px_1px_0px_#121212]"
                  title="Unduh ke koleksi"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && tracks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-2 px-4 text-center">
          <Music className="w-8 h-8 text-gray-300" />
          <p className="text-sm font-black text-[#121212]">Belum ada konten</p>
          <p className="text-xs font-bold text-gray-500">
            {activeTab === 'library' && 'Library YouTube Music kamu masih kosong.'}
            {activeTab === 'liked' && 'Belum ada lagu yang di-like.'}
            {activeTab === 'recommendations' && 'Belum ada rekomendasi.'}
          </p>
        </div>
      )}
    </div>
  );
}
