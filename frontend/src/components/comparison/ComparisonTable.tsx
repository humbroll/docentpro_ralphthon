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
import { ComparisonColumnHeader } from './ComparisonColumn';
import { TagChip } from './TagChip';
import { ScoreBar } from './ScoreBar';
import type { TripOption } from '@/types/api';
import { WEATHER_LABEL_COLORS } from '@/types/constants';
import dayjs from 'dayjs';

interface ComparisonTableProps {
  options: TripOption[];
  bestIndex: number;
}

export function ComparisonTable({ options, bestIndex }: ComparisonTableProps) {
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
              <ComparisonColumnHeader
                key={i}
                option={opt}
                index={i}
                isBest={i === bestIndex}
              />
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

          {/* Total cost */}
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

          {/* Overall score with ScoreBar */}
          <TableRow sx={{ backgroundColor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 600 }}>Overall Score</TableCell>
            {options.map((opt, i) => (
              <TableCell key={i} align="center">
                <ScoreBar score={opt.overall_score} />
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
                    <TagChip key={tag} tag={tag} />
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
