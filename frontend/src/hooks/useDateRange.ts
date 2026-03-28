'use client';

import { useState, useCallback } from 'react';
import type { DateRange } from '@/types/frontend';

export function useDateRange() {
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  const confirmDateRange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, []);

  const resetDateRange = useCallback(() => {
    setDateRange(null);
  }, []);

  return { dateRange, confirmDateRange, resetDateRange };
}
