'use client';

import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import type { TripOption } from '@/types/api';
import dayjs from 'dayjs';

interface BestOptionBannerProps {
  option: TripOption;
}

export function BestOptionBanner({ option }: BestOptionBannerProps) {
  return (
    <Alert icon={<EmojiEventsIcon />} severity="success" sx={{ mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={600}>
        Best Overall: {option.destination},{' '}
        {dayjs(option.start_date).format('MMM D')}
        &ndash;
        {dayjs(option.end_date).format('MMM D, YYYY')}
        {' '}&mdash; Score: {option.overall_score.toFixed(1)}
      </Typography>
    </Alert>
  );
}
