// NoteWidgetService.java (RemoteViewsService for Scrollable List Widget)

package com.aruthtale.arplication;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class NoteWidgetService extends RemoteViewsService {

    private static final String PREFS_NAME = "ArNoteWidgetPrefs";
    private static final String KEY_WIDGET_DATA = "widgetDataJson";

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new NoteWidgetRemoteViewsFactory(this.getApplicationContext(), intent);
    }

    public static class NoteWidgetRemoteViewsFactory implements RemoteViewsService.RemoteViewsFactory {

        private final Context context;
        private final int appWidgetId;
        private JSONArray notes;

        public NoteWidgetRemoteViewsFactory(Context context, Intent intent) {
            this.context = context;
            this.appWidgetId = intent.getIntExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID, android.appwidget.AppWidgetManager.INVALID_APPWIDGET_ID);
            loadNotes();
        }

        private void loadNotes() {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String jsonData = prefs.getString(KEY_WIDGET_DATA, null);

            if (jsonData != null) {
                try {
                    JSONObject root = new JSONObject(jsonData);
                    if (root.has("recentNotes") && !root.isNull("recentNotes")) {
                        this.notes = root.getJSONArray("recentNotes");
                    } else {
                        this.notes = new JSONArray();
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                    this.notes = new JSONArray();
                }
            } else {
                this.notes = new JSONArray();
            }
        }

        @Override
        public void onCreate() {}

        @Override
        public void onDataSetChanged() {
            loadNotes();
        }

        @Override
        public void onDestroy() {}

        @Override
        public int getCount() {
            return notes != null ? notes.length() : 0;
        }

        @Override
        public RemoteViews getViewAt(int position) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.arnote_widget_list_item);

            if (notes != null && position < notes.length()) {
                try {
                    JSONObject note = notes.getJSONObject(position);
                    String title = note.optString("title", "Tanpa Judul");
                    String contentSnippet = note.optString("contentSnippet", "");
                    String color = note.optString("color", "yellow");
                    String noteId = note.optString("id", "");

                    views.setTextViewText(R.id.widget_item_title, title);
                    views.setTextViewText(R.id.widget_item_snippet, contentSnippet);

                    // Set background drawable with border and rounded corners
                    int bgRes = getBgDrawableRes(color);
                    views.setInt(R.id.widget_item_container, "setBackgroundResource", bgRes);

                    // Set fill-in intent for click
                    Intent fillInIntent = new Intent();
                    fillInIntent.putExtra("note_id", noteId);
                    views.setOnClickFillInIntent(R.id.widget_item_container, fillInIntent);

                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }

            return views;
        }

        @Override
        public RemoteViews getLoadingView() {
            return null;
        }

        @Override
        public int getViewTypeCount() {
            return 1;
        }

        @Override
        public long getItemId(int position) {
            return position;
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }

        private int getBgDrawableRes(String colorName) {
            switch (colorName) {
                case "mint": return R.drawable.arnote_item_bg_mint;
                case "pink": return R.drawable.arnote_item_bg_pink;
                case "cyan": return R.drawable.arnote_item_bg_cyan;
                case "purple": return R.drawable.arnote_item_bg_purple;
                case "white": return R.drawable.arnote_item_bg_white;
                case "yellow":
                default: return R.drawable.arnote_item_bg_yellow;
            }
        }
    }
}