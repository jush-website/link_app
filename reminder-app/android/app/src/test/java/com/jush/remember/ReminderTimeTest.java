package com.jush.remember;

import org.junit.Test;
import java.time.DayOfWeek;
import java.time.ZonedDateTime;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.Set;
import static org.junit.Assert.assertEquals;

public class ReminderTimeTest {
    private final ZoneId taipei = ZoneId.of("Asia/Taipei");
    private final Set<DayOfWeek> everyDay = EnumSet.allOf(DayOfWeek.class);
    private long at(String date) { return ZonedDateTime.parse(date + "+08:00[Asia/Taipei]").toInstant().toEpochMilli(); }

    @Test public void dailyBeforeAndAfterTime() {
        assertEquals(at("2026-10-07T09:00:00"), ReminderTime.nextAfter("09:00", everyDay, at("2026-10-07T08:00:00"), taipei));
        assertEquals(at("2026-10-08T09:00:00"), ReminderTime.nextAfter("09:00", everyDay, at("2026-10-07T10:00:00"), taipei));
    }
    @Test public void selectedWeekdaysContinueAfterDueDate() {
        Set<DayOfWeek> monWedFri = EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY);
        // 2026-10-07 是週三。
        assertEquals(at("2026-10-07T09:00:00"), ReminderTime.nextAfter("09:00", monWedFri, at("2026-10-07T08:00:00"), taipei));
        assertEquals(at("2026-10-09T09:00:00"), ReminderTime.nextAfter("09:00", monWedFri, at("2026-10-07T10:00:00"), taipei));
        assertEquals(at("2026-10-12T09:00:00"), ReminderTime.nextAfter("09:00", monWedFri, at("2026-10-09T10:00:00"), taipei));
    }
    @Test public void singleWeekdayWrapsToNextWeek() {
        assertEquals(at("2026-10-14T09:00:00"), ReminderTime.nextAfter("09:00", EnumSet.of(DayOfWeek.WEDNESDAY), at("2026-10-07T10:00:00"), taipei));
    }
    @Test public void daylightSavingKeepsLocalNineOClock() {
        ZoneId zone = ZoneId.of("America/New_York");
        long now = ZonedDateTime.of(2026, 3, 7, 10, 0, 0, 0, zone).toInstant().toEpochMilli();
        long expected = ZonedDateTime.of(2026, 3, 8, 9, 0, 0, 0, zone).toInstant().toEpochMilli();
        assertEquals(expected, ReminderTime.nextAfter("09:00", everyDay, now, zone));
    }
    @Test(expected = IllegalArgumentException.class) public void rejectsNoWeekday() {
        ReminderTime.nextAfter("09:00", EnumSet.noneOf(DayOfWeek.class), 0, taipei);
    }
}
