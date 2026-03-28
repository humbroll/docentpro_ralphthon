'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useComparisonQueue } from '@/context/ComparisonQueueContext';
import type { ComparisonQueueItem } from '@/types/frontend';

export function useAddToQueue() {
  const { addItem, isFull, queue } = useComparisonQueue();
  const [justAdded, setJustAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const addToQueue = useCallback((item: ComparisonQueueItem): boolean => {
    const added = addItem(item);
    if (added) {
      setJustAdded(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setJustAdded(false), 1500);
    }
    return added;
  }, [addItem]);

  const isDuplicate = useCallback((id: string): boolean => {
    return queue.some((item) => item.id === id);
  }, [queue]);

  return { addToQueue, isDuplicate, isFull, justAdded };
}
