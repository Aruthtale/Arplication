package com.aruthtale.arplication;

import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

/**
 * Penyimpanan + penerap mode Jangan Ganggu (DND) untuk Ardoro.
 *
 * Disimpan di SharedPreferences agar ArdoroTimerService bisa menyalakan/
 * mematikan DND tanpa WebView hidup (mis. saat app di-minimize).
 *
 * - auto : preferensi user — nyalakan DND otomatis selama fase FOKUS.
 * - prev : filter DND SEBELUM diubah, supaya bisa dipulihkan persis.
 */
public final class DndStore {
    private static final String PREFS = "ardoro_dnd";
    private static final String KEY_AUTO = "auto";
    private static final String KEY_PREV = "prev_interruption_filter";
    private static final String KEY_CHANGED = "changed_by_app";
    private static final String TAG = "ArdoroDnd";

    private DndStore() {}

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static boolean isAuto(Context ctx) {
        return prefs(ctx).getBoolean(KEY_AUTO, true);
    }

    public static void setAuto(Context ctx, boolean auto) {
        prefs(ctx).edit().putBoolean(KEY_AUTO, auto).apply();
    }

    /** Apakah perangkat mendukung kontrol DND. */
    public static boolean isSupported() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.M;
    }

    /** Apakah izin "Akses Jangan Ganggu" sudah diberikan user. */
    public static boolean isGranted(Context ctx) {
        if (!isSupported()) return false;
        NotificationManager nm = (NotificationManager)
                ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        return nm != null && nm.isNotificationPolicyAccessGranted();
    }

    /**
     * Terapkan DND sesuai fase. Dipanggil ArdoroTimerService saat timer
     * mulai/berhenti: DND menyala selama fase FOKUS (bila auto ON), dan
     * dipulihkan ke kondisi asli saat bukan fokus / selesai.
     */
    public static void applyForPhase(Context ctx, String phase) {
        if (!isAuto(ctx)) {
            restore(ctx);
            Log.i(TAG, "applyForPhase phase=" + phase + " auto=false -> restore");
            return;
        }
        if ("focus".equals(phase)) {
            enable(ctx);
            Log.i(TAG, "applyForPhase phase=focus -> DND ON");
        } else {
            restore(ctx);
            Log.i(TAG, "applyForPhase phase=" + phase + " -> restore");
        }
    }

    /** Pulihkan DND ke kondisi asli user (bila kita yang mengubahnya). */
    public static void restore(Context ctx) {
        if (!isGranted(ctx)) return;
        NotificationManager nm = (NotificationManager)
                ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (!prefs(ctx).getBoolean(KEY_CHANGED, false)) return; // bukan kita yang ubah
        int prev = prefs(ctx).getInt(KEY_PREV, NotificationManager.INTERRUPTION_FILTER_ALL);
        try {
            nm.setInterruptionFilter(prev);
        } catch (Exception e) {
            Log.w(TAG, "restore gagal: " + e.getMessage());
        }
        prefs(ctx).edit().putBoolean(KEY_CHANGED, false).apply();
    }

    /** Nyalakan DND (ingat filter asli lebih dulu). */
    public static void enable(Context ctx) {
        if (!isGranted(ctx)) return;
        NotificationManager nm = (NotificationManager)
                ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        try {
            if (!prefs(ctx).getBoolean(KEY_CHANGED, false)) {
                prefs(ctx).edit()
                        .putInt(KEY_PREV, nm.getCurrentInterruptionFilter())
                        .putBoolean(KEY_CHANGED, true)
                        .apply();
            }
            nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE);
        } catch (Exception e) {
            Log.w(TAG, "enable gagal: " + e.getMessage());
        }
    }

    /** Apakah DND sedang aktif (filter NONE). */
    public static boolean isActive(Context ctx) {
        if (!isGranted(ctx)) return false;
        NotificationManager nm = (NotificationManager)
                ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return false;
        return nm.getCurrentInterruptionFilter() == NotificationManager.INTERRUPTION_FILTER_NONE;
    }
}
