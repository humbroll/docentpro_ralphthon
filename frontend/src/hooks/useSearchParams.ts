'use client';

import { useState, useCallback } from 'react';
import type { DestinationResult } from '@/types/api';
import type { SelectedDestination, SearchParams } from '@/types/frontend';

export function useSearchParams() {
  const [destination, setDestinationState] = useState<SelectedDestination | null>(null);
  const [originAirport, setOriginAirport] = useState('');
  const [travelerCount, setTravelerCount] = useState(1);

  const setDestination = useCallback((dest: DestinationResult | null) => {
    if (dest) {
      setDestinationState({
        name: dest.name,
        latitude: dest.latitude,
        longitude: dest.longitude,
        country: dest.country,
        iata_code: dest.iata_code,
      });
    } else {
      setDestinationState(null);
    }
  }, []);

  const params: SearchParams = {
    destination,
    originAirport,
    travelerCount,
  };

  return {
    params,
    destination,
    originAirport,
    travelerCount,
    setDestination,
    setOriginAirport,
    setTravelerCount,
  };
}
