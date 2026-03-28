'use client';

import { useState, useCallback } from 'react';
import { getFlightPrice, searchHotels, getWeather, extractApiError } from '@/lib/api';
import type { HotelOption } from '@/types/api';
import type { DateDetailResults, DateRange, SelectedDestination } from '@/types/frontend';

const INITIAL: DateDetailResults = {
  flight: { state: 'idle', data: null, error: null },
  hotels: { state: 'idle', data: null, error: null },
  weather: { state: 'idle', data: null, error: null },
};

export function useDateDetails() {
  const [results, setResults] = useState<DateDetailResults>(INITIAL);

  const fetchFlight = useCallback(async (
    destination: SelectedDestination,
    dateRange: DateRange,
    originAirport: string,
    travelerCount: number,
  ) => {
    if (!destination.iata_code) {
      setResults((prev) => ({
        ...prev,
        flight: { state: 'error', data: null, error: 'This destination has no airport code. Flight lookup unavailable.' },
      }));
      return;
    }
    if (originAirport.length !== 3) {
      setResults((prev) => ({
        ...prev,
        flight: { state: 'error', data: null, error: 'Enter a 3-letter origin airport code to see flight prices.' },
      }));
      return;
    }
    setResults((prev) => ({ ...prev, flight: { state: 'loading', data: null, error: null } }));
    try {
      const data = await getFlightPrice({
        origin: originAirport,
        destination: destination.iata_code,
        departure_date: dateRange.startDate,
        return_date: dateRange.endDate,
        traveler_count: travelerCount,
      });
      setResults((prev) => ({ ...prev, flight: { state: 'success', data, error: null } }));
    } catch (err) {
      const apiErr = extractApiError(err);
      setResults((prev) => ({ ...prev, flight: { state: 'error', data: null, error: apiErr.message } }));
    }
  }, []);

  const fetchHotels = useCallback(async (
    destination: SelectedDestination,
    dateRange: DateRange,
    travelerCount: number,
  ): Promise<HotelOption[]> => {
    setResults((prev) => ({ ...prev, hotels: { state: 'loading', data: null, error: null } }));
    try {
      const data = await searchHotels({
        destination: destination.name,
        latitude: destination.latitude,
        longitude: destination.longitude,
        checkin_date: dateRange.startDate,
        checkout_date: dateRange.endDate,
        traveler_count: travelerCount,
      });
      setResults((prev) => ({ ...prev, hotels: { state: 'success', data, error: null } }));
      return data;
    } catch (err) {
      const apiErr = extractApiError(err);
      setResults((prev) => ({ ...prev, hotels: { state: 'error', data: null, error: apiErr.message } }));
      return [];
    }
  }, []);

  const fetchWeather = useCallback(async (
    destination: SelectedDestination,
    dateRange: DateRange,
  ) => {
    setResults((prev) => ({ ...prev, weather: { state: 'loading', data: null, error: null } }));
    try {
      const data = await getWeather({
        latitude: destination.latitude,
        longitude: destination.longitude,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
      });
      setResults((prev) => ({ ...prev, weather: { state: 'success', data, error: null } }));
    } catch (err) {
      const apiErr = extractApiError(err);
      setResults((prev) => ({ ...prev, weather: { state: 'error', data: null, error: apiErr.message } }));
    }
  }, []);

  const resetResults = useCallback(() => {
    setResults(INITIAL);
  }, []);

  return { results, fetchFlight, fetchHotels, fetchWeather, resetResults };
}
