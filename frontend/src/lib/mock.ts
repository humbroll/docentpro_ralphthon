// frontend/src/lib/mock.ts
// Mock data for development/visual testing when backend is unavailable.
// Use only for initial visual verification, then switch to real API calls.

import type {
  DestinationResult,
  FlightPrice,
  HotelOption,
  WeatherSummary,
  CalendarDay,
  CalendarResponse,
  CompareResponse,
} from '@/types/api';

export const MOCK_DESTINATIONS: DestinationResult[] = [
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503, country: 'Japan', iata_code: 'TYO' },
  { name: 'Paris', latitude: 48.8566, longitude: 2.3522, country: 'France', iata_code: 'CDG' },
  { name: 'New York', latitude: 40.7128, longitude: -74.006, country: 'United States', iata_code: 'JFK' },
];

export const MOCK_FLIGHT_PRICE: FlightPrice = {
  origin: 'ICN',
  destination: 'TYO',
  departure_date: '2026-05-01',
  return_date: '2026-05-05',
  price: 342.5,
  currency: 'USD',
};

export const MOCK_HOTELS: HotelOption[] = [
  { hotel_id: 'h1', hotel_name: 'Tokyo Inn', distance: 1.2, total_price: 320.0, rating: 4.2 },
  { hotel_id: 'h2', hotel_name: 'Sakura Hotel', distance: 2.5, total_price: 280.0, rating: 3.8 },
  { hotel_id: 'h3', hotel_name: 'Grand Tokyo', distance: 0.8, total_price: 450.0, rating: 4.6 },
  { hotel_id: 'h4', hotel_name: 'Budget Stay', distance: 3.1, total_price: 180.0, rating: 3.2 },
  { hotel_id: 'h5', hotel_name: 'Tokyo Palace', distance: 1.0, total_price: 520.0, rating: 4.8 },
];

export const MOCK_WEATHER: WeatherSummary = {
  average_temp: 21.3,
  rain_signal: 'low',
  weather_score: 82.4,
  label: 'Great',
  daily: [
    { date: '2025-05-01', temp_high: 23.5, temp_low: 15.2, rain_mm: 0, description: 'Clear sky' },
    { date: '2025-05-02', temp_high: 22.1, temp_low: 14.8, rain_mm: 1.2, description: 'Partly cloudy' },
    { date: '2025-05-03', temp_high: 20.8, temp_low: 16.1, rain_mm: 0, description: 'Clear sky' },
    { date: '2025-05-04', temp_high: 21.0, temp_low: 15.5, rain_mm: 2.5, description: 'Light rain' },
    { date: '2025-05-05', temp_high: 24.2, temp_low: 16.8, rain_mm: 0, description: 'Sunny' },
  ],
};

export const MOCK_CALENDAR_DAYS: CalendarDay[] = Array.from({ length: 61 }, (_, i) => {
  const date = new Date(2026, 4, 1 + i); // May 1 through June 30
  const dateStr = date.toISOString().split('T')[0];
  const labels = ['Great', 'Good', 'Fair', 'Poor'];
  return {
    date: dateStr,
    temp_high: 18 + Math.random() * 12,
    temp_low: 10 + Math.random() * 8,
    rain_mm: Math.random() > 0.7 ? Math.random() * 10 : 0,
    weather_label: labels[Math.floor(Math.random() * 4)],
  };
});

export const MOCK_CALENDAR_RESPONSE: CalendarResponse = {
  destination: 'Tokyo',
  days: MOCK_CALENDAR_DAYS,
};

export const MOCK_COMPARE_RESPONSE: CompareResponse = {
  options: [
    {
      destination: 'Tokyo',
      start_date: '2026-05-15',
      end_date: '2026-05-19',
      flight_price: 289.0,
      hotel_name: 'Tokyo Inn',
      hotel_price: 295.0,
      weather: {
        average_temp: 23.8,
        rain_signal: 'low',
        weather_score: 85.2,
        label: 'Great',
        daily: [],
      },
      traveler_count: 2,
      total_trip_cost: 873.0,
      cost_per_person: 436.5,
      overall_score: 90.5,
      tags: ['cheapest', 'best_overall'],
    },
    {
      destination: 'Tokyo',
      start_date: '2026-05-01',
      end_date: '2026-05-05',
      flight_price: 342.5,
      hotel_name: 'Tokyo Inn',
      hotel_price: 320.0,
      weather: {
        average_temp: 21.3,
        rain_signal: 'low',
        weather_score: 82.4,
        label: 'Great',
        daily: [],
      },
      traveler_count: 2,
      total_trip_cost: 1005.0,
      cost_per_person: 502.5,
      overall_score: 24.7,
      tags: ['best_weather'],
    },
  ],
  best_option_index: 0,
};
