'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { WEATHER_LABEL_COLORS } from '@/types/constants';

export function WeatherLegend() {
  return (
    <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2, mb: 2 }}>
      {Object.entries(WEATHER_LABEL_COLORS).map(([label, color]) => (
        <Stack key={label} direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 12, height: 12, borderRadius: '2px', backgroundColor: color }} />
          <Typography variant="caption">{label}</Typography>
        </Stack>
      ))}
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Box sx={{ width: 12, height: 12, borderRadius: '2px', border: 1, borderColor: 'divider' }} />
        <Typography variant="caption">No data</Typography>
      </Stack>
    </Stack>
  );
}
