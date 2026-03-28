// frontend/src/lib/api.ts
// Centralized API service layer — all backend calls go through this file.

'use client';

import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_BASE_URL } from '@/types/constants';
import type {
  DestinationResult,
  FlightPriceRequest,
  FlightPrice,
  HotelSearchRequest,
  HotelOption,
  WeatherRequest,
  WeatherSummary,
  CalendarRequest,
  CalendarResponse,
  CompareRequest,
  CompareResponse,
} from '@/types/api';

// ── Error Display Type ───────────────────────────────────

export interface ApiErrorDisplay {
  message: string;
  statusCode: number;
}

// ── Axios Instance ───────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ── Error Extraction ─────────────────────────────────────

export function extractApiError(err: unknown): ApiErrorDisplay {
  if (err instanceof AxiosError) {
    if (err.response) {
      const data = err.response.data as { error?: string; message?: string } | undefined;
      return {
        message: data?.message || `Request failed (${err.response.status})`,
        statusCode: err.response.status,
      };
    }
    if (err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED') {
      return { message: 'Request timed out. Please try again.', statusCode: 0 };
    }
    return { message: 'Network error. Please check your connection and try again.', statusCode: 0 };
  }
  return { message: 'An unexpected error occurred. Please try again.', statusCode: 0 };
}

// ── API Methods ──────────────────────────────────────────

export async function healthCheck(): Promise<{ status: string }> {
  const response = await apiClient.get<{ status: string }>('/health');
  return response.data;
}

export async function searchDestinations(query: string): Promise<DestinationResult[]> {
  const response = await apiClient.get<DestinationResult[]>(
    '/api/v1/search/destinations',
    { params: { q: query } },
  );
  return response.data;
}

export async function getFlightPrice(request: FlightPriceRequest): Promise<FlightPrice> {
  const response = await apiClient.post<FlightPrice>('/api/v1/flights/price', request);
  return response.data;
}

export async function searchHotels(request: HotelSearchRequest): Promise<HotelOption[]> {
  const response = await apiClient.post<HotelOption[]>('/api/v1/hotels/search', request);
  return response.data;
}

export async function getWeather(request: WeatherRequest): Promise<WeatherSummary> {
  const response = await apiClient.post<WeatherSummary>('/api/v1/weather', request);
  return response.data;
}

export async function getCalendarWeather(request: CalendarRequest): Promise<CalendarResponse> {
  const response = await apiClient.post<CalendarResponse>('/api/v1/calendar', request);
  return response.data;
}

export async function compareTrips(request: CompareRequest): Promise<CompareResponse> {
  const response = await apiClient.post<CompareResponse>('/api/v1/compare', request);
  return response.data;
}
