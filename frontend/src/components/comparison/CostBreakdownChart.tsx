'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import type { TripOption } from '@/types/api';
import { CURRENCY_SYMBOL } from '@/types/constants';

interface CostBreakdownChartProps {
  options: TripOption[];
}

export function CostBreakdownChart({ options }: CostBreakdownChartProps) {
  const maxCost = Math.max(...options.map((o) => o.total_trip_cost), 1);

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        Cost Breakdown
      </Typography>
      <Stack spacing={1.5}>
        {options.map((opt, i) => {
          const flightPct = (opt.flight_price / maxCost) * 100;
          const hotelPct = (opt.hotel_price / maxCost) * 100;
          return (
            <Box key={i}>
              <Typography variant="caption" color="text.secondary">
                Option {i + 1}: {opt.destination}
              </Typography>
              <Box sx={{ display: 'flex', height: 24, borderRadius: 1, overflow: 'hidden' }}>
                <Box
                  sx={{
                    width: `${flightPct}%`,
                    backgroundColor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: flightPct > 10 ? undefined : 0,
                  }}
                >
                  {flightPct > 15 && (
                    <Typography variant="caption" color="white" fontSize={10}>
                      {CURRENCY_SYMBOL}{opt.flight_price.toFixed(0)}
                    </Typography>
                  )}
                </Box>
                <Box
                  sx={{
                    width: `${hotelPct}%`,
                    backgroundColor: 'secondary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: hotelPct > 10 ? undefined : 0,
                  }}
                >
                  {hotelPct > 15 && (
                    <Typography variant="caption" color="white" fontSize={10}>
                      {CURRENCY_SYMBOL}{opt.hotel_price.toFixed(0)}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Stack>
      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 12, height: 12, borderRadius: '2px', backgroundColor: 'primary.main' }} />
          <Typography variant="caption">Flights</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 12, height: 12, borderRadius: '2px', backgroundColor: 'secondary.main' }} />
          <Typography variant="caption">Hotels</Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
