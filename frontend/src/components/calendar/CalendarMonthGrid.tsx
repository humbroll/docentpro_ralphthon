'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { CalendarDayCell } from './CalendarDayCell';
import type { CalendarDay } from '@/types/api';
import dayjs from 'dayjs';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarMonthGridProps {
  month: dayjs.Dayjs;
  weatherData: Map<string, CalendarDay>;
  startDate: dayjs.Dayjs | null;
  endDate: dayjs.Dayjs | null;
  hoveredDate: dayjs.Dayjs | null;
  onDayClick: (date: dayjs.Dayjs) => void;
  onDayHover: (date: dayjs.Dayjs | null) => void;
}

export function CalendarMonthGrid({
  month,
  weatherData,
  startDate,
  endDate,
  hoveredDate,
  onDayClick,
  onDayHover,
}: CalendarMonthGridProps) {
  const firstDay = month.startOf('month');
  const daysInMonth = month.daysInMonth();
  const startDayOfWeek = firstDay.day();
  const today = dayjs().startOf('day');

  const days: (dayjs.Dayjs | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(month.date(i));
  }

  const isInRange = (date: dayjs.Dayjs): boolean => {
    if (!startDate) return false;
    const end = endDate ?? hoveredDate;
    if (!end) return false;
    return date.isAfter(startDate) && date.isBefore(end);
  };

  return (
    <Box>
      <Typography variant="h6" textAlign="center" sx={{ mb: 2 }}>
        {month.format('MMMM YYYY')}
      </Typography>

      <Grid container columns={7} spacing={0.5}>
        {WEEKDAYS.map((day) => (
          <Grid key={day} size={1}>
            <Typography
              variant="caption"
              textAlign="center"
              display="block"
              fontWeight={600}
              color="text.secondary"
            >
              {day}
            </Typography>
          </Grid>
        ))}

        {days.map((date, index) => (
          <Grid key={index} size={1}>
            {date ? (
              <CalendarDayCell
                date={date}
                weather={weatherData.get(date.format('YYYY-MM-DD')) ?? null}
                isInRange={isInRange(date)}
                isStart={!!startDate && date.isSame(startDate, 'day')}
                isEnd={!!endDate && date.isSame(endDate, 'day')}
                isHovered={!!hoveredDate && date.isSame(hoveredDate, 'day')}
                onClick={onDayClick}
                onHover={onDayHover}
                disabled={date.isBefore(today)}
              />
            ) : (
              <Box sx={{ height: 80 }} />
            )}
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
