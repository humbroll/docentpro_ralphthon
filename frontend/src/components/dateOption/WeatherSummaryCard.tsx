'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { InlineError } from '../shared/InlineError';
import type { WeatherSummary } from '@/types/api';
import type { LoadingState } from '@/types/frontend';
import { WEATHER_LABEL_COLORS, RAIN_SIGNAL_COLORS } from '@/types/constants';
import dayjs from 'dayjs';

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
  const [expanded, setExpanded] = useState(false);

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
            <Stack direction="row" alignItems="baseline" spacing={0.5}>
              <Typography variant="h4" fontWeight={700}>
                {weather.weather_score.toFixed(0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">/100</Typography>
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

            {/* Daily Breakdown */}
            {weather.daily && weather.daily.length > 0 && (
              <Accordion
                expanded={expanded}
                onChange={(_, isExpanded) => setExpanded(isExpanded)}
                disableGutters
                elevation={0}
                sx={{ '&::before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, minHeight: 'auto' }}>
                  <Typography variant="body2" color="text.secondary">
                    Daily breakdown ({weather.daily.length} days)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pt: 0 }}>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>Date</TableCell>
                          <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }} align="right">High</TableCell>
                          <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }} align="right">Low</TableCell>
                          <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }} align="right">Rain</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {weather.daily.map((day) => (
                          <TableRow key={day.date}>
                            <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>
                              {dayjs(day.date).format('MMM D')}
                            </TableCell>
                            <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }} align="right">
                              {Math.round(day.temp_high)}°
                            </TableCell>
                            <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }} align="right">
                              {Math.round(day.temp_low)}°
                            </TableCell>
                            <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }} align="right">
                              {day.rain_mm.toFixed(1)}mm
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}
          </Stack>
        )}

        {state === 'success' && !weather && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CloudOffOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              No weather data available
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Historical data may not be available for this location.
            </Typography>
          </Box>
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
