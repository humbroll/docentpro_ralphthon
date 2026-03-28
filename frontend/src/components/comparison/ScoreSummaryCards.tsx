'use client';

import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import type { TripOption } from '@/types/api';
import { TAG_COLORS, TAG_LABELS } from '@/types/constants';
import dayjs from 'dayjs';

interface ScoreSummaryCardsProps {
  options: TripOption[];
}

export function ScoreSummaryCards({ options }: ScoreSummaryCardsProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
      {options.map((opt, i) =>
        opt.tags.map((tag) => (
          <Chip
            key={`${i}-${tag}`}
            label={`${TAG_LABELS[tag] ?? tag}: ${opt.destination} ${dayjs(opt.start_date).format('MMM D')}-${dayjs(opt.end_date).format('D')}`}
            color={TAG_COLORS[tag] ?? 'default'}
          />
        ))
      )}
    </Stack>
  );
}
