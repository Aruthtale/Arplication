package com.aruthtale.arplication;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;

/**
 * Penyimpanan konfigurasi Ardoro Focus Lock (App Blocker).
 *
 * Disimpan di SharedPreferences agar status blokir bisa dibaca oleh
 * AccessibilityService dan ArdoroTimerService tanpa perlu WebView hidup.
 *
 * - enabled : status runtime (di-toggle otomatis oleh ArdoroTimerService saat fase fokus).
 * - auto    : preferensi user — blokir otomatis selama sesi fokus berjalan.
 * - mode    : "blacklist" (blokir yang dipilih) | "whitelist" (izinkan hanya yang dipilih).
 * - packages: daftar package name aplikasi.
 */
public final class AppBlockerStore {
    private static final String PREFS = "ardoro_blocker";
    private static final String KEY_ENABLED = "enabled";
    private static final String KEY_AUTO = "auto";
    private static final String KEY_MODE = "mode";
    private static final String KEY_PACKAGES = "packages";

    private AppBlockerStore() {}

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static boolean isEnabled(Context ctx) {
        return prefs(ctx).getBoolean(KEY_ENABLED, false);
    }

    public static void setEnabled(Context ctx, boolean enabled) {
        prefs(ctx).edit().putBoolean(KEY_ENABLED, enabled).apply();
    }

    public static boolean isAuto(Context ctx) {
        return prefs(ctx).getBoolean(KEY_AUTO, true);
    }

    public static void setAuto(Context ctx, boolean auto) {
        prefs(ctx).edit().putBoolean(KEY_AUTO, auto).apply();
    }

    public static String getMode(Context ctx) {
        return prefs(ctx).getString(KEY_MODE, "blacklist");
    }

    public static void setMode(Context ctx, String mode) {
        prefs(ctx).edit().putString(KEY_MODE, "whitelist".equals(mode) ? "whitelist" : "blacklist").apply();
    }

    public static JSONArray getPackages(Context ctx) {
        try {
            return new JSONArray(prefs(ctx).getString(KEY_PACKAGES, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    public static void setPackages(Context ctx, JSONArray arr) {
        prefs(ctx).edit().putString(KEY_PACKAGES, arr != null ? arr.toString() : "[]").apply();
    }

    /** True bila package ada di daftar (tanpa mempertimbangkan mode). */
    public static boolean isListed(Context ctx, String pkg) {
        if (pkg == null) return false;
        JSONArray arr = getPackages(ctx);
        for (int i = 0; i < arr.length(); i++) {
            if (pkg.equals(arr.optString(i))) return true;
        }
        return false;
    }

    /**
     * Dipanggil ArdoroTimerService saat timer mulai/berhenti.
     * Blokir hanya aktif selama fase FOKUS, dan hanya bila user mengaktifkan mode otomatis.
     */
    public static void applyForPhase(Context ctx, String phase) {
        if (!isAuto(ctx)) {
            setEnabled(ctx, false);
            return;
        }
        setEnabled(ctx, "focus".equals(phase));
    }
}
