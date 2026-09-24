package com.aruthtale.arplication;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.media.AudioManager;
import android.media.audiofx.Equalizer;
import android.os.Handler;
import android.os.Looper;
import android.graphics.BitmapFactory;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;

import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Foreground Service untuk ArMusic — playback native via ExoPlayer (Media3)
 * + notifikasi MediaStyle ala Spotify/Joox.
 *
 * Arsitektur (anti-kill audio 2026-09-15):
 *  - Audio DIMAINKAN ExoPlayer di proses service (bukan <audio> WebView),
 *    sehingga lagu tetap jalan saat app di-background / layar mati / WebView
 *    di-pause sistem. Foreground service type mediaPlayback menaikkan prioritas
 *    proses + PARTIAL_WAKE_LOCK via player.setWakeMode.
 *  - Audio focus (telepon masuk, navigasi, app lain) ditangani otomatis
 *    ExoPlayer (handleAudioFocus=true) — tidak perlu kode manual.
 *  - Queue + repeat-one dipegang native: ExoPlayer auto-advance tiap lagu
 *    selesai; JS hanya mengirim queue sekali per play/shuffle.
 *  - Tombol notifikasi/lockscreen/headset/Bluetooth bekerja langsung di
 *    service (tanpa menunggu JS hidup), lalu hasilnya di-broadcast ke JS
 *    (ARMUSIC_CONTROL -> ArMusicPlugin -> event "mediaControl") agar UI sinkron.
 *  - WebView <audio> hanya dipakai sebagai FALLBACK untuk sumber yang tidak
 *    bisa dimainkan native (mis. blob: hasil file-picker).
 *
 * Protokol command (Intent action):
 *  PLAY(queueJson, index, positionMs, repeatOne) | PAUSE | RESUME | TOGGLE |
 *  NEXT | PREV | SEEK(positionMs) | STOP | DISMISS | UPDATE_QUEUE(queueJson, index, repeatOne)
 *  SHOW(title, artist, album, playing) — legacy, meta-only (kompatibel lama).
 *
 * Event broadcast ARMUSIC_CONTROL (extra "action"):
 *  toggle | next | prev | stop | advanced(index,title,artist,album,uri) |
 *  queue-ended | error(message)
 */
public class ArMusicService extends Service {
    public static final String CHANNEL_ID = "armusic_playback";
    public static final int NOTIFICATION_ID = 2001;
    public static final String CONTROL_BROADCAST = "com.aruthtale.arplication.ARMUSIC_CONTROL";

    private static final long PREV_RESTART_THRESHOLD_MS = 3000;

    private MediaSession mediaSession;
    private ExoPlayer player;

    /**
     * Headset/Bluetooth dicabut saat musik bunyi (ACTION_AUDIO_BECOMING_NOISY):
     * pause otomatis agar audio tidak bocor ke speaker. Receiver didaftar
     * hanya saat playback aktif dan dilepas saat pause/stop/destroy — hemat
     * baterai, tanpa receiver statis di Manifest.
     */
    private BroadcastReceiver becomingNoisyReceiver;
    private boolean noisyReceiverRegistered = false;

    private void setNoisyReceiverRegistered(boolean enable) {
        if (enable && !noisyReceiverRegistered) {
            if (becomingNoisyReceiver == null) {
                becomingNoisyReceiver = new BroadcastReceiver() {
                    @Override public void onReceive(Context context, Intent intent) {
                        if (AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) {
                            doPause(true);
                        }
                    }
                };
            }
            try {
                registerReceiver(becomingNoisyReceiver,
                    new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY));
                noisyReceiverRegistered = true;
            } catch (Exception ignored) {}
        } else if (!enable && noisyReceiverRegistered) {
            try { unregisterReceiver(becomingNoisyReceiver); } catch (Exception ignored) {}
            noisyReceiverRegistered = false;
        }
    }

    /** Queue paralel dengan playlist ExoPlayer (untuk meta + broadcast). */
    private final List<QueueItem> queue = new ArrayList<>();
    private boolean repeatOne = false;

    // ------------------------------------------------------------------ Fase 2: EQ + sleep timer

    private static volatile ArMusicService instance;

    /** EQ 5-band via AudioEffect, terikat ke audioSessionId ExoPlayer. */
    private Equalizer equalizer;
    private int eqSessionId = 0;
    private boolean eqEnabled = false;
    private int eqPresetIndex = -1; // -1 = kurva custom
    private short[] eqCustomGains;

    /** Sleep timer: Handler main-looper + deadline elapsedRealtime (tahan Doze ringan). */
    private Handler sleepHandler;
    private Runnable sleepRunnable;
    public static volatile long sleepEndsAtMs = 0;
    public static volatile int sleepTotalMin = 0;

    // Snapshot terbaca plugin getState() agar JS bisa poll posisi/index.
    // lastStampMs = elapsedRealtime saat snapshot → plugin ekstrapolasi posisi.
    public static volatile boolean lastPlaying = false;
    public static volatile int lastIndex = 0;
    public static volatile int lastQueueSize = 0;
    public static volatile long lastPositionMs = 0;
    public static volatile long lastDurationMs = 0;
    public static volatile long lastStampMs = 0;

    private static void snapshot(boolean playing, int index, int queueSize, long pos, long dur) {
        lastPlaying = playing;
        lastIndex = index;
        lastQueueSize = queueSize;
        lastPositionMs = Math.max(0, pos);
        lastDurationMs = Math.max(0, dur);
        lastStampMs = android.os.SystemClock.elapsedRealtime();
    }

    private void snapshotFromPlayer() {
        if (player == null) return;
        try {
            int idx = player.getCurrentMediaItemIndex();
            long pos = Math.max(0, player.getCurrentPosition());
            long dur = player.getDuration();
            if (dur < 0) dur = 0;
            snapshot(player.isPlaying(), idx < 0 ? 0 : idx, queue.size(), pos, dur);
        } catch (Exception ignored) {}
    }

    private static class QueueItem {
        String uri = "";
        String title = "Tanpa Judul";
        String artist = "Artis Tidak Dikenal";
        String album = "ArMusic";
    }

    // ------------------------------------------------------------------ Fase 2: EQ native

    public static ArMusicService getInstance() { return instance; }

    public boolean isPlayingState() {
        return player != null && player.isPlaying();
    }

    private void restoreEqPrefs() {
        try {
            android.content.SharedPreferences p = getSharedPreferences("armusic_eq", MODE_PRIVATE);
            eqEnabled = p.getBoolean("enabled", false);
            eqPresetIndex = p.getInt("preset", -1);
            String gains = p.getString("gains", "");
            if (gains != null && !gains.isEmpty()) {
                String[] parts = gains.split(",");
                eqCustomGains = new short[parts.length];
                for (int k = 0; k < parts.length; k++) {
                    try { eqCustomGains[k] = Short.parseShort(parts[k].trim()); } catch (Exception ignored) {}
                }
            }
        } catch (Exception ignored) {}
    }

    private void persistEqPrefs() {
        try {
            android.content.SharedPreferences.Editor e = getSharedPreferences("armusic_eq", MODE_PRIVATE).edit();
            e.putBoolean("enabled", eqEnabled);
            e.putInt("preset", eqPresetIndex);
            if (eqCustomGains != null) {
                StringBuilder sb = new StringBuilder();
                for (int k = 0; k < eqCustomGains.length; k++) {
                    if (k > 0) sb.append(',');
                    sb.append(eqCustomGains[k]);
                }
                e.putString("gains", sb.toString());
            }
            e.apply();
        } catch (Exception ignored) {}
    }

    /** Ikat Equalizer ke audioSessionId ExoPlayer (dipanggil saat READY/play). */
    private synchronized boolean ensureEqualizer() {
        if (player == null) return false;
        int sid;
        try { sid = player.getAudioSessionId(); } catch (Exception e) { return false; }
        if (sid == 0 || sid == C.AUDIO_SESSION_ID_UNSET) return false;
        if (equalizer != null && eqSessionId == sid) return true;
        releaseEqualizerLocked();
        try {
            equalizer = new Equalizer(0, sid);
            eqSessionId = sid;
            int bands = 0;
            try { bands = equalizer.getNumberOfBands(); } catch (Exception ignored) {}
            if (bands > 0) {
                if (eqCustomGains == null || eqCustomGains.length != bands) {
                    eqCustomGains = new short[bands];
                    try {
                        for (short b = 0; b < bands; b++) eqCustomGains[b] = equalizer.getBandLevel(b);
                    } catch (Exception ignored) {}
                }
                if (eqPresetIndex >= 0) {
                    try {
                        if (eqPresetIndex < equalizer.getNumberOfPresets()) {
                            equalizer.usePreset((short) eqPresetIndex);
                        } else { eqPresetIndex = -1; }
                    } catch (Exception ignored) { eqPresetIndex = -1; }
                }
                if (eqPresetIndex < 0) {
                    try {
                        short[] range = equalizer.getBandLevelRange();
                        for (short b = 0; b < bands && b < eqCustomGains.length; b++) {
                            short g = eqCustomGains[b];
                            if (g < range[0]) g = range[0];
                            if (g > range[1]) g = range[1];
                            equalizer.setBandLevel(b, g);
                        }
                    } catch (Exception ignored) {}
                }
            }
            try { equalizer.setEnabled(eqEnabled); } catch (Exception ignored) {}
            return true;
        } catch (Exception e) {
            releaseEqualizerLocked();
            return false;
        }
    }

    private void releaseEqualizerLocked() {
        try {
            if (equalizer != null) {
                try { equalizer.setEnabled(false); } catch (Exception ignored) {}
                equalizer.release();
            }
        } catch (Exception ignored) {}
        equalizer = null;
        eqSessionId = 0;
    }

    public synchronized JSONObject getEqualizerInfo() {
        JSONObject o = new JSONObject();
        try {
            boolean attached = ensureEqualizer();
            o.put("supported", true);
            o.put("attached", attached);
            o.put("enabled", eqEnabled);
            o.put("sessionId", eqSessionId);
            if (equalizer != null) {
                int bands = 0;
                try { bands = equalizer.getNumberOfBands(); } catch (Exception ignored) {}
                o.put("bandCount", bands);
                try {
                    short[] range = equalizer.getBandLevelRange();
                    o.put("minGainMb", range[0]);
                    o.put("maxGainMb", range[1]);
                } catch (Exception ignored) { o.put("minGainMb", -1500); o.put("maxGainMb", 1500); }
                JSONArray freqs = new JSONArray();
                JSONArray gains = new JSONArray();
                for (short b = 0; b < bands; b++) {
                    try { freqs.put(equalizer.getCenterFreq(b)); } catch (Exception ignored) { freqs.put(0); }
                    try { gains.put(equalizer.getBandLevel(b)); } catch (Exception ignored) { gains.put(0); }
                }
                o.put("centerFreqs", freqs);
                o.put("gains", gains);
                int presets = 0;
                try { presets = equalizer.getNumberOfPresets(); } catch (Exception ignored) {}
                o.put("presetCount", presets);
                o.put("presetIndex", eqPresetIndex);
                JSONArray names = new JSONArray();
                for (short p = 0; p < presets; p++) {
                    try { names.put(equalizer.getPresetName(p)); } catch (Exception ignored) { names.put("Preset " + p); }
                }
                o.put("presetNames", names);
            } else {
                o.put("bandCount", 5);
                o.put("minGainMb", -1500);
                o.put("maxGainMb", 1500);
                o.put("presetCount", 0);
                o.put("presetIndex", eqPresetIndex);
            }
        } catch (Exception ignored) {}
        return o;
    }

    public synchronized boolean setEqEnabled(boolean enabled) {
        eqEnabled = enabled;
        boolean ok = ensureEqualizer();
        if (equalizer != null) {
            try { equalizer.setEnabled(enabled); } catch (Exception ignored) {}
        }
        persistEqPrefs();
        return ok || !enabled;
    }

    public synchronized boolean setEqBandGain(int band, int gainMb) {
        if (!ensureEqualizer() || equalizer == null) return false;
        try {
            int bands = equalizer.getNumberOfBands();
            if (band < 0 || band >= bands) return false;
            short[] range = equalizer.getBandLevelRange();
            short g = (short) Math.max(range[0], Math.min(range[1], gainMb));
            equalizer.setBandLevel((short) band, g);
            eqPresetIndex = -1;
            if (eqCustomGains == null || eqCustomGains.length != bands) eqCustomGains = new short[bands];
            eqCustomGains[band] = g;
            persistEqPrefs();
            return true;
        } catch (Exception ignored) { return false; }
    }

    public synchronized boolean applyEqPreset(int preset) {
        if (!ensureEqualizer() || equalizer == null) return false;
        try {
            if (preset < 0 || preset >= equalizer.getNumberOfPresets()) return false;
            equalizer.usePreset((short) preset);
            eqPresetIndex = preset;
            int bands = equalizer.getNumberOfBands();
            if (eqCustomGains == null || eqCustomGains.length != bands) eqCustomGains = new short[bands];
            for (short b = 0; b < bands; b++) {
                try { eqCustomGains[b] = equalizer.getBandLevel(b); } catch (Exception ignored) {}
            }
            persistEqPrefs();
            return true;
        } catch (Exception ignored) { return false; }
    }

    // ------------------------------------------------------------------ Fase 2: sleep timer

    public static long getSleepRemainingMs() {
        if (sleepEndsAtMs <= 0) return 0;
        long left = sleepEndsAtMs - android.os.SystemClock.elapsedRealtime();
        return Math.max(0, left);
    }

    public synchronized void setSleepTimerMinutes(int minutes) {
        cancelSleepLocked();
        if (minutes <= 0) return;
        sleepTotalMin = minutes;
        sleepEndsAtMs = android.os.SystemClock.elapsedRealtime() + minutes * 60L * 1000L;
        if (sleepHandler == null) sleepHandler = new Handler(Looper.getMainLooper());
        sleepRunnable = new Runnable() {
            @Override public void run() {
                long left = getSleepRemainingMs();
                if (left <= 0) { onSleepExpired(); return; }
                // Re-check tiap 10 detik — tahan terhadap Doze ringan & jeda eksekusi.
                long next = Math.min(left, 10000L);
                try { sleepHandler.postDelayed(this, next); } catch (Exception ignored) {}
            }
        };
        try { sleepHandler.postDelayed(sleepRunnable, Math.min(minutes * 60L * 1000L, 10000L)); } catch (Exception ignored) {}
    }

    public synchronized void cancelSleepTimer() {
        cancelSleepLocked();
        sleepEndsAtMs = 0;
        sleepTotalMin = 0;
    }

    private void cancelSleepLocked() {
        try {
            if (sleepHandler != null && sleepRunnable != null) sleepHandler.removeCallbacks(sleepRunnable);
        } catch (Exception ignored) {}
        sleepRunnable = null;
    }

    /** Jadwalkan ulang cek periodik dari deadline statik (dipakai onCreate restart). */
    private synchronized void rescheduleSleepLocked() {
        cancelSleepLocked();
        long left = getSleepRemainingMs();
        if (left <= 0) { sleepEndsAtMs = 0; sleepTotalMin = 0; return; }
        if (sleepHandler == null) sleepHandler = new Handler(Looper.getMainLooper());
        sleepRunnable = new Runnable() {
            @Override public void run() {
                long l = getSleepRemainingMs();
                if (l <= 0) { onSleepExpired(); return; }
                try { sleepHandler.postDelayed(this, Math.min(l, 10000L)); } catch (Exception ignored) {}
            }
        };
        try { sleepHandler.postDelayed(sleepRunnable, Math.min(left, 10000L)); } catch (Exception ignored) {}
    }

    private void onSleepExpired() {
        sleepEndsAtMs = 0;
        sleepTotalMin = 0;
        sleepRunnable = null;
        // Fade-out 3 detik lalu pause — halus di telinga, bukan stop mendadak.
        try {
            if (player == null || !player.isPlaying()) {
                doPause(true);
                sendControl("sleep-ended", null);
                return;
            }
            player.setVolume(1.0f);
            final int steps = 10;
            final Handler h = sleepHandler != null ? sleepHandler : new Handler(Looper.getMainLooper());
            for (int k = 1; k <= steps; k++) {
                final int step = k;
                h.postDelayed(() -> {
                    try {
                        if (player == null) return;
                        player.setVolume(Math.max(0f, 1.0f - (step / (float) steps)));
                        if (step == steps) {
                            doPause(true);
                            try { player.setVolume(1.0f); } catch (Exception ignored) {}
                            sendControl("sleep-ended", null);
                        }
                    } catch (Exception ignored) {}
                }, k * 300L);
            }
        } catch (Exception e) {
            try { doPause(true); } catch (Exception ignored) {}
            sendControl("sleep-ended", null);
        }
    }

    // ------------------------------------------------------------------ lifecycle

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();

        AudioAttributes audioAttributes = new AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build();
        player = new ExoPlayer.Builder(this).build();
        player.setAudioAttributes(audioAttributes, /* handleAudioFocus= */ true);
        player.setWakeMode(C.WAKE_MODE_LOCAL);
        player.addListener(playerListener);

        instance = this;
        sleepHandler = new Handler(Looper.getMainLooper());
        restoreEqPrefs();
        // Service restart (kill sistem) saat timer aktif → jadwalkan ulang sisa waktu.
        if (sleepEndsAtMs > 0) rescheduleSleepLocked();

        mediaSession = new MediaSession(this, "ArMusicSession");
        mediaSession.setFlags(
            MediaSession.FLAG_HANDLES_MEDIA_BUTTONS
                | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        mediaSession.setCallback(sessionCallback);
        mediaSession.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            // Restart sistem setelah kill: pertahankan foreground bila masih bunyi.
            if (player != null && player.isPlaying()) {
                refreshForeground(false);
                return START_STICKY;
            }
            stopSelf();
            return START_NOT_STICKY;
        }
        String cmd = intent.getAction();
        if (cmd == null) cmd = intent.getStringExtra("cmd");
        if (cmd == null) cmd = "SHOW";

        switch (cmd) {
            case "PLAY": {
                String queueJson = intent.getStringExtra("queueJson");
                int index = intent.getIntExtra("index", 0);
                long positionMs = intent.getLongExtra("positionMs", 0);
                repeatOne = intent.getBooleanExtra("repeatOne", false);
                doPlay(queueJson, index, positionMs);
                return START_STICKY;
            }
            case "UPDATE_QUEUE": {
                String queueJson = intent.getStringExtra("queueJson");
                int index = intent.getIntExtra("index", 0);
                repeatOne = intent.getBooleanExtra("repeatOne", false);
                doUpdateQueue(queueJson, index);
                return START_STICKY;
            }
            case "PAUSE":
                doPause(true);
                return START_STICKY;
            case "RESUME":
                doResume(true);
                return START_STICKY;
            case "TOGGLE":
                doToggle(true);
                return START_STICKY;
            case "NEXT":
                doNext(true);
                return START_STICKY;
            case "PREV":
                doPrev(true);
                return START_STICKY;
            case "SEEK":
                doSeek(intent.getLongExtra("positionMs", 0));
                return START_STICKY;
            case "SLEEP_TIMER": {
                // Dipakai plugin setSleepTimer — tahan bila service baru start.
                int minutes = intent.getIntExtra("minutes", 0);
                if (minutes > 0) setSleepTimerMinutes(minutes);
                else cancelSleepTimer();
                snapshotFromPlayer();
                return START_STICKY;
            }
            case "STOP":
                doStop(true);
                return START_NOT_STICKY;
            case "DISMISS":
                teardown();
                stopSelf();
                return START_NOT_STICKY;
            case "SHOW":
            default: {
                // Legacy meta-only (kompatibel bridge lama) — tanpa audio.
                String title = intent.getStringExtra("title");
                String artist = intent.getStringExtra("artist");
                String album = intent.getStringExtra("album");
                boolean playing = intent.getBooleanExtra("playing", true);
                if (title == null || title.isEmpty()) title = "Tanpa Judul";
                if (artist == null || artist.isEmpty()) artist = "Artis Tidak Dikenal";
                if (album == null || album.isEmpty()) album = "ArMusic";
                updateSession(title, artist, album, playing, 0);
                startForegroundCompat(buildNotification(title, artist, album, playing));
                return START_STICKY;
            }
        }
    }

    /**
     * User swipe-away dari recent apps: musik TETAP jalan (perilaku standar
     * pemutar musik). Jangan stopSelf di sini — STOP hanya via aksi STOP/DISMISS.
     */
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        if (player != null && player.isPlaying()) {
            refreshForeground(false);
        }
    }

    @Override
    public void onDestroy() {
        teardown();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void teardown() {
        cancelSleepTimer();
        sleepEndsAtMs = 0;
        sleepTotalMin = 0;
        releaseEqualizerLocked();
        instance = null;
        setNoisyReceiverRegistered(false);
        try {
            if (player != null) {
                player.removeListener(playerListener);
                player.stop();
                player.release();
                player = null;
            }
        } catch (Exception ignored) {}
        try {
            stopForeground(true);
        } catch (Exception ignored) {}
        try {
            if (mediaSession != null) {
                mediaSession.setActive(false);
                mediaSession.release();
                mediaSession = null;
            }
        } catch (Exception ignored) {}
        queue.clear();
        ArMusicWidget.updateAllWidgets(this, "", "", "", false);
    }

    // ------------------------------------------------------------------ playback core

    private List<QueueItem> parseQueue(String queueJson) {
        List<QueueItem> out = new ArrayList<>();
        if (queueJson == null || queueJson.isEmpty()) return out;
        try {
            JSONArray arr = new JSONArray(queueJson);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o == null) continue;
                QueueItem q = new QueueItem();
                q.uri = o.optString("uri", "");
                q.title = o.optString("title", "Tanpa Judul");
                q.artist = o.optString("artist", "Artis Tidak Dikenal");
                q.album = o.optString("album", "ArMusic");
                if (!q.uri.isEmpty()) out.add(q);
            }
        } catch (Exception ignored) {}
        return out;
    }

    private void doPlay(String queueJson, int index, long positionMs) {
        if (player == null) return;
        List<QueueItem> items = parseQueue(queueJson);
        if (items.isEmpty()) return;
        queue.clear();
        queue.addAll(items);
        if (index < 0) index = 0;
        if (index >= queue.size()) index = 0;

        List<MediaItem> mediaItems = new ArrayList<>(queue.size());
        for (QueueItem q : queue) {
            mediaItems.add(MediaItem.fromUri(q.uri));
        }
        try {
            // repeat-all sebagai default (perilaku lama WebView: wrap-around);
            // repeat-one hanya bila user menekan tombol ulang.
            player.setRepeatMode(repeatOne ? Player.REPEAT_MODE_ONE : Player.REPEAT_MODE_ALL);
            long startPos = Math.max(0, positionMs);
            player.setMediaItems(mediaItems, index, startPos);
            player.prepare();
            player.setPlayWhenReady(true);
            setNoisyReceiverRegistered(true);
        } catch (Exception e) {
            sendError("Gagal memutar: " + e.getMessage());
            return;
        }
        QueueItem cur = queue.get(index);
        updateSession(cur.title, cur.artist, cur.album, true, startPositionForSession());
        refreshForeground(true);
    }

    /** Ganti queue (shuffle toggle) tanpa mengganggu lagu yang sedang bunyi.
     *  Lagu aktif dicari di queue baru via uri → posisi dipertahankan. */
    private void doUpdateQueue(String queueJson, int index) {
        List<QueueItem> items = parseQueue(queueJson);
        if (items.isEmpty() || player == null) return;
        String activeUri = "";
        try {
            int cur = player.getCurrentMediaItemIndex();
            if (cur >= 0 && cur < queue.size()) activeUri = queue.get(cur).uri;
        } catch (Exception ignored) {}
        queue.clear();
        queue.addAll(items);
        // repeat-all sebagai default (perilaku lama WebView: wrap-around).
        player.setRepeatMode(repeatOne ? Player.REPEAT_MODE_ONE : Player.REPEAT_MODE_ALL);
        try {
            List<MediaItem> mediaItems = new ArrayList<>(queue.size());
            for (QueueItem q : queue) mediaItems.add(MediaItem.fromUri(q.uri));
            boolean wasPlaying = player.isPlaying();
            long pos = player.getCurrentPosition();
            int target = -1;
            if (!activeUri.isEmpty()) {
                for (int k = 0; k < queue.size(); k++) {
                    if (activeUri.equals(queue.get(k).uri)) { target = k; break; }
                }
            }
            long startPos = 0;
            if (target >= 0) {
                startPos = Math.max(0, pos); // lagu sama → lanjut dari posisi
            } else {
                target = (index >= 0 && index < queue.size()) ? index : 0; // lagu beda → dari awal
            }
            player.setMediaItems(mediaItems, target, startPos);
            player.prepare();
            player.setPlayWhenReady(wasPlaying);
        } catch (Exception e) {
            sendError("Gagal memperbarui antrean: " + e.getMessage());
        }
    }

    void doPause(boolean broadcast) {
        if (player == null) return;
        player.setPlayWhenReady(false);
        setNoisyReceiverRegistered(false);
        syncNotifAndSession();
        if (broadcast) sendControl("toggle", null);
    }

    void doResume(boolean broadcast) {
        if (player == null) return;
        if (player.getPlaybackState() == Player.STATE_IDLE) return;
        player.setPlayWhenReady(true);
        setNoisyReceiverRegistered(true);
        syncNotifAndSession();
        if (broadcast) sendControl("toggle", null);
    }

    void doToggle(boolean broadcast) {
        if (player == null) return;
        if (player.isPlaying()) doPause(broadcast);
        else doResume(broadcast);
    }

    void doNext(boolean broadcast) {
        if (player == null || queue.isEmpty()) return;
        int cur = player.getCurrentMediaItemIndex();
        // Konsisten dengan REPEAT_MODE_ALL: ujung antrean wrap ke awal.
        int next = (cur < 0 || cur + 1 >= queue.size()) ? 0 : cur + 1;
        try {
            player.seekTo(next, 0);
            player.setPlayWhenReady(true);
        } catch (Exception e) {
            sendError("Gagal lagu berikutnya: " + e.getMessage());
            return;
        }
        syncNotifAndSession();
        if (broadcast) sendControl("next", metaOf(next));
    }

    void doPrev(boolean broadcast) {
        if (player == null || queue.isEmpty()) return;
        int cur = player.getCurrentMediaItemIndex();
        try {
            if (player.getCurrentPosition() > PREV_RESTART_THRESHOLD_MS || cur <= 0) {
                player.seekTo(cur < 0 ? 0 : cur, 0);
                player.setPlayWhenReady(true);
            } else {
                player.seekTo(cur - 1, 0);
                player.setPlayWhenReady(true);
            }
        } catch (Exception e) {
            sendError("Gagal lagu sebelumnya: " + e.getMessage());
            return;
        }
        syncNotifAndSession();
        if (broadcast) sendControl("prev", metaOf(player.getCurrentMediaItemIndex()));
    }

    private void doSeek(long positionMs) {
        if (player == null) return;
        try {
            player.seekTo(Math.max(0, positionMs));
            syncSessionOnly();
        } catch (Exception ignored) {}
    }

    private void doStop(boolean broadcast) {
        try {
            if (player != null) {
                player.setPlayWhenReady(false);
                player.stop();
                player.clearMediaItems();
            }
        } catch (Exception ignored) {}
        queue.clear();
        ArMusicWidget.updateAllWidgets(this, "", "", "", false);
        setNoisyReceiverRegistered(false);
        try {
            stopForeground(true);
        } catch (Exception ignored) {}
        try {
            if (mediaSession != null) {
                mediaSession.setPlaybackState(new PlaybackState.Builder()
                    .setActions(0).setState(PlaybackState.STATE_STOPPED, 0, 1.0f).build());
            }
        } catch (Exception ignored) {}
        stopSelf();
        if (broadcast) sendControl("stop", null);
    }

    // ------------------------------------------------------------------ listeners

    private final Player.Listener playerListener = new Player.Listener() {
        @Override
        public void onPlaybackStateChanged(int state) {
            if (player == null) return;
            if (state == Player.STATE_ENDED) {
                // Terjadi bila queue habis (repeat-one off & item terakhir selesai).
                syncNotifAndSession();
                sendQueueEnded();
            } else if (state == Player.STATE_READY) {
                syncNotifAndSession();
                // Audio session kini valid → ikat ulang EQ agar efek tetap menempel
                // tiap ganti output / resume setelah idle.
                try { ensureEqualizer(); } catch (Exception ignored) {}
            }
        }

        @Override
        public void onIsPlayingChanged(boolean isPlaying) {
            syncNotifAndSession();
        }

        @Override
        public void onMediaItemTransition(MediaItem mediaItem, @Player.MediaItemTransitionReason int reason) {
            if (player == null) return;
            int idx = player.getCurrentMediaItemIndex();
            syncNotifAndSession();
            if (reason == Player.MEDIA_ITEM_TRANSITION_REASON_AUTO) {
                // Auto-advance native (layar mati / WebView mati pun jalan).
                sendControl("advanced", metaOf(idx));
            }
        }

        @Override
        public void onPlayerError(PlaybackException error) {
            String msg = error != null ? String.valueOf(error.getMessage()) : "Playback error";
            syncNotifAndSession();
            sendError(msg);
        }
    };

    private final MediaSession.Callback sessionCallback = new MediaSession.Callback() {
        @Override public void onPlay() { doResume(true); setNoisyReceiverRegistered(true); }
        @Override public void onPause() { doPause(true); setNoisyReceiverRegistered(false); }
        @Override public void onSkipToNext() { doNext(true); }
        @Override public void onSkipToPrevious() { doPrev(true); }
        @Override public void onStop() { doStop(true); }
        @Override public void onSeekTo(long pos) { doSeek(pos); }
    };

    // ------------------------------------------------------------------ notif & session sync

    private QueueItem currentMeta() {
        if (player == null || queue.isEmpty()) return new QueueItem();
        int idx = player.getCurrentMediaItemIndex();
        if (idx < 0 || idx >= queue.size()) return new QueueItem();
        return queue.get(idx);
    }

    private Intent metaOf(int idx) {
        Intent b = new Intent();
        if (idx >= 0 && idx < queue.size()) {
            QueueItem q = queue.get(idx);
            b.putExtra("index", idx);
            b.putExtra("title", q.title);
            b.putExtra("artist", q.artist);
            b.putExtra("album", q.album);
            b.putExtra("uri", q.uri);
        } else {
            b.putExtra("index", idx);
        }
        return b;
    }

    private void syncNotifAndSession() {
        if (player == null) return;
        QueueItem q = currentMeta();
        boolean playing = player.isPlaying();
        updateSession(q.title, q.artist, q.album, playing, startPositionForSession());
        startForegroundCompat(buildNotification(q.title, q.artist, q.album, playing));
        snapshotFromPlayer();
        ArMusicWidget.updateAllWidgets(this, q.title, q.artist, q.album, playing);
    }

    private void syncSessionOnly() {
        if (player == null) return;
        QueueItem q = currentMeta();
        updateSession(q.title, q.artist, q.album, player.isPlaying(), startPositionForSession());
        snapshotFromPlayer();
    }

    private long startPositionForSession() {
        try {
            if (player != null && player.getDuration() > 0) return Math.max(0, player.getCurrentPosition());
        } catch (Exception ignored) {}
        return 0;
    }

    /** Naikkan/tahan foreground tanpa mengubah isi notif (dipakai onTaskRemoved/restart). */
    private void refreshForeground(boolean ignored) {
        syncNotifAndSession();
    }

    private void updateSession(String title, String artist, String album, boolean playing, long positionMs) {
        if (mediaSession == null) return;
        try {
            long dur = 0;
            if (player != null) {
                dur = player.getDuration();
                if (dur < 0) dur = 0;
            }
            MediaMetadata.Builder metaBuilder = new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, title)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, artist)
                .putString(MediaMetadata.METADATA_KEY_ALBUM, album)
                .putString(MediaMetadata.METADATA_KEY_DISPLAY_TITLE, title);
            if (dur > 0) {
                metaBuilder.putLong(MediaMetadata.METADATA_KEY_DURATION, dur);
            }
            mediaSession.setMetadata(metaBuilder.build());

            long actions = PlaybackState.ACTION_PLAY
                | PlaybackState.ACTION_PAUSE
                | PlaybackState.ACTION_PLAY_PAUSE
                | PlaybackState.ACTION_SKIP_TO_NEXT
                | PlaybackState.ACTION_SKIP_TO_PREVIOUS
                | PlaybackState.ACTION_STOP
                | PlaybackState.ACTION_SEEK_TO;
            PlaybackState state = new PlaybackState.Builder()
                .setActions(actions)
                .setState(playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                    Math.max(0, positionMs), 1.0f)
                .build();
            mediaSession.setPlaybackState(state);
        } catch (Exception ignored) {}
    }

    private void startForegroundCompat(Notification notif) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notif,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notif);
            }
        } catch (Exception ignored) {}
    }

    // ------------------------------------------------------------------ broadcast ke JS

    private void sendControl(String action, Intent meta) {
        try {
            Intent b = new Intent(CONTROL_BROADCAST);
            b.putExtra("action", action);
            if (meta != null && meta.getExtras() != null) b.putExtras(meta.getExtras());
            sendBroadcast(b);
        } catch (Exception ignored) {}
    }

    private void sendError(String message) {
        try {
            Intent b = new Intent(CONTROL_BROADCAST);
            b.putExtra("action", "error");
            b.putExtra("message", String.valueOf(message));
            sendBroadcast(b);
        } catch (Exception ignored) {}
    }

    private void sendQueueEnded() {
        sendControl("queue-ended", null);
    }

    // ------------------------------------------------------------------ notifikasi

    private Notification buildNotification(String title, String artist, String album, boolean playing) {
        Intent openApp = new Intent(this, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPi = PendingIntent.getActivity(
            this, 0, openApp, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            b = new Notification.Builder(this, CHANNEL_ID);
        } else {
            //noinspection deprecation
            b = new Notification.Builder(this);
        }

        b.setSmallIcon(R.drawable.ic_stat_music)
            .setContentTitle(title)
            .setContentText(artist + " • " + album)
            .setSubText("ArMusic")
            .setLargeIcon(BitmapFactory.decodeResource(getResources(), R.drawable.armusic_cover))
            .setColor(0xFF7C3AED)
            .setColorized(true)
            .setContentIntent(contentPi)
            .setDeleteIntent(deleteIntent())
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(playing)
            .setShowWhen(false)
            .addAction(actionFor("PREV", 11, "Prev", android.R.drawable.ic_media_previous))
            .addAction(actionFor("TOGGLE", 12,
                playing ? "Pause" : "Play",
                playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play))
            .addAction(actionFor("NEXT", 13, "Next", android.R.drawable.ic_media_next))
            .setStyle(new Notification.MediaStyle()
                .setMediaSession(mediaSession != null ? mediaSession.getSessionToken() : null)
                .setShowActionsInCompactView(0, 1, 2));

        if (player != null && player.getDuration() > 0) {
            int totalSec = (int) (player.getDuration() / 1000);
            int currentSec = (int) (Math.max(0, player.getCurrentPosition()) / 1000);
            if (totalSec > 0) {
                b.setProgress(totalSec, Math.min(currentSec, totalSec), false);
            }
        }

        return b.build();
    }

    private Notification.Action actionFor(String cmd, int reqCode, String label, int iconRes) {
        Intent i = new Intent(this, ArMusicService.class);
        i.setAction(cmd);
        PendingIntent pi = PendingIntent.getService(
            this, reqCode, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Action.Builder(iconRes, label, pi).build();
    }

    /** Geser-hilangkan notif saat pause = stop playback (sinkron ke JS via broadcast). */
    private PendingIntent deleteIntent() {
        Intent i = new Intent(this, ArMusicService.class);
        i.setAction("STOP");
        return PendingIntent.getService(
            this, 14, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "ArMusic Sedang Diputar", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Kontrol pemutaran musik ArMusic di notifikasi & lockscreen");
            ch.setShowBadge(false);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            NotificationManager mgr = getSystemService(NotificationManager.class);
            if (mgr != null) mgr.createNotificationChannel(ch);
        }
    }
}
