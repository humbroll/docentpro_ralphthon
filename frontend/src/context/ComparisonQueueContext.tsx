'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import type {
  ComparisonQueueItem,
  ComparisonQueueContextValue,
  ComparisonResultState,
} from '@/types/frontend';
import type { CompareResponse, CompareOptionInput, WeatherSummaryInput } from '@/types/api';
import { MAX_QUEUE_SIZE, MIN_COMPARE_SIZE } from '@/types/constants';
import { compareTrips as apiCompareTrips } from '@/lib/api';

// ── Helper Functions (not exported) ─────────────────────────

function queueItemToCompareInput(item: ComparisonQueueItem): CompareOptionInput {
  return {
    destination: item.destination,
    start_date: item.startDate,
    end_date: item.endDate,
    flight_price: item.flightPrice,
    hotel_name: item.hotelName,
    hotel_price: item.hotelPrice,
    weather: {
      average_temp: item.weather.average_temp,
      rain_signal: item.weather.rain_signal,
      weather_score: item.weather.weather_score,
      label: item.weather.label,
    } satisfies WeatherSummaryInput,
    traveler_count: item.travelerCount,
  };
}

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message as string;
    }
    if (error.response?.data?.error) {
      return error.response.data.error as string;
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }
    if (!error.response) {
      return 'Network error. Please check your connection and try again.';
    }
  }
  return 'Failed to compare trip options. Please try again.';
}

// ── Context ─────────────────────────────────────────────────

const ComparisonQueueContext = createContext<ComparisonQueueContextValue | null>(null);

// ── Hook ────────────────────────────────────────────────────

export function useComparisonQueue(): ComparisonQueueContextValue {
  const ctx = useContext(ComparisonQueueContext);
  if (ctx === null) {
    throw new Error('useComparisonQueue must be used within a ComparisonQueueProvider');
  }
  return ctx;
}

// ── Provider ────────────────────────────────────────────────

export function ComparisonQueueProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<ComparisonQueueItem[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResultState>({
    state: 'idle',
    data: null,
    error: null,
  });

  const resetComparison = useCallback(() => {
    setComparisonResult({ state: 'idle', data: null, error: null });
  }, []);

  const addItem = useCallback(
    (item: ComparisonQueueItem): boolean => {
      if (queue.length >= MAX_QUEUE_SIZE) {
        return false;
      }
      if (queue.some((existing) => existing.id === item.id)) {
        return false;
      }
      setQueue((prev) => [...prev, item]);
      if (comparisonResult.state !== 'idle') {
        resetComparison();
      }
      return true;
    },
    [queue, comparisonResult.state, resetComparison]
  );

  const removeItem = useCallback(
    (id: string): void => {
      setQueue((prev) => prev.filter((item) => item.id !== id));
      if (comparisonResult.state !== 'idle') {
        resetComparison();
      }
    },
    [comparisonResult.state, resetComparison]
  );

  const clearQueue = useCallback((): void => {
    setQueue([]);
    if (comparisonResult.state !== 'idle') {
      resetComparison();
    }
  }, [comparisonResult.state, resetComparison]);

  const doCompareTrips = useCallback(async (): Promise<void> => {
    if (queue.length < MIN_COMPARE_SIZE) {
      setComparisonResult({
        state: 'error',
        data: null,
        error: 'At least 2 options are required for comparison',
      });
      return;
    }

    setComparisonResult({ state: 'loading', data: null, error: null });

    try {
      const options: CompareOptionInput[] = queue.map(queueItemToCompareInput);
      const response: CompareResponse = await apiCompareTrips({ options });
      setComparisonResult({ state: 'success', data: response, error: null });
    } catch (error: unknown) {
      const message = extractErrorMessage(error);
      setComparisonResult({ state: 'error', data: null, error: message });
    }
  }, [queue]);

  const value = useMemo<ComparisonQueueContextValue>(
    () => ({
      queue,
      addItem,
      removeItem,
      clearQueue,
      isFull: queue.length >= MAX_QUEUE_SIZE,
      count: queue.length,
      comparisonResult,
      compareTrips: doCompareTrips,
      resetComparison,
    }),
    [queue, comparisonResult, addItem, removeItem, clearQueue, doCompareTrips, resetComparison]
  );

  return (
    <ComparisonQueueContext.Provider value={value}>
      {children}
    </ComparisonQueueContext.Provider>
  );
}
