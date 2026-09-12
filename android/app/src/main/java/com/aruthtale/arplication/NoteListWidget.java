// NoteListWidget.java (Android AppWidgetProvider - Scrollable List Variant)

package com.aruthtale.arplication;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class NoteListWidget extends AppWidgetProvider {

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
                AppWidgetManager manager = AppWidgetManager.getInstance(context);
                for (int appWidgetId : appWidgetIds) {
                    updateWidget(context, manager, appWidgetId);
                }
            }
        }
    }

    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.arnote_widget_list);

        // Set RemoteViewsService for the list
        Intent serviceIntent = new Intent(context, NoteWidgetService.class);
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        serviceIntent.setData(android.net.Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_list_view, serviceIntent);

        // Set empty view
        views.setEmptyView(R.id.widget_list_view, R.id.widget_list_empty);

        // Set click for "Add Note" button
        Intent addIntent = new Intent(context, MainActivity.class);
        addIntent.setAction("com.aruthtale.arplication.CREATE_NOTE");
        addIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        android.app.PendingIntent addPendingIntent = android.app.PendingIntent.getActivity(
                context, appWidgetId, addIntent,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_list_add_button, addPendingIntent);

        // Set click template for list items
        Intent clickIntent = new Intent(context, MainActivity.class);
        clickIntent.setAction("com.aruthtale.arplication.OPEN_NOTE");
        clickIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        android.app.PendingIntent clickPendingIntent = android.app.PendingIntent.getActivity(
                context, 0, clickIntent,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
        views.setPendingIntentTemplate(R.id.widget_list_view, clickPendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void refreshAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, NoteListWidget.class);
        int[] widgetIds = manager.getAppWidgetIds(thisWidget);
        if (widgetIds != null && widgetIds.length > 0) {
            manager.notifyAppWidgetViewDataChanged(widgetIds, R.id.widget_list_view);
            Intent intent = new Intent(context, NoteListWidget.class);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds);
            context.sendBroadcast(intent);
        }
    }
}