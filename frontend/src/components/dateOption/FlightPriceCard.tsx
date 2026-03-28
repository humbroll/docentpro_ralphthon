'use client';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import FlightIcon from '@mui/icons-material/Flight';
import { InlineError } from '../shared/InlineError';
import type { FlightPrice } from '@/types/api';
import type { LoadingState } from '@/types/frontend';

interface FlightPriceCardProps {
  state: LoadingState;
  flight: FlightPrice | null;
  error: string | null;
  onRetry: () => void;
  travelerCount: number;
}

export function FlightPriceCard({
  state,
  flight,
  error,
  onRetry,
  travelerCount,
}: FlightPriceCardProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardHeader
        avatar={<FlightIcon color="primary" />}
        title="Flights"
        titleTypographyProps={{ variant: 'h6' }}
      />
      <CardContent>
        {state === 'loading' && (
          <Stack spacing={1}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="50%" />
          </Stack>
        )}

        {state === 'error' && (
          <InlineError message={error ?? 'Failed to load flight prices.'} onRetry={onRetry} />
        )}

        {state === 'success' && flight && (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              {flight.origin} &rarr; {flight.destination}
            </Typography>
            <Typography variant="h4" fontWeight={700} color="primary.main">
              ${flight.price.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              per person, round-trip
            </Typography>
            {travelerCount > 1 && (
              <Typography variant="body2" fontWeight={500}>
                Group total: ${(flight.price * travelerCount).toFixed(2)} ({travelerCount} travelers)
              </Typography>
            )}
          </Stack>
        )}

        {state === 'idle' && (
          <Typography variant="body2" color="text.secondary">
            Select dates to see flight prices.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
