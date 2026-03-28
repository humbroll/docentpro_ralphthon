'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { searchDestinations } from '@/lib/api';
import type { DestinationResult } from '@/types/api';
import { MIN_SEARCH_QUERY_LENGTH, SEARCH_DEBOUNCE_MS } from '@/types/constants';

export function useDestinationSearch() {
  const [options, setOptions] = useState<DestinationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < MIN_SEARCH_QUERY_LENGTH) {
      setOptions([]);
      setFetchError(undefined);
      if (abortRef.current) abortRef.current.abort();
      setIsLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setFetchError(undefined);
      try {
        const results = await searchDestinations(query, controller.signal);
        if (!controller.signal.aborted) {
          setOptions(results);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setFetchError('Failed to search destinations. Please try again.');
        setOptions([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const clearOptions = useCallback(() => {
    setOptions([]);
    setFetchError(undefined);
  }, []);

  return { options, isLoading, fetchError, search, clearOptions };
}
