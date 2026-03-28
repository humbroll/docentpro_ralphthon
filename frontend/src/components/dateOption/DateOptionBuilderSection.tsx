'use client';

import { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { FlightPriceCard } from './FlightPriceCard';
import { AddToQueueButton } from './AddToQueueButton';
import { HotelSelectionCard } from './HotelSelectionCard';
import { WeatherSummaryCard } from './WeatherSummaryCard';
import { useComparisonQueue } from '@/context/ComparisonQueueContext';
import type { HotelOption } from '@/types/api';
import type { DateDetailResults, DateRange, SelectedDestination, ComparisonQueueItem } from '@/types/frontend';
import dayjs from 'dayjs';

interface DateOptionBuilderSectionProps {
  destination: SelectedDestination;
  dateRange: DateRange;
  results: DateDetailResults;
  originAirport: string;
  travelerCount: number;
  selectedHotel: HotelOption | null;
  onSelectHotel: (hotel: HotelOption) => void;
  onRetryFlight: () => void;
  onRetryHotels: () => void;
  onRetryWeather: () => void;
}

export function DateOptionBuilderSection({
  destination,
  dateRange,
  results,
  originAirport,
  travelerCount,
  selectedHotel,
  onSelectHotel,
  onRetryFlight,
  onRetryHotels,
  onRetryWeather,
}: DateOptionBuilderSectionProps) {
  const { addItem, isFull, queue } = useComparisonQueue();
  const [justAdded, setJustAdded] = useState(false);
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    };
  }, []);

  const allLoaded =
    results.flight.state === 'success' &&
    results.flight.data &&
    results.weather.state === 'success' &&
    results.weather.data &&
    selectedHotel;

  const canAdd = allLoaded && originAirport.length === 3;

  const queueItemId = `${destination.name}-${dateRange.startDate}-${dateRange.endDate}`;
  const isDuplicate = queue.some((item) => item.id === queueItemId);

  const handleAddToQueue = () => {
    if (!canAdd || !results.flight.data || !results.weather.data || !selectedHotel) return;

    const item: ComparisonQueueItem = {
      id: queueItemId,
      destination: destination.name,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      originAirport,
      flightPrice: results.flight.data.price,
      hotelName: selectedHotel.hotel_name,
      hotelPrice: selectedHotel.total_price,
      weather: results.weather.data,
      travelerCount,
    };

    const added = addItem(item);
    if (added) {
      setJustAdded(true);
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
      addedTimerRef.current = setTimeout(() => setJustAdded(false), 1500);
    }
  };

  const getTooltip = (): string => {
    if (justAdded) return 'Added!';
    if (isFull) return 'Queue is full (max 5 items)';
    if (isDuplicate) return 'This date option is already in the queue';
    if (!allLoaded) return 'Wait for all data to load';
    if (originAirport.length !== 3) return 'Enter a 3-letter origin airport code';
    return '';
  };

  const formattedStart = dayjs(dateRange.startDate).format('MMM D');
  const formattedEnd = dayjs(dateRange.endDate).format('MMM D, YYYY');

  return (
    <Box sx={{ mb: 6 }}>
      <Typography variant="h5" component="h2" fontWeight={600} gutterBottom>
        Trip Details
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review flight, hotel, and weather options for {destination.name},{' '}
        {formattedStart} &ndash; {formattedEnd}.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <FlightPriceCard
            state={results.flight.state}
            flight={results.flight.data}
            error={results.flight.error}
            onRetry={onRetryFlight}
            travelerCount={travelerCount}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <HotelSelectionCard
            state={results.hotels.state}
            hotels={results.hotels.data}
            error={results.hotels.error}
            onRetry={onRetryHotels}
            selectedHotel={selectedHotel}
            onSelectHotel={onSelectHotel}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <WeatherSummaryCard
            state={results.weather.state}
            weather={results.weather.data}
            error={results.weather.error}
            onRetry={onRetryWeather}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, textAlign: 'right' }}>
        <AddToQueueButton
          onClick={handleAddToQueue}
          disabled={!canAdd || isFull || isDuplicate || justAdded}
          justAdded={justAdded}
          isFull={isFull}
          isDuplicate={isDuplicate}
          allLoaded={!!allLoaded}
          originValid={originAirport.length === 3}
          tooltip={getTooltip()}
        />
      </Box>
    </Box>
  );
}
