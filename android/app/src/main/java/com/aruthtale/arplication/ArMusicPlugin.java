package com.aruthtale.arplication;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Capacitor bridge untuk ArMusicService (ExoPlayer native).
 *
 * Playback control:
 *  - play({ queueJson, index, positionMs, repeatOne }) — queue = JSON array
 *    [{ uri, title, artist, album }]; uri = file:// / content:// / http(s)://
 *  - pause() / resume() / toggle() / next() / prev()
 *  - seek({ positionMs }) | stop() | updateQueue({ queueJson, index, repeatOne })
 *  - show({ title, artist, album, playing }) — legacy meta-only
 *  - dismiss()
 *
 * Event "mediaControl" (extras -> JSObject):
 *  toggle | next | prev | stop | advanced(index,title,artist,album,uri) |
 *  queue-ended | error(message)
 *
 * Web fallback: panggil reject agar JS otomatis pakai <audio> WebView.
 */
@CapacitorPlugin(name = "ArMusic")
public class ArMusicPlugin extends Plugin {
    private BroadcastReceiver controlReceiver;

    @Override
    public void load() {
        controlReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (ArMusicService.CONTROL_BROADCAST.equals(intent.getAction())) {
                    JSObject ret = new JSObject();
                    ret.put("action", intent.getStringExtra("action"));
                    if (intent.hasExtra("index")) ret.put("index", intent.getIntExtra("index", -1));
                    if (intent.hasExtra("title")) ret.put("title", intent.getStringExtra("title"));
                    if (intent.hasExtra("artist")) ret.put("artist", intent.getStringExtra("artist"));
                    if (intent.hasExtra("album")) ret.put("album", intent.getStringExtra("album"));
                    if (intent.hasExtra("uri")) ret.put("uri", intent.getStringExtra("uri"));
                    if (intent.hasExtra("message")) ret.put("message", intent.getStringExtra("message"));
                    notifyListeners("mediaControl", ret);
                }
            }
        };
        IntentFilter f = new IntentFilter(ArMusicService.CONTROL_BROADCAST);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(controlReceiver, f, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(controlReceiver, f);
        }
    }

    private void startSvc(Intent i) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(i);
        } else {
            getContext().startService(i);
        }
    }

    private Intent svcIntent(String action) {
        Intent i = new Intent(getContext(), ArMusicService.class);
        i.setAction(action);
        return i;
    }

    @PluginMethod
    public void play(PluginCall call) {
        String queueJson = call.getString("queueJson", "");
        if (queueJson == null || queueJson.isEmpty()) {
            call.reject("queueJson kosong");
            return;
        }
        // Validasi ringan: minimal 1 item ber-uri.
        try {
            JSONArray arr = new JSONArray(queueJson);
            boolean ok = false;
            for (int k = 0; k < arr.length(); k++) {
                JSONObject o = arr.optJSONObject(k);
                if (o != null && !o.optString("uri", "").isEmpty()) { ok = true; break; }
            }
            if (!ok) { call.reject("queueJson tidak berisi uri valid"); return; }
        } catch (Exception e) {
            call.reject("queueJson bukan JSON array valid");
            return;
        }
        Intent i = svcIntent("PLAY");
        i.putExtra("queueJson", queueJson);
        // CATATAN: jangan pakai call.getInt/getLong — Capacitor mengirim angka JS
        // sebagai Integer/Double via org.json, sehingga getLong() selalu gagal
        // instanceof dan mengembalikan default (seek mental ke 0). optInt/optLong
        // menangani semua tipe Number.
        i.putExtra("index", call.getData().optInt("index", 0));
        i.putExtra("positionMs", call.getData().optLong("positionMs", 0L));
        i.putExtra("repeatOne", Boolean.TRUE.equals(call.getBoolean("repeatOne", false)));
        startSvc(i);
        call.resolve();
    }

    @PluginMethod
    public void updateQueue(PluginCall call) {
        Intent i = svcIntent("UPDATE_QUEUE");
        i.putExtra("queueJson", call.getString("queueJson", ""));
        i.putExtra("index", call.getData().optInt("index", -1));
        i.putExtra("repeatOne", Boolean.TRUE.equals(call.getBoolean("repeatOne", false)));
        startSvc(i);
        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        startSvc(svcIntent("PAUSE"));
        call.resolve();
    }

    @PluginMethod
    public void resume(PluginCall call) {
        startSvc(svcIntent("RESUME"));
        call.resolve();
    }

    @PluginMethod
    public void toggle(PluginCall call) {
        startSvc(svcIntent("TOGGLE"));
        call.resolve();
    }

    @PluginMethod
    public void next(PluginCall call) {
        startSvc(svcIntent("NEXT"));
        call.resolve();
    }

    @PluginMethod
    public void prev(PluginCall call) {
        startSvc(svcIntent("PREV"));
        call.resolve();
    }

    @PluginMethod
    public void seek(PluginCall call) {
        Intent i = svcIntent("SEEK");
        i.putExtra("positionMs", call.getData().optLong("positionMs", 0L));
        startSvc(i);
        call.resolve();
    }

    // ------------------------------------------------------------------ Fase 2: EQ + sleep timer

    private void sendEqSvc(String method, JSONObject payload) {
        ArMusicService svc = ArMusicService.getInstance();
        if (svc == null) return;
        try {
            switch (method) {
                case "enable": svc.setEqEnabled(payload.optBoolean("enabled", false)); break;
                case "band": svc.setEqBandGain(payload.optInt("band", 0), payload.optInt("gainMb", 0)); break;
                case "preset": svc.applyEqPreset(payload.optInt("preset", 0)); break;
                default: break;
            }
        } catch (Exception ignored) {}
    }

    @PluginMethod
    public void getEqualizer(PluginCall call) {
        ArMusicService svc = ArMusicService.getInstance();
        JSObject ret = new JSObject();
        try {
            if (svc != null) {
                org.json.JSONObject info = svc.getEqualizerInfo();
                java.util.Iterator<String> keys = info.keys();
                while (keys.hasNext()) {
                    String k = keys.next();
                    Object v = info.opt(k);
                    if (v instanceof org.json.JSONArray) ret.put(k, (org.json.JSONArray) v);
                    else if (v instanceof org.json.JSONObject) ret.put(k, (org.json.JSONObject) v);
                    else if (v instanceof Integer) ret.put(k, (Integer) v);
                    else if (v instanceof Long) ret.put(k, (Long) v);
                    else if (v instanceof Boolean) ret.put(k, (Boolean) v);
                    else ret.put(k, String.valueOf(v));
                }
            } else {
                // Service belum hidup — kembalikan default agar UI tetap render.
                ret.put("supported", true);
                ret.put("attached", false);
                ret.put("enabled", false);
                ret.put("bandCount", 5);
                ret.put("minGainMb", -1500);
                ret.put("maxGainMb", 1500);
                ret.put("presetCount", 0);
                ret.put("presetIndex", -1);
            }
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("getEqualizer gagal: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setEqualizerEnabled(PluginCall call) {
        try {
            JSONObject p = new JSONObject();
            p.put("enabled", Boolean.TRUE.equals(call.getBoolean("enabled", false)));
            sendEqSvc("enable", p);
            call.resolve();
        } catch (Exception e) {
            call.reject("setEqualizerEnabled gagal: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setEqualizerBand(PluginCall call) {
        try {
            JSONObject p = new JSONObject();
            p.put("band", call.getData().optInt("band", 0));
            p.put("gainMb", call.getData().optInt("gainMb", 0));
            sendEqSvc("band", p);
            call.resolve();
        } catch (Exception e) {
            call.reject("setEqualizerBand gagal: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setEqualizerPreset(PluginCall call) {
        try {
            JSONObject p = new JSONObject();
            p.put("preset", call.getData().optInt("preset", 0));
            sendEqSvc("preset", p);
            call.resolve();
        } catch (Exception e) {
            call.reject("setEqualizerPreset gagal: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setSleepTimer(PluginCall call) {
        int minutes = call.getData().optInt("minutes", 0);
        ArMusicService svc = ArMusicService.getInstance();
        if (svc != null) {
            try {
                if (minutes > 0) svc.setSleepTimerMinutes(minutes);
                else svc.cancelSleepTimer();
                call.resolve();
                return;
            } catch (Exception e) {
                call.reject("setSleepTimer gagal: " + e.getMessage());
                return;
            }
        }
        // Service belum hidup — kirim via Intent agar tetap terjadwal saat start.
        Intent i = svcIntent("SLEEP_TIMER");
        i.putExtra("minutes", minutes);
        startSvc(i);
        call.resolve();
    }

    @PluginMethod
    public void getSleepTimer(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("remainingMs", ArMusicService.getSleepRemainingMs());
        ret.put("totalMin", ArMusicService.sleepTotalMin);
        ret.put("active", ArMusicService.sleepEndsAtMs > 0);
        call.resolve(ret);
    }

    /**
     * Baca posisi/index terakhir dari snapshot service.
     * Posisi diekstrapolasi: snapshot + (now - stamp) bila playing.
     * Aman dipanggil tiap 500-1000ms dari JS untuk sinkron UI.
     */
    @PluginMethod
    public void getState(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("playing", ArMusicService.lastPlaying);
        ret.put("index", ArMusicService.lastIndex);
        ret.put("queueSize", ArMusicService.lastQueueSize);
        ret.put("durationMs", ArMusicService.lastDurationMs);
        long pos = ArMusicService.lastPositionMs;
        if (ArMusicService.lastPlaying && ArMusicService.lastStampMs > 0) {
            long dt = android.os.SystemClock.elapsedRealtime() - ArMusicService.lastStampMs;
            if (dt > 0) pos += dt;
        }
        long dur = ArMusicService.lastDurationMs;
        if (dur > 0 && pos > dur) pos = dur;
        ret.put("positionMs", Math.max(0, pos));
        call.resolve(ret);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            getContext().stopService(svcIntent("STOP"));
        } catch (Exception ignored) {}
        call.resolve();
    }

    @PluginMethod
    public void show(PluginCall call) {
        Intent i = svcIntent("SHOW");
        i.putExtra("title", call.getString("title", "Tanpa Judul"));
        i.putExtra("artist", call.getString("artist", "Artis Tidak Dikenal"));
        i.putExtra("album", call.getString("album", "ArMusic"));
        i.putExtra("playing", Boolean.TRUE.equals(call.getBoolean("playing", true)));
        startSvc(i);
        call.resolve();
    }

    @PluginMethod
    public void update(PluginCall call) {
        // Sama seperti show — service menimpa notif yang ada.
        show(call);
    }

    @PluginMethod
    public void dismiss(PluginCall call) {
        // Stop langsung tanpa onStartCommand — lebih bersih & tanpa risiko
        // IllegalStateException startService saat app di background (API 26+).
        Intent i = new Intent(getContext(), ArMusicService.class);
        getContext().stopService(i);
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        try {
            if (controlReceiver != null) getContext().unregisterReceiver(controlReceiver);
        } catch (Exception ignored) {}
    }
}
