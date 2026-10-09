package com.jush.remember;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Set;

/** Same calendar-day rule as src/model.js; never stop just because the due date passed. */
public final class ReminderTime {
    private ReminderTime() {}

    public static long nextAfter(String timeValue, Set<DayOfWeek> weekdays, long now, ZoneId zone) {
        if (weekdays.isEmpty()) throw new IllegalArgumentException("No reminder weekday selected");
        LocalTime time = LocalTime.parse(timeValue);
        LocalDate today = Instant.ofEpochMilli(now).atZone(zone).toLocalDate();
        for (int offset = 0; offset <= 7; offset++) {
            LocalDate date = today.plusDays(offset);
            long result = date.atTime(time).atZone(zone).toInstant().toEpochMilli();
            if (result > now && weekdays.contains(date.getDayOfWeek())) return result;
        }
        throw new IllegalStateException("No upcoming reminder");
    }
}
