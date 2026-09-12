// ArNoteWidgetPlugin.java (Capacitor Plugin untuk Sinkronisasi Notes ke Android Widget)

package com.aruthtale.arplication;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ArNoteWidgetPlugin")
public class ArNoteWidgetPlugin extends Plugin {
    private static final String PREFS_NAME = "ArNoteWidgetPrefs";
    private static final String KEY_WIDGET_DATA = "widgetDataJson";

    @PluginMethod
    public void syncWidgetData(PluginCall call) {
        try {
            String jsonString = call.getString("jsonPayload");
            if (jsonString == null || jsonString.isEmpty()) {
                call.reject("Missing jsonPayload");
                return;
            }

            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString(KEY_WIDGET_DATA, jsonString);
            editor.apply();

            StickyNoteWidget.refreshAllWidgets(context);
            NoteListWidget.refreshAllWidgets(context);

            Log.i("ArNoteWidgetPlugin", "Widget data synced successfully and widgets refreshed");
            call.resolve();
        } catch (Exception e) {
            Log.e("ArNoteWidgetPlugin", "Error syncing widget data", e);
            call.reject("Failed to sync widget data: " + e.getMessage());
        }
    }

    public static String getWidgetDataFromPrefs(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_WIDGET_DATA, null);
    }
}
