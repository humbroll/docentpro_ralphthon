'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import { FlightPriceCard } from './FlightPriceCard';
import { HotelSelectionCard } from './HotelSelectionCard';
import { WeatherSummaryCard } from './WeatherSummaryCard';
import { useComparisonQueue } from '@/context/ComparisonQueueContext';
import type { HotelOption } from '@/types/api';
import type { DateDetailResults, DateRange, SelectedDestination, ComparisonQueueItem } from '@/types/frontend';

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

  const canAdd =
    results.flight.state === 'success' &&
    results.flight.data &&
    results.weather.state === 'success' &&
    results.weather.data &&
    selectedHotel &&
    originAirport.length === 3;

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

    addItem(item);
  };

  const getTooltip = (): string => {
    if (isFull) return 'Queue is full (max 5 items)';
    if (isDuplicate) return 'This date option is already in the queue';
    if (!canAdd) return 'Complete all fields to add to queue';
    return '';
  };

  return (
    <Box sx={{ mb: 6 }}>
      <Typography variant="h5" component="h2" fontWeight={600} gutterBottom>
        Trip Details
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review flight, hotel, and weather options for {destination.name},{' '}
        {dateRange.startDate} to {dateRange.endDate}.
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
        <Tooltip title={getTooltip()} arrow>
          <span>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={handleAddToQueue}
              disabled={!canAdd || isFull || isDuplicate}
            >
              Add to Queue {isFull ? '(Full)' : isDuplicate ? '(Added)' : ''}
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}
