'use client';

import { useMemo } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { TripOption } from '@/types/api';
import { WEATHER_LABEL_COLORS, TAG_COLORS, TAG_LABELS } from '@/types/constants';
import dayjs from 'dayjs';

interface ComparisonTableProps {
  options: TripOption[];
  bestIndex: number;
}

export function ComparisonTable({ options, bestIndex }: ComparisonTableProps) {
  // Pre-compute min/max for highlighting
  const highlights = useMemo(() => {
    if (options.length === 0) return { minFlight: 0, minHotel: 0, minTotal: 0, maxScore: 0, maxWeather: 0 };
    return {
      minFlight: Math.min(...options.map((o) => o.flight_price)),
      minHotel: Math.min(...options.map((o) => o.hotel_price)),
      minTotal: Math.min(...options.map((o) => o.total_trip_cost)),
      maxScore: Math.max(...options.map((o) => o.overall_score)),
      maxWeather: Math.max(...options.map((o) => o.weather.weather_score)),
    };
  }, [options]);

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="medium" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Metric</TableCell>
            {options.map((opt, i) => (
              <TableCell
                key={i}
                align="center"
                sx={{
                  fontWeight: 600,
                  backgroundColor: i === bestIndex ? 'rgba(76, 175, 80, 0.1)' : undefined,
                }}
              >
                <Typography variant="subtitle2" fontWeight={600}>
                  Option {i + 1}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {opt.destination}, {dayjs(opt.start_date).format('MMM D')}
                </Typography>
                {i === bestIndex && (
                  <Chip
                    label="Best Overall"
                    size="small"
                    color="warning"
                    sx={{ display: 'block', mt: 0.5, mx: 'auto', width: 'fit-content' }}
                  />
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Dates */}
          <TableRow>
            <TableCell>Dates</TableCell>
            {options.map((opt, i) => (
              <TableCell key={i} align="center">
                {dayjs(opt.start_date).format('MMM D')} &ndash; {dayjs(opt.end_date).format('MMM D')}
              </TableCell>
            ))}
          </TableRow>

          {/* Flight per person */}
          <TableRow>
            <TableCell>Flight (per person)</TableCell>
            {options.map((opt, i) => (
              <TableCell
                key={i}
                align="center"
                sx={opt.flight_price === highlights.minFlight ? { color: 'success.main', fontWeight: 600 } : undefined}
              >
                ${opt.flight_price.toFixed(2)}
              </TableCell>
            ))}
          </TableRow>

          {/* Hotel name */}
          <TableRow>
            <TableCell>Hotel</TableCell>
            {options.map((opt, i) => (
              <TableCell key={i} align="center">{opt.hotel_name}</TableCell>
            ))}
          </TableRow>

          {/* Hotel cost */}
          <TableRow>
            <TableCell>Hotel Cost</TableCell>
            {options.map((opt, i) => (
              <TableCell
                key={i}
                align="center"
                sx={opt.hotel_price === highlights.minHotel ? { color: 'success.main', fontWeight: 600 } : undefined}
              >
                ${opt.hotel_price.toFixed(2)}
              </TableCell>
            ))}
          </TableRow>

          {/* Weather */}
          <TableRow>
            <TableCell>Weather</TableCell>
            {options.map((opt, i) => (
              <TableCell key={i} align="center">
                <Chip
                  label={`${opt.weather.label} (${opt.weather.weather_score.toFixed(0)}/100)`}
                  size="small"
                  sx={{
                    backgroundColor: WEATHER_LABEL_COLORS[opt.weather.label],
                    color: '#fff',
                    fontWeight: opt.weather.weather_score === highlights.maxWeather ? 700 : 500,
                    border: opt.weather.weather_score === highlights.maxWeather ? '2px solid' : undefined,
                    borderColor: opt.weather.weather_score === highlights.maxWeather ? 'success.main' : undefined,
                  }}
                />
              </TableCell>
            ))}
          </TableRow>

          {/* Total cost — highlighted row */}
          <TableRow sx={{ backgroundColor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 600 }}>Total Cost</TableCell>
            {options.map((opt, i) => (
              <TableCell
                key={i}
                align="center"
                sx={{
                  fontWeight: 600,
                  color: opt.total_trip_cost === highlights.minTotal ? 'success.main' : undefined,
                }}
              >
                ${opt.total_trip_cost.toFixed(2)}
              </TableCell>
            ))}
          </TableRow>

          {/* Cost per person */}
          <TableRow>
            <TableCell>Cost per Person</TableCell>
            {options.map((opt, i) => (
              <TableCell key={i} align="center">${opt.cost_per_person.toFixed(2)}</TableCell>
            ))}
          </TableRow>

          {/* Overall score — highlighted row */}
          <TableRow sx={{ backgroundColor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 600 }}>Overall Score</TableCell>
            {options.map((opt, i) => (
              <TableCell
                key={i}
                align="center"
                sx={{
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: opt.overall_score === highlights.maxScore
                    ? 'success.main'
                    : opt.overall_score >= 60
                      ? 'info.main'
                      : opt.overall_score >= 40
                        ? 'warning.main'
                        : 'error.main',
                }}
              >
                {opt.overall_score.toFixed(1)}
              </TableCell>
            ))}
          </TableRow>

          {/* Tags */}
          <TableRow>
            <TableCell>Tags</TableCell>
            {options.map((opt, i) => (
              <TableCell key={i} align="center">
                <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
                  {opt.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={TAG_LABELS[tag] ?? tag}
                      size="small"
                      color={TAG_COLORS[tag] ?? 'default'}
                      variant="filled"
                    />
                  ))}
                </Stack>
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
