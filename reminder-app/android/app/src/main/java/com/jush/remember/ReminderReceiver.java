package com.jush.remember;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;

/** One alarm for the next batch, persisted across app closure and reboot. */
public class ReminderReceiver extends BroadcastReceiver {
    private static final String ALARM = "com.jush.remember.REMIND";
    private static final String CHANNEL = "remember-tasks";
    private static final Object LOCK = new Object();

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences("remember-schedules", Context.MODE_PRIVATE);
    }

    private static JSONArray read(Context context) throws JSONException {
        return new JSONArray(preferences(context).getString("tasks", "[]"));
    }

    private static void save(Context context, JSONArray tasks) {
        if (!preferences(context).edit().putString("tasks", tasks.toString()).commit()) {
            throw new IllegalStateException("Could not persist reminder schedules");
        }
    }

    private static long nextTime(JSONObject task, long now) throws JSONException {
        return ReminderTime.nextAfter(task.getString("anchorDate"), task.getString("reminderTime"), task.getInt("intervalDays"), now, ZoneId.systemDefault());
    }

    private static boolean unchanged(JSONObject first, JSONObject second) {
        for (String key : new String[] {"title", "dueDate", "anchorDate", "reminderTime", "intervalDays"}) {
            if (!first.optString(key).equals(second.optString(key))) return false;
        }
        return true;
    }

    public static void update(Context context, JSONArray incoming) throws JSONException {
        synchronized (LOCK) {
            Map<String, JSONObject> old = new HashMap<>();
            JSONArray retained = read(context);
            for (int index = 0; index < retained.length(); index++) {
                JSONObject entry = retained.getJSONObject(index);
                old.put(entry.getString("id"), entry);
            }
            JSONArray tasks = new JSONArray();
            long now = System.currentTimeMillis();
            for (int index = 0; index < incoming.length(); index++) {
                JSONObject task = new JSONObject(incoming.getJSONObject(index).toString());
                if (task.optBoolean("completed") || task.optBoolean("deleted")) continue;
                if (task.getString("title").trim().isEmpty() || task.getString("title").length() > 200) throw new JSONException("Invalid title");
                long computed = nextTime(task, now);
                JSONObject previous = old.get(task.getString("id"));
                task.put("nextAt", previous != null && unchanged(task, previous) ? previous.optLong("nextAt", computed) : computed);
                tasks.put(task);
            }
            save(context, tasks);
            scheduleNext(context, tasks);
        }
    }

    private static PendingIntent alarmIntent(Context context) {
        Intent intent = new Intent(context, ReminderReceiver.class).setAction(ALARM);
        return PendingIntent.getBroadcast(context, 1420, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void scheduleNext(Context context, JSONArray tasks) throws JSONException {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent intent = alarmIntent(context);
        manager.cancel(intent);
        if (tasks.length() == 0) return;
        long earliest = Long.MAX_VALUE;
        for (int index = 0; index < tasks.length(); index++) earliest = Math.min(earliest, tasks.getJSONObject(index).getLong("nextAt"));
        long at = Math.max(earliest, System.currentTimeMillis() + 1000);
        if (Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms()) manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent);
        else manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent);
    }

    private static void show(Context context, JSONObject task) throws JSONException {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(new NotificationChannel(CHANNEL, "每日待辦提醒", NotificationManager.IMPORTANCE_DEFAULT));
        Intent launch = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int id = task.getString("id").hashCode() & Integer.MAX_VALUE;
        PendingIntent open = PendingIntent.getActivity(context, id, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String due = task.optString("dueDate");
        String body = (due.isEmpty() ? "" : "到期日 " + due + "。") + "完成後請在清單勾選，之後就不再提醒。";
        manager.notify(id, new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_reminder).setColor(Color.rgb(53, 94, 76))
            .setContentTitle("記得 · " + task.getString("title")).setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(open).setAutoCancel(true).build());
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        synchronized (LOCK) {
            try {
                JSONArray tasks = read(context);
                long now = System.currentTimeMillis();
                boolean rebase = Intent.ACTION_TIMEZONE_CHANGED.equals(intent.getAction()) || Intent.ACTION_TIME_CHANGED.equals(intent.getAction());
                for (int index = 0; index < tasks.length(); index++) {
                    JSONObject task = tasks.getJSONObject(index);
                    if (rebase) task.put("nextAt", nextTime(task, now));
                    else if (ALARM.equals(intent.getAction()) && task.getLong("nextAt") <= now + 1000) {
                        // 一次處理同一時間的所有事項；錯過多天只補一次。
                        task.put("nextAt", nextTime(task, now));
                        show(context, task);
                    }
                }
                save(context, tasks);
                scheduleNext(context, tasks);
            } catch (Exception error) {
                Log.e("Remember", "Could not restore or deliver reminder", error);
            }
        }
    }
}
