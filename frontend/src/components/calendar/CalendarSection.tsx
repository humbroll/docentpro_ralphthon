'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { CalendarMonthGrid } from './CalendarMonthGrid';
import { InlineError } from '../shared/InlineError';
import { getCalendarWeather, extractApiError } from '@/lib/api';
import type { CalendarDay } from '@/types/api';
import type { SelectedDestination, DateRange, CalendarWeatherState } from '@/types/frontend';
import { WEATHER_LABEL_COLORS } from '@/types/constants';
import dayjs from 'dayjs';

interface CalendarSectionProps {
  destination: SelectedDestination;
  onDateRangeConfirm: (dateRange: DateRange) => void;
  confirmedDateRange: DateRange | null;
}

export function CalendarSection({
  destination,
  onDateRangeConfirm,
  confirmedDateRange,
}: CalendarSectionProps) {
  const [viewMonth, setViewMonth] = useState<dayjs.Dayjs>(() => dayjs().startOf('month'));
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [hoveredDate, setHoveredDate] = useState<dayjs.Dayjs | null>(null);
  const [calendarWeather, setCalendarWeather] = useState<CalendarWeatherState>({
    state: 'idle',
    data: null,
    error: null,
  });

  const fetchCalendarWeather = useCallback(async () => {
    const start = viewMonth.format('YYYY-MM-DD');
    const end = viewMonth.add(2, 'month').subtract(1, 'day').format('YYYY-MM-DD');

    setCalendarWeather({ state: 'loading', data: null, error: null });
    try {
      const response = await getCalendarWeather({
        destination: destination.name,
        latitude: destination.latitude,
        longitude: destination.longitude,
        start_date: start,
        end_date: end,
      });
      setCalendarWeather({ state: 'success', data: response.days, error: null });
    } catch (err) {
      const apiErr = extractApiError(err);
      setCalendarWeather({ state: 'error', data: null, error: apiErr.message });
    }
  }, [destination, viewMonth]);

  useEffect(() => {
    fetchCalendarWeather();
  }, [fetchCalendarWeather]);

  const weatherMap = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    if (calendarWeather.data) {
      for (const day of calendarWeather.data) {
        map.set(day.date, day);
      }
    }
    return map;
  }, [calendarWeather.data]);

  const handleDayClick = (date: dayjs.Dayjs) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
    } else if (date.isAfter(startDate)) {
      setEndDate(date);
    } else {
      setStartDate(date);
      setEndDate(null);
    }
  };

  const handleConfirm = () => {
    if (startDate && endDate) {
      onDateRangeConfirm({
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
      });
    }
  };

  const nights = startDate && endDate ? endDate.diff(startDate, 'day') : 0;
  const rightMonth = viewMonth.add(1, 'month');

  return (
    <Box sx={{ mb: 6 }}>
      <Typography variant="h5" component="h2" fontWeight={600} gutterBottom>
        Select Your Travel Dates
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Click a start date, then an end date. Weather data is based on last year&apos;s historical records.
      </Typography>

      <Paper elevation={2} sx={{ p: 4 }}>
        {/* Month Navigation */}
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={2}>
          <IconButton onClick={() => setViewMonth((m) => m.subtract(1, 'month'))}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6">
            {viewMonth.format('MMM YYYY')} &mdash; {rightMonth.format('MMM YYYY')}
          </Typography>
          <IconButton onClick={() => setViewMonth((m) => m.add(1, 'month'))}>
            <ChevronRightIcon />
          </IconButton>
        </Stack>

        {/* Weather Legend */}
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2, mb: 2 }}>
          {Object.entries(WEATHER_LABEL_COLORS).map(([label, color]) => (
            <Stack key={label} direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 12, height: 12, borderRadius: '2px', backgroundColor: color }} />
              <Typography variant="caption">{label}</Typography>
            </Stack>
          ))}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 12, height: 12, borderRadius: '2px', border: 1, borderColor: 'divider' }} />
            <Typography variant="caption">No data</Typography>
          </Stack>
        </Stack>

        {/* Calendar Grids */}
        {calendarWeather.state === 'loading' ? (
          <Stack spacing={2} sx={{ mt: 3 }}>
            <Skeleton variant="rectangular" height={300} />
          </Stack>
        ) : calendarWeather.state === 'error' ? (
          <Box sx={{ mt: 3 }}>
            <InlineError
              message={calendarWeather.error ?? 'Failed to load weather data.'}
              onRetry={fetchCalendarWeather}
            />
          </Box>
        ) : (
          <Grid container spacing={4} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <CalendarMonthGrid
                month={viewMonth}
                weatherData={weatherMap}
                startDate={startDate}
                endDate={endDate}
                hoveredDate={hoveredDate}
                onDayClick={handleDayClick}
                onDayHover={setHoveredDate}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CalendarMonthGrid
                month={rightMonth}
                weatherData={weatherMap}
                startDate={startDate}
                endDate={endDate}
                hoveredDate={hoveredDate}
                onDayClick={handleDayClick}
                onDayHover={setHoveredDate}
              />
            </Grid>
          </Grid>
        )}

        {/* Date Range Summary + Confirm */}
        {startDate && endDate && (
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 3 }}>
            <Typography variant="body1">
              {startDate.format('MMM D, YYYY')} &rarr; {endDate.format('MMM D, YYYY')} ({nights} night{nights !== 1 ? 's' : ''})
            </Typography>
            <Button variant="contained" onClick={handleConfirm}>
              Confirm Dates
            </Button>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
