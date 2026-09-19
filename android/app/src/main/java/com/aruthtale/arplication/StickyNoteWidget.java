// StickyNoteWidget.java (Android AppWidgetProvider - Sticky Note Variant)

package com.aruthtale.arplication;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONException;
import org.json.JSONObject;

public class StickyNoteWidget extends AppWidgetProvider {

    private static final String PREFS_NAME = "ArNoteWidgetPrefs";
    private static final String KEY_WIDGET_DATA = "widgetDataJson";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(intent.getAction())) {
            int[] appWidgetIds = intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS);
            if (appWidgetIds != null) {
                for (int appWidgetId : appWidgetIds) {
                    updateWidget(context, AppWidgetManager.getInstance(context), appWidgetId);
                }
            }
        }
    }

    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.arnote_widget_sticky);

        // Load data from SharedPreferences
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String jsonData = prefs.getString(KEY_WIDGET_DATA, null);

        if (jsonData != null) {
            try {
                JSONObject root = new JSONObject(jsonData);
                if (root.has("pinnedNote") && !root.isNull("pinnedNote")) {
                    JSONObject note = root.getJSONObject("pinnedNote");
                    String title = note.optString("title", "Catatan Kosong");
                    String content = note.optString("content", "");
                    String color = note.optString("color", "yellow");

                    // Set title
                    views.setTextViewText(R.id.widget_sticky_title, title);

                    // Set content (truncated)
                    String displayContent = content.length() > 200 ? content.substring(0, 200) + "..." : content;
                    views.setTextViewText(R.id.widget_sticky_content, displayContent);

                    // Set background drawable with border and rounded corners based on note color
                    int bgRes = getBgDrawableRes(color);
                    views.setInt(R.id.widget_sticky_container, "setBackgroundResource", bgRes);

                    // Set click intent to open app to this note
                    Intent clickIntent = new Intent(context, MainActivity.class);
                    clickIntent.setAction("com.aruthtale.arplication.OPEN_NOTE");
                    clickIntent.putExtra("note_id", note.optString("id", ""));
                    clickIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(
                            context, appWidgetId, clickIntent,
                            android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
                    views.setOnClickPendingIntent(R.id.widget_sticky_container, pendingIntent);

                    views.setViewVisibility(R.id.widget_sticky_empty, android.view.View.GONE);
                    views.setViewVisibility(R.id.widget_sticky_content_container, android.view.View.VISIBLE);
                } else {
                    showEmptyState(context, views, appWidgetId);
                }
            } catch (JSONException e) {
                e.printStackTrace();
                showEmptyState(context, views, appWidgetId);
            }
        } else {
            showEmptyState(context, views, appWidgetId);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private void showEmptyState(Context context, RemoteViews views, int appWidgetId) {
        views.setTextViewText(R.id.widget_sticky_title, "ArNote");
        views.setTextViewText(R.id.widget_sticky_content, "Belum ada catatan yang di-pin. Buka aplikasi dan sematkan catatan!");
        views.setInt(R.id.widget_sticky_container, "setBackgroundResource", R.drawable.arnote_sticky_bg_yellow);
        views.setViewVisibility(R.id.widget_sticky_empty, android.view.View.VISIBLE);
        views.setViewVisibility(R.id.widget_sticky_content_container, android.view.View.GONE);

        // Click to open app to ArNote
        Intent clickIntent = new Intent(context, MainActivity.class);
        clickIntent.setAction("com.aruthtale.arplication.OPEN_NOTE");
        clickIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(
                context, appWidgetId, clickIntent,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_sticky_container, pendingIntent);
    }

    private int getBgDrawableRes(String colorName) {
        switch (colorName) {
            case "mint": return R.drawable.arnote_sticky_bg_mint;
            case "pink": return R.drawable.arnote_sticky_bg_pink;
            case "cyan": return R.drawable.arnote_sticky_bg_cyan;
            case "purple": return R.drawable.arnote_sticky_bg_purple;
            case "white": return R.drawable.arnote_sticky_bg_white;
            case "yellow":
            default: return R.drawable.arnote_sticky_bg_yellow;
        }
    }

    public static void refreshAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, StickyNoteWidget.class);
        int[] widgetIds = manager.getAppWidgetIds(thisWidget);
        if (widgetIds != null && widgetIds.length > 0) {
            Intent intent = new Intent(context, StickyNoteWidget.class);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds);
            context.sendBroadcast(intent);
        }
    }
}