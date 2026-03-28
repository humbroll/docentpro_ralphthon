'use client';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import { InlineError } from '../shared/InlineError';
import type { WeatherSummary } from '@/types/api';
import type { LoadingState } from '@/types/frontend';
import { WEATHER_LABEL_COLORS, RAIN_SIGNAL_COLORS } from '@/types/constants';

interface WeatherSummaryCardProps {
  state: LoadingState;
  weather: WeatherSummary | null;
  error: string | null;
  onRetry: () => void;
}

export function WeatherSummaryCard({
  state,
  weather,
  error,
  onRetry,
}: WeatherSummaryCardProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardHeader
        avatar={<WbSunnyIcon color="primary" />}
        title="Weather"
        titleTypographyProps={{ variant: 'h6' }}
      />
      <CardContent>
        {state === 'loading' && (
          <Stack spacing={1}>
            <Skeleton variant="text" width="50%" />
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="40%" />
          </Stack>
        )}

        {state === 'error' && (
          <InlineError message={error ?? 'Failed to load weather data.'} onRetry={onRetry} />
        )}

        {state === 'success' && weather && (
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h4" fontWeight={700}>
                {weather.weather_score.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">/ 100</Typography>
            </Stack>

            <Chip
              label={weather.label}
              size="small"
              sx={{
                backgroundColor: WEATHER_LABEL_COLORS[weather.label],
                color: '#fff',
                fontWeight: 600,
                width: 'fit-content',
              }}
            />

            <Typography variant="body2">
              Avg. temperature: {Math.round(weather.average_temp)}°C
            </Typography>

            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="body2">Rain:</Typography>
              <Chip
                label={weather.rain_signal}
                size="small"
                sx={{
                  backgroundColor: RAIN_SIGNAL_COLORS[weather.rain_signal],
                  color: '#fff',
                  fontWeight: 500,
                }}
              />
            </Stack>
          </Stack>
        )}

        {state === 'idle' && (
          <Typography variant="body2" color="text.secondary">
            Select dates to see weather forecast.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
