package com.jush.remember;

import org.junit.Test;
import java.time.ZonedDateTime;
import java.time.ZoneId;
import static org.junit.Assert.assertEquals;

public class ReminderTimeTest {
    private final ZoneId taipei = ZoneId.of("Asia/Taipei");
    private long at(String date) { return ZonedDateTime.parse(date + "+08:00[Asia/Taipei]").toInstant().toEpochMilli(); }

    @Test public void dailyBeforeAndAfterTime() {
        assertEquals(at("2026-10-07T09:00:00"), ReminderTime.nextAfter("2026-10-07", "09:00", 1, at("2026-10-07T08:00:00"), taipei));
        assertEquals(at("2026-10-08T09:00:00"), ReminderTime.nextAfter("2026-10-07", "09:00", 1, at("2026-10-07T10:00:00"), taipei));
    }
    @Test public void customIntervalContinuesAfterDueDate() {
        assertEquals(at("2026-10-16T09:00:00"), ReminderTime.nextAfter("2026-10-07", "09:00", 3, at("2026-10-14T10:00:00"), taipei));
    }
    @Test public void daylightSavingKeepsLocalNineOClock() {
        ZoneId zone = ZoneId.of("America/New_York");
        long now = ZonedDateTime.of(2026, 3, 7, 10, 0, 0, 0, zone).toInstant().toEpochMilli();
        long expected = ZonedDateTime.of(2026, 3, 8, 9, 0, 0, 0, zone).toInstant().toEpochMilli();
        assertEquals(expected, ReminderTime.nextAfter("2026-03-07", "09:00", 1, now, zone));
    }
    @Test(expected = IllegalArgumentException.class) public void rejectsZeroInterval() {
        ReminderTime.nextAfter("2026-10-07", "09:00", 0, 0, taipei);
    }
}
