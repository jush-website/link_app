package com.jush.remember;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ReminderSchedulerPlugin.class);
        registerPlugin(LinkGoogleAuthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
