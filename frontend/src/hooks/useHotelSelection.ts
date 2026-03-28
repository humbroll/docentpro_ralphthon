'use client';

import { useState, useCallback } from 'react';
import type { HotelOption } from '@/types/api';

export function useHotelSelection() {
  const [selectedHotel, setSelectedHotel] = useState<HotelOption | null>(null);

  const selectHotel = useCallback((hotel: HotelOption) => {
    setSelectedHotel(hotel);
  }, []);

  const resetHotel = useCallback(() => {
    setSelectedHotel(null);
  }, []);

  return { selectedHotel, selectHotel, resetHotel };
}
