package com.aruthtale.arplication;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.widget.RemoteViews;

/**
 * AppWidgetProvider untuk homescreen widget ArMusic.
 * Gaya visual: Neobrutalisme (border tegas 2dp #121212, sudut rounded, palet warna kontras).
 * Fitur: Info lagu yang sedang diputar, tombol putar/jeda, lagu berikutnya, lagu sebelumnya,
 * dan deep link membuka tab ArMusic di MainActivity.
 */
public class ArMusicWidget extends AppWidgetProvider {

    public static final String ACTION_WIDGET_PLAY_PAUSE = "com.aruthtale.arplication.ACTION_WIDGET_PLAY_PAUSE";
    public static final String ACTION_WIDGET_NEXT = "com.aruthtale.arplication.ACTION_WIDGET_NEXT";
    public static final String ACTION_WIDGET_PREV = "com.aruthtale.arplication.ACTION_WIDGET_PREV";
    public static final String ACTION_OPEN_ARMUSIC = "com.aruthtale.arplication.OPEN_ARMUSIC";

    public static final String PREFS_NAME = "ArMusicWidgetPrefs";
    public static final String KEY_TITLE = "title";
    public static final String KEY_ARTIST = "artist";
    public static final String KEY_ALBUM = "album";
    public static final String KEY_IS_PLAYING = "is_playing";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null) return;

        String action = intent.getAction();
        if (action == null) return;

        ArMusicService service = ArMusicService.getInstance();

        if (ACTION_WIDGET_PLAY_PAUSE.equals(action)) {
            if (service != null) {
                service.doToggle(true);
            } else {
                // Jika service belum aktif, buka ArMusic di MainActivity
                Intent openApp = new Intent(context, MainActivity.class);
                openApp.setAction(ACTION_OPEN_ARMUSIC);
                openApp.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                context.startActivity(openApp);
            }
        } else if (ACTION_WIDGET_NEXT.equals(action)) {
            if (service != null) {
                service.doNext(true);
            }
        } else if (ACTION_WIDGET_PREV.equals(action)) {
            if (service != null) {
                service.doPrev(true);
            }
        } else if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(action)) {
            int[] appWidgetIds = intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS);
            if (appWidgetIds != null) {
                AppWidgetManager manager = AppWidgetManager.getInstance(context);
                for (int appWidgetId : appWidgetIds) {
                    updateWidget(context, manager, appWidgetId);
                }
            }
        }
    }

    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.armusic_widget);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String title = prefs.getString(KEY_TITLE, "");
        String artist = prefs.getString(KEY_ARTIST, "");
        String album = prefs.getString(KEY_ALBUM, "");
        boolean isPlaying = prefs.getBoolean(KEY_IS_PLAYING, false);

        // Jika service aktif, sinkronkan nilai aktual
        ArMusicService service = ArMusicService.getInstance();
        if (service != null) {
            isPlaying = service.isPlayingState();
        }

        boolean hasTrack = title != null && !title.trim().isEmpty();

        // Teks Judul dan Artis
        if (hasTrack) {
            views.setTextViewText(R.id.widget_armusic_title, title);
            String subtitle = artist != null && !artist.trim().isEmpty() ? artist : "Artis Tidak Dikenal";
            if (album != null && !album.trim().isEmpty() && !album.equals("ArMusic")) {
                subtitle += " • " + album;
            }
            views.setTextViewText(R.id.widget_armusic_artist, subtitle);
            views.setTextViewText(R.id.widget_armusic_status, isPlaying ? "MEMUTAR" : "JEDA");
        } else {
            views.setTextViewText(R.id.widget_armusic_title, "ArMusic");
            views.setTextViewText(R.id.widget_armusic_artist, "Ketuk untuk memutar musik");
            views.setTextViewText(R.id.widget_armusic_status, "OFFLINE");
        }

        // Ikon Play/Pause
        views.setImageViewResource(
            R.id.widget_armusic_play_pause,
            isPlaying ? R.drawable.ic_widget_pause : R.drawable.ic_widget_play
        );

        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;

        // PendingIntent untuk Tombol Play/Pause
        Intent playPauseIntent = new Intent(context, ArMusicWidget.class);
        playPauseIntent.setAction(ACTION_WIDGET_PLAY_PAUSE);
        PendingIntent playPausePi = PendingIntent.getBroadcast(context, appWidgetId * 10 + 1, playPauseIntent, flags);
        views.setOnClickPendingIntent(R.id.widget_armusic_play_pause, playPausePi);

        // PendingIntent untuk Tombol Next
        Intent nextIntent = new Intent(context, ArMusicWidget.class);
        nextIntent.setAction(ACTION_WIDGET_NEXT);
        PendingIntent nextPi = PendingIntent.getBroadcast(context, appWidgetId * 10 + 2, nextIntent, flags);
        views.setOnClickPendingIntent(R.id.widget_armusic_next, nextPi);

        // PendingIntent untuk Tombol Prev
        Intent prevIntent = new Intent(context, ArMusicWidget.class);
        prevIntent.setAction(ACTION_WIDGET_PREV);
        PendingIntent prevPi = PendingIntent.getBroadcast(context, appWidgetId * 10 + 3, prevIntent, flags);
        views.setOnClickPendingIntent(R.id.widget_armusic_prev, prevPi);

        // PendingIntent klik bodi / info lagu -> buka MainActivity ke tab ArMusic
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setAction(ACTION_OPEN_ARMUSIC);
        openAppIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openAppPi = PendingIntent.getActivity(context, appWidgetId * 10 + 4, openAppIntent, flags);
        views.setOnClickPendingIntent(R.id.widget_armusic_root, openAppPi);
        views.setOnClickPendingIntent(R.id.widget_armusic_info_container, openAppPi);
        views.setOnClickPendingIntent(R.id.widget_armusic_cover, openAppPi);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    /**
     * Memperbarui seluruh widget ArMusic di layar utama dengan data lagu dan status pemutaran terbaru.
     */
    public static void updateAllWidgets(Context context, String title, String artist, String album, boolean isPlaying) {
        if (context == null) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                .putString(KEY_TITLE, title != null ? title : "")
                .putString(KEY_ARTIST, artist != null ? artist : "")
                .putString(KEY_ALBUM, album != null ? album : "")
                .putBoolean(KEY_IS_PLAYING, isPlaying)
                .apply();

            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName component = new ComponentName(context, ArMusicWidget.class);
            int[] ids = manager.getAppWidgetIds(component);
            if (ids != null && ids.length > 0) {
                Intent updateIntent = new Intent(context, ArMusicWidget.class);
                updateIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
                context.sendBroadcast(updateIntent);
            }
        } catch (Exception ignored) {}
    }
}
