'use client';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { DestinationAutocomplete } from './DestinationAutocomplete';
import { OriginAirportInput } from './OriginAirportInput';
import { TravelerCountInput } from './TravelerCountInput';
import type { DestinationResult } from '@/types/api';
import type { SelectedDestination } from '@/types/frontend';

interface SearchSectionProps {
  selectedDestination: SelectedDestination | null;
  onDestinationChange: (destination: DestinationResult | null) => void;
  originAirport: string;
  onOriginAirportChange: (value: string) => void;
  travelerCount: number;
  onTravelerCountChange: (value: number) => void;
}

export function SearchSection({
  selectedDestination,
  onDestinationChange,
  originAirport,
  onOriginAirportChange,
  travelerCount,
  onTravelerCountChange,
}: SearchSectionProps) {
  return (
    <Box sx={{ mb: 6, pt: 4 }}>
      <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
        WhenToGo
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
        Find the best dates for your next trip
      </Typography>

      <Paper elevation={2} sx={{ p: 4 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <DestinationAutocomplete
              value={selectedDestination}
              onChange={onDestinationChange}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <OriginAirportInput
              value={originAirport}
              onChange={onOriginAirportChange}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <TravelerCountInput
              value={travelerCount}
              onChange={onTravelerCountChange}
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
