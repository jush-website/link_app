package com.jush.remember;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ReminderScheduler")
public class ReminderSchedulerPlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        try {
            JSArray tasks = call.getArray("tasks");
            if (tasks == null || tasks.length() > 1000) {
                call.reject("Invalid reminder tasks");
                return;
            }
            ReminderReceiver.update(getContext(), tasks);
            JSObject result = new JSObject();
            result.put("scheduled", tasks.length());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Could not update reminder schedules", error);
        }
    }
}
