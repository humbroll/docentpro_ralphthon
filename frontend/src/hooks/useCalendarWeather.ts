'use client';

import { useState, useCallback } from 'react';
import { getCalendarWeather, extractApiError } from '@/lib/api';
import type { CalendarWeatherState, SelectedDestination } from '@/types/frontend';

export function useCalendarWeather() {
  const [calendarWeather, setCalendarWeather] = useState<CalendarWeatherState>({
    state: 'idle',
    data: null,
    error: null,
  });

  const fetchWeather = useCallback(async (
    destination: SelectedDestination,
    startDate: string,
    endDate: string,
  ) => {
    setCalendarWeather({ state: 'loading', data: null, error: null });
    try {
      const response = await getCalendarWeather({
        destination: destination.name,
        latitude: destination.latitude,
        longitude: destination.longitude,
        start_date: startDate,
        end_date: endDate,
      });
      setCalendarWeather({ state: 'success', data: response.days, error: null });
    } catch (err) {
      const apiErr = extractApiError(err);
      setCalendarWeather({ state: 'error', data: null, error: apiErr.message });
    }
  }, []);

  const resetWeather = useCallback(() => {
    setCalendarWeather({ state: 'idle', data: null, error: null });
  }, []);

  return { calendarWeather, fetchWeather, resetWeather };
}
