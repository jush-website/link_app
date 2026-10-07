package com.jush.remember;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

/** Same calendar-day rule as src/model.js; never stop just because the due date passed. */
public final class ReminderTime {
    private ReminderTime() {}

    public static long nextAfter(String anchorValue, String timeValue, int interval, long now, ZoneId zone) {
        if (interval < 1 || interval > 30) throw new IllegalArgumentException("Invalid reminder interval");
        LocalDate anchor = LocalDate.parse(anchorValue);
        LocalTime time = LocalTime.parse(timeValue);
        LocalDate today = Instant.ofEpochMilli(now).atZone(zone).toLocalDate();
        long elapsed = Math.max(0, ChronoUnit.DAYS.between(anchor, today));
        LocalDate next = anchor.plusDays((elapsed / interval) * interval);
        long result = next.atTime(time).atZone(zone).toInstant().toEpochMilli();
        if (result <= now) result = next.plusDays(interval).atTime(time).atZone(zone).toInstant().toEpochMilli();
        return result;
    }
}
