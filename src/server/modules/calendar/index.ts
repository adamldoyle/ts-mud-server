export const TIME_ADJUSTMENT = 1657687104448; // Determines epoch
const ACTUAL_SECONDS_PER_MINUTE = 3;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_MONTH = 28;
const MONTHS_PER_YEAR = 10;

const MONTHS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

export enum TimeOfDay {
  LATE_NIGHT = 'LATE_NIGHT',
  EARLY_MORNING = 'EARLY_MORNING',
  MORNING = 'MORNING',
  LATE_MORNING = 'LATE_MORNING',
  EARLY_AFTERNOON = 'EARLY_AFTERNOON',
  AFTERNOON = 'AFTERNOON',
  LATE_AFTERNOON = 'LATE_AFTERNOON',
  EVENING = 'EVENING',
  LATE_EVENING = 'LATE_EVENING',
  NIGHT = 'NIGHT',
}

export const timeOfDayPretty: Record<TimeOfDay, string> = {
  LATE_NIGHT: 'Late night',
  EARLY_MORNING: 'Early morning',
  MORNING: 'Morning',
  LATE_MORNING: 'Late morning',
  EARLY_AFTERNOON: 'Early afternoon',
  AFTERNOON: 'Afternoon',
  LATE_AFTERNOON: 'Late afternoon',
  EVENING: 'Evening',
  LATE_EVENING: 'Late evening',
  NIGHT: 'Night',
};

export const calculateTime = () => {
  const actualSeconds = (Date.now() - TIME_ADJUSTMENT) / 1000;
  const minutes = Math.floor(actualSeconds / ACTUAL_SECONDS_PER_MINUTE);

  const minute = minutes % MINUTES_PER_HOUR;
  let remainder = minutes / MINUTES_PER_HOUR;

  const hour = Math.floor(remainder % HOURS_PER_DAY);
  remainder = remainder / HOURS_PER_DAY;

  const day = Math.floor(remainder % DAYS_PER_MONTH) + 1;
  remainder = remainder / DAYS_PER_MONTH;

  const month = Math.floor(remainder % MONTHS_PER_YEAR) + 1;

  const year = Math.floor(remainder / MONTHS_PER_YEAR);

  let timeOfDay: TimeOfDay;
  if (hour < 4) {
    timeOfDay = TimeOfDay.LATE_NIGHT; // 0 - 4
  } else if (hour < 6) {
    timeOfDay = TimeOfDay.EARLY_MORNING; // 4 - 6
  } else if (hour < 10) {
    timeOfDay = TimeOfDay.MORNING; // 6 - 10
  } else if (hour < 12) {
    timeOfDay = TimeOfDay.LATE_MORNING; // 10 - 12
  } else if (hour < 13) {
    timeOfDay = TimeOfDay.EARLY_AFTERNOON; // 12 - 13
  } else if (hour < 15) {
    timeOfDay = TimeOfDay.AFTERNOON; // 13 - 15
  } else if (hour < 17) {
    timeOfDay = TimeOfDay.LATE_AFTERNOON; // 15 - 17
  } else if (hour < 19) {
    timeOfDay = TimeOfDay.EVENING; // 17 - 19
  } else if (hour < 21) {
    timeOfDay = TimeOfDay.LATE_EVENING; // 19 - 21
  } else {
    timeOfDay = TimeOfDay.NIGHT; // 21 - 24 (0)
  }

  return {
    year: year,
    month: month,
    day: day,
    hour: hour,
    minute: minute,
    timeOfDay: timeOfDay,
    full: `${timeOfDayPretty[timeOfDay]}, day ${day} of the ${MONTHS[month - 1]} month of year ${year.toString().padStart(4, '0')}.\n${year
      .toString()
      .padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute
      .toString()
      .padStart(2, '0')}`,
  };
};
