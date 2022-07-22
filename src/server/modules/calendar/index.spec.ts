import { TIME_ADJUSTMENT, calculateTime, TimeOfDay } from './';

jest.useFakeTimers().setSystemTime(TIME_ADJUSTMENT);

describe('calendar', () => {
  test('returns beginning of time when time is equal to adjustment', () => {
    const output = calculateTime();
    expect(output).toEqual({
      year: 0,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      timeOfDay: 'LATE_NIGHT',
      full: 'Late night, day 1 of the 1st month of year 0000.\n0000-01-01 00:00',
    });
  });

  test('returns time of day based on hours', () => {
    const timesOfDay: TimeOfDay[] = [
      TimeOfDay.LATE_NIGHT,
      TimeOfDay.LATE_NIGHT,
      TimeOfDay.LATE_NIGHT,
      TimeOfDay.LATE_NIGHT,
      TimeOfDay.EARLY_MORNING,
      TimeOfDay.EARLY_MORNING,
      TimeOfDay.MORNING,
      TimeOfDay.MORNING,
      TimeOfDay.MORNING,
      TimeOfDay.MORNING,
      TimeOfDay.LATE_MORNING,
      TimeOfDay.LATE_MORNING,
      TimeOfDay.EARLY_AFTERNOON,
      TimeOfDay.AFTERNOON,
      TimeOfDay.AFTERNOON,
      TimeOfDay.LATE_AFTERNOON,
      TimeOfDay.LATE_AFTERNOON,
      TimeOfDay.EVENING,
      TimeOfDay.EVENING,
      TimeOfDay.LATE_EVENING,
      TimeOfDay.LATE_EVENING,
      TimeOfDay.NIGHT,
      TimeOfDay.NIGHT,
      TimeOfDay.NIGHT,
      TimeOfDay.LATE_NIGHT,
    ];
    timesOfDay.map((timeOfDay, idx) => {
      const output = calculateTime();
      expect(output.hour).toEqual(idx >= 24 ? idx - 24 : idx);
      expect(output.timeOfDay).toEqual(timeOfDay);
      jest.advanceTimersByTime(180000);
    });
  });
});
