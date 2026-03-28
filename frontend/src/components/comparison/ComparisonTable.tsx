'use client';

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
import { WEATHER_LABEL_COLORS } from '@/types/constants';
import dayjs from 'dayjs';

interface ComparisonTableProps {
  options: TripOption[];
  bestIndex: number;
}

import { TAG_COLORS, TAG_LABELS } from '@/types/constants';

export function ComparisonTable({ options, bestIndex }: ComparisonTableProps) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
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
                {opt.destination}
                <br />
                <Typography variant="caption">
                  {dayjs(opt.start_date).format('MMM D')} &ndash; {dayjs(opt.end_date).format('MMM D')}
                </Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Flight (per person)</TableCell>
            {options.map((opt, i) => (
              <TableCell key={i} align="center">${opt.flight_price.toFixed(2)}</TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell>Hotel</TableCell>
            {options.map((opt, i) => (
              <TableCell key={i} align="center">{opt.hotel_name}</TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell>Hotel Cost</TableCell>
            {options.map((opt, i) => (
              <TableCell key={i} align="center">${opt.hotel_price.toFixed(2)}</TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell>Weather</TableCell>
            {options.map((opt, i) => (
              <TableCell key={i} align="center">
                <Chip
                  label={`${opt.weather.label} (${opt.weather.weather_score.toFixed(0)})`}
                  size="small"
                  sx={{
                    backgroundColor: WEATHER_LABEL_COLORS[opt.weather.label],
                    color: '#fff',
                    fontWeight: 500,
                  }}
                />
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Total Cost</TableCell>
            {options.map((opt, i) => (
              <TableCell key={i} align="center" sx={{ fontWeight: 600 }}>
                ${opt.total_trip_cost.toFixed(2)}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell>Cost per Person</TableCell>
            {options.map((opt, i) => (
              <TableCell key={i} align="center">${opt.cost_per_person.toFixed(2)}</TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Overall Score</TableCell>
            {options.map((opt, i) => (
              <TableCell
                key={i}
                align="center"
                sx={{
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: opt.overall_score >= 80 ? 'success.main' : opt.overall_score >= 60 ? 'info.main' : opt.overall_score >= 40 ? 'warning.main' : 'error.main',
                }}
              >
                {opt.overall_score.toFixed(1)}
              </TableCell>
            ))}
          </TableRow>
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
