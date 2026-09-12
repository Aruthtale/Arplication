package com.aruthtale.arplication;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkInstallerPlugin.class);
        registerPlugin(ArNoteWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
