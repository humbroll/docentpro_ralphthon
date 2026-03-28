'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import type { TripOption } from '@/types/api';
import { ScoreBar } from './ScoreBar';

interface ScoreComparisonChartProps {
  options: TripOption[];
}

export function ScoreComparisonChart({ options }: ScoreComparisonChartProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        Score Comparison
      </Typography>
      <Stack spacing={1.5}>
        {options.map((opt, i) => (
          <Box key={i}>
            <Typography variant="caption" color="text.secondary">
              Option {i + 1}: {opt.destination}
            </Typography>
            <ScoreBar score={opt.overall_score} />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
